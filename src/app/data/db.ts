export type {
  Photo,
  Photographer,
  Collection,
  AdminUser,
  ModerationItem,
  License,
} from "../data/photos";
import { supabase } from "../../lib/supabase";
import { withRetry } from "../../lib/retry";
import {
  Photo,
  Photographer,
  Collection,
  AdminUser,
  ModerationItem,
  License,
  Orientation,
  photos as localPhotos,
} from "../data/photos";

// ============================================================
// TYPES for DB-backed tables
// ============================================================

export interface Purchase {
  id: string;
  userId: string;
  photoId: string;
  license: string;
  price: number;
  date: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export interface LicenseRecord {
  id: string;
  userId: string;
  photoId: string;
  title: string;
  licenseType: string;
  price: number;
  purchasedAt: string;
  expiresAt: string;
  downloads: number;
}

export interface Payout {
  id: string;
  photographerId: string;
  userId: string;
  date: string;
  method: string;
  amount: number;
  status: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  desc: string;
  createdAt: string;
}

export interface SiteSettingsRow {
  id: number;
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  platformFee: number;
  defaultCommission: number;
  minPrice: number;
  maxFileSize: number;
  maintenanceMode: boolean;
  signupEnabled: boolean;
  moderationRequired: boolean;
  contactLink?: string;
  allowedLicenses?: string[];
}

// ============================================================
// PHOTOGRAPHERS
// ============================================================

export async function fetchPhotographers(): Promise<Photographer[]> {
  return withRetry(
    async () => {
      const { data, error } = await supabase.from("photographers").select("*").order("name");

      if (error || !data || data.length === 0) return [];

      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        location: p.location || "",
        specialty: p.specialty || "",
        followers: p.followers || "0",
        images: 0,
        avatar: p.avatar || "",
        bio: p.bio || "",
        cover: p.cover || p.avatar || "",
        verified: p.verified || false,
        gear: p.gear || [],
        customFollowers: p.custom_followers || undefined,
      }));
    },
    { maxRetries: 2, baseDelay: 800 },
  );
}

export async function fetchPhotographer(id: string): Promise<Photographer | undefined> {
  const { data: photographer } = await supabase
    .from("photographers")
    .select("*")
    .eq("id", id)
    .single();

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", id);

  const photoCount = count || 0;

  if (photographer) {
    return {
      id: photographer.id,
      name: photographer.name,
      location: photographer.location || "",
      specialty: photographer.specialty || "",
      followers: photographer.followers || "0",
      images: photoCount || 0,
      avatar: photographer.avatar || "",
      bio: photographer.bio || "",
      cover: photographer.cover || photographer.avatar || "",
      verified: photographer.verified || false,
      gear: photographer.gear || [],
      customFollowers: photographer.custom_followers || undefined,
    };
  }

  const { data: shots } = await supabase
    .from("photos")
    .select("*")
    .eq("photographer_id", id)
    .limit(1);

  if (!shots || shots.length === 0) return undefined;

  const first = shots[0];
  const { count: likeCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", id);

  return {
    id,
    name: first.photographer_name || first.photographer_id,
    location: first.location || "",
    specialty: first.category || "",
    followers: `${((likeCount || 0) / 1000).toFixed(1)}k`,
    images: photoCount,
    avatar: first.image || "",
    cover: first.image || "",
    verified: true,
    gear: [first.camera, first.lens],
    bio: `${first.category} photographer based in ${first.location}, contributing to the NS CAPTURES archive.`,
  };
}

// ============================================================
// PHOTOS
// ============================================================

function rowToPhoto(row: any): Photo {
  return {
    id: row.id,
    title: row.title,
    photographerId: row.photographer_id || "",
    photographer: row.photographer_name || row.photographer_id || "",
    license: (row.license || "COMMERCIAL") as License,
    category: row.category || "Portrait",
    location: row.location || "",
    color: row.color || "#555555",
    orientation: row.orientation || "portrait",
    ratio: row.ratio || "aspect-[4/5]",
    price: row.price || 0,
    downloads: row.downloads || 0,
    views: row.views || 0,
    likes: row.likes || 0,
    camera: row.camera || "",
    lens: row.lens || "",
    iso: row.iso || 100,
    keywords: row.keywords || [],
    image: row.image || "",
    createdAt: row.created_at || undefined,
    aperture: row.aperture || undefined,
    shutterSpeed: row.shutter_speed || undefined,
    focalLength: row.focal_length || undefined,
    customViews: row.custom_views || undefined,
    customLikes: row.custom_likes || undefined,
    customDownloads: row.custom_downloads || undefined,
  };
}

export async function fetchPhotos(): Promise<Photo[]> {
  return withRetry(
    async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("status", "published")
        .order("uploaded_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return localPhotos;
      }

      return data.map((r) => rowToPhoto(r));
    },
    { maxRetries: 2, baseDelay: 800 },
  );
}

export interface PhotoFilters {
  query: string;
  category: string;
  licenses: License[];
  orientation: Orientation | null;
  maxPrice: number;
  sort: "popular" | "new" | "priceLow";
  collectionId?: string;
}

export async function fetchPhotosPaginated(
  filters: PhotoFilters,
  page: number,
  pageSize: number = 20,
): Promise<{ photos: Photo[]; hasMore: boolean }> {
  return withRetry(
    async () => {
      let q = supabase
        .from("photos")
        .select(filters.collectionId ? "*, collection_photos!inner(collection_id)" : "*", {
          count: "exact",
        })
        .eq("status", "published");

      if (filters.collectionId) {
        q = q.eq("collection_photos.collection_id", filters.collectionId);
      }

      if (filters.category && filters.category !== "All") {
        q = q.eq("category", filters.category);
      }
      if (filters.licenses.length > 0) {
        q = q.in("license", filters.licenses);
      }
      if (filters.orientation) {
        q = q.eq("orientation", filters.orientation);
      }
      if (filters.maxPrice < 10000) {
        q = q.lte("price", filters.maxPrice);
      }

      if (filters.query) {
        // Escape special characters for safe ilike search
        const safeQuery = filters.query.replace(/[%_\\]/g, "\\$&");
        q = q.or(
          `title.ilike.%${safeQuery}%,photographer_name.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%,keywords.cs.{${safeQuery}}`,
        );
      }

      if (filters.sort === "priceLow") {
        q = q.order("price", { ascending: true });
      } else if (filters.sort === "new") {
        q = q.order("uploaded_at", { ascending: false });
      } else {
        q = q.order("downloads", { ascending: false });
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;

      if (error || !data) {
        console.error("fetchPhotosPaginated error:", error);
        return { photos: [], hasMore: false };
      }

      const hasMore = count !== null && from + data.length < count;
      return { photos: data.map(rowToPhoto), hasMore };
    },
    { maxRetries: 2, baseDelay: 800 },
  );
}

export async function fetchPhoto(id: string): Promise<Photo | undefined> {
  const { data } = await supabase.from("photos").select("*").eq("id", id).single();

  if (data) return rowToPhoto(data);
  return localPhotos.find((p) => p.id === id);
}

export async function fetchPhotosByIds(ids: string[]): Promise<Photo[]> {
  if (!ids || ids.length === 0) return [];
  const { data } = await supabase.from("photos").select("*").in("id", ids);

  const dbPhotos = data ? data.map(rowToPhoto) : [];

  const foundIds = new Set(dbPhotos.map((p) => p.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));
  const fallbackPhotos = localPhotos.filter((p) => missingIds.includes(p.id));

  return [...dbPhotos, ...fallbackPhotos];
}

export async function fetchPhotosByPhotographer(photographerId: string): Promise<Photo[]> {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("uploaded_at", { ascending: false });

  if (!data || data.length === 0) {
    return localPhotos.filter((p) => p.photographerId === photographerId);
  }
  return data.map((r) => rowToPhoto(r));
}

// ============================================================
// COLLECTIONS
// ============================================================

export async function fetchCollections(): Promise<Collection[]> {
  return withRetry(
    async () => {
      const { data, error } = await supabase.from("collections").select("*");

      if (error || !data || data.length === 0) return [];

      return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        curator: c.curator || "",
        count: c.count || 0,
        description: c.description || "",
        cover: c.cover || [],
      }));
    },
    { maxRetries: 2, baseDelay: 800 },
  );
}

// ============================================================
// ADMIN
// ============================================================

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, email, role, status, created_at, phone, dob, occupation, verification_status, payout_balance, avatar, bio, location, social_links, profile_references, slug",
    )
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  return data.map((p: any, i: number) => ({
    id: p.id,
    slug: p.slug || "",
    name: p.name || "Unknown",
    email: p.email || "Email not set",
    phone: p.phone,
    dob: p.dob,
    occupation: p.occupation,
    role: (p.role || "Buyer") as AdminUser["role"],
    status: (p.status || "Active") as AdminUser["status"],
    verificationStatus: p.verification_status || "unverified",
    payoutBalance: p.payout_balance ?? 0,
    avatar: p.avatar || "",
    bio: p.bio || "",
    location: p.location || "",
    socialLinks: p.social_links || {},
    references: p.profile_references || [],
    joined: p.created_at
      ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "Unknown",
  }));
}

export async function fetchModerationQueue(): Promise<ModerationItem[]> {
  const { data, error } = await supabase.from("moderation_queue").select("*");

  if (error || !data || data.length === 0) return [];

  return data.map((m: any) => ({
    id: m.id,
    photoId: m.photo_id,
    photographer: m.photographer,
    reason: m.reason,
    submitted: m.submitted,
  }));
}

// ============================================================
// STATS (for admin dashboard)
// ============================================================

export async function fetchPlatformStats() {
  const [usersCount, photosCount, photographerCount, purchasesSum] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("photos").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "Photographer"),
    supabase.from("purchases").select("price"),
  ]);

  const revenue = (purchasesSum.data || []).reduce(
    (sum: number, p: any) => sum + (p.price || 0),
    0,
  );

  return {
    totalUsers: usersCount.count || 0,
    photographers: photographerCount.count || 0,
    assets: photosCount.count || 0,
    revenue,
  };
}

// ============================================================
// PURCHASES
// ============================================================

export async function fetchPurchases(userId: string): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    photoId: r.photo_id,
    license: r.license,
    price: r.price || 0,
    date: r.date,
    status: r.status || "PENDING",
  }));
}

export async function createPurchase(purchase: Omit<Purchase, "id">): Promise<Purchase | null> {
  const id = `INV-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      id,
      user_id: purchase.userId,
      photo_id: purchase.photoId,
      license: purchase.license,
      price: purchase.price,
      date: purchase.date,
    })
    .select()
    .single();

  if (error) {
    console.error("createPurchase", error);
    return null;
  }
  return {
    id: data.id,
    userId: data.user_id,
    photoId: data.photo_id,
    license: data.license,
    price: data.price,
    date: data.date,
  };
}

export async function fetchAllPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    photoId: r.photo_id,
    license: r.license,
    price: r.price || 0,
    date: r.date,
    status: r.status || "PENDING",
  }));
}

// ============================================================
// LICENSES
// ============================================================

export async function fetchLicenses(userId: string): Promise<LicenseRecord[]> {
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    photoId: r.photo_id,
    title: r.title || "",
    licenseType: r.license_type,
    price: r.price,
    purchasedAt: r.purchased_at,
    expiresAt: r.expires_at || "Perpetual",
    downloads: r.downloads || 0,
  }));
}

export async function createLicense(lic: Omit<LicenseRecord, "id">): Promise<LicenseRecord | null> {
  const id = `LIC-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from("licenses")
    .insert({
      id,
      user_id: lic.userId,
      photo_id: lic.photoId,
      title: lic.title,
      license_type: lic.licenseType,
      price: lic.price,
      purchased_at: lic.purchasedAt,
      expires_at: lic.expiresAt,
      downloads: lic.downloads,
    })
    .select()
    .single();

  if (error) {
    console.error("createLicense", error);
    return null;
  }
  return {
    id: data.id,
    userId: data.user_id,
    photoId: data.photo_id,
    title: data.title,
    licenseType: data.license_type,
    price: data.price,
    purchasedAt: data.purchased_at,
    expiresAt: data.expires_at,
    downloads: data.downloads,
  };
}

// ============================================================
// PAYOUTS
// ============================================================

export async function fetchPayouts(photographerId: string): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    photographerId: r.photographer_id,
    userId: r.user_id,
    date: r.date,
    method: r.method,
    amount: r.amount,
    status: r.status,
  }));
}

export async function fetchAllPayouts(): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    photographerId: r.photographer_id,
    userId: r.user_id,
    date: r.date,
    method: r.method,
    amount: r.amount,
    status: r.status,
  }));
}

export async function createPayout(payout: Omit<Payout, "id">): Promise<Payout | null> {
  const id = `PAY-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("payouts")
    .insert({
      id,
      photographer_id: payout.photographerId,
      user_id: payout.userId,
      date: payout.date,
      method: payout.method,
      amount: payout.amount,
      status: payout.status,
    })
    .select()
    .single();

  if (error) {
    console.error("createPayout", error);
    return null;
  }
  return {
    id: data.id,
    photographerId: data.photographer_id,
    userId: data.user_id,
    date: data.date,
    method: data.method,
    amount: data.amount,
    status: data.status,
  };
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export async function fetchActivity(userId: string): Promise<ActivityLogItem[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    desc: r.desc || "",
    createdAt: r.created_at,
  }));
}

export async function logActivity(entry: Omit<ActivityLogItem, "id" | "createdAt">): Promise<void> {
  const { error } = await supabase
    .from("activity_log")
    .insert({ user_id: entry.userId, type: entry.type, title: entry.title, desc: entry.desc });

  if (error) console.error("logActivity", error);
}

// ============================================================
// COLLECTION PHOTOS (junction)
// ============================================================

export async function fetchCollectionPhotos(collectionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_photos")
    .select("photo_id")
    .eq("collection_id", collectionId)
    .order("position");

  if (error || !data) return [];
  return data.map((r: any) => r.photo_id);
}

export async function addPhotoToCollection(
  collectionId: string,
  photoId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("collection_photos")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = existing && existing.length > 0 ? (existing[0] as any).position + 1 : 0;

  const { error } = await supabase
    .from("collection_photos")
    .insert({ collection_id: collectionId, photo_id: photoId, position: nextPos });

  if (error) {
    console.error("addPhotoToCollection", error);
    return false;
  }

  Promise.resolve(supabase.rpc("increment_collection_count", { cid: collectionId })).catch(() => {
    supabase
      .from("collection_photos")
      .select("photo_id", { count: "exact", head: true })
      .eq("collection_id", collectionId)
      .then(({ count }) => {
        supabase
          .from("collections")
          .update({ count: count || 0 })
          .eq("id", collectionId);
      });
  });

  return true;
}

export async function removePhotoFromCollection(
  collectionId: string,
  photoId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("collection_photos")
    .delete()
    .eq("collection_id", collectionId)
    .eq("photo_id", photoId);

  if (error) {
    console.error("removePhotoFromCollection", error);
    return false;
  }

  const { count } = await supabase
    .from("collection_photos")
    .select("photo_id", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  await supabase
    .from("collections")
    .update({ count: count || 0 })
    .eq("id", collectionId);

  return true;
}

// ============================================================
// SITE SETTINGS
// ============================================================

export async function fetchSiteSettings(): Promise<SiteSettingsRow> {
  const defaults: SiteSettingsRow = {
    id: 1,
    siteName: "NS CAPTURES",
    siteUrl: "https://www.nscaptures.com",
    supportEmail: "support@nscaptures.com",
    platformFee: 20,
    defaultCommission: 70,
    minPrice: 1000,
    maxFileSize: 100,
    maintenanceMode: false,
    signupEnabled: true,
    moderationRequired: true,
    allowedLicenses: ["COMMERCIAL", "EDITORIAL", "ROYALTY FREE", "EXCLUSIVE"],
  };

  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  if (error || !data) return defaults;

  return {
    id: data.id,
    siteName: data.site_name || defaults.siteName,
    siteUrl: data.site_url || defaults.siteUrl,
    supportEmail: data.support_email || defaults.supportEmail,
    platformFee: data.platform_fee ?? defaults.platformFee,
    defaultCommission: data.default_commission ?? defaults.defaultCommission,
    minPrice: data.min_price ?? defaults.minPrice,
    maxFileSize: data.max_file_size ?? defaults.maxFileSize,
    maintenanceMode: data.maintenance_mode ?? defaults.maintenanceMode,
    signupEnabled: data.signup_enabled ?? defaults.signupEnabled,
    moderationRequired: data.moderation_required ?? defaults.moderationRequired,
    contactLink: data.contact_link,
    allowedLicenses: data.allowed_licenses || defaults.allowedLicenses,
  };
}

export async function updateSiteSettings(settings: SiteSettingsRow): Promise<boolean> {
  const { error } = await supabase.from("site_settings").upsert({
    id: 1,
    site_name: settings.siteName,
    site_url: settings.siteUrl,
    support_email: settings.supportEmail,
    platform_fee: settings.platformFee,
    default_commission: settings.defaultCommission,
    min_price: settings.minPrice,
    max_file_size: settings.maxFileSize,
    maintenance_mode: settings.maintenanceMode,
    signup_enabled: settings.signupEnabled,
    moderation_required: settings.moderationRequired,
    contact_link: settings.contactLink,
    allowed_licenses: settings.allowedLicenses,
  });

  if (error) {
    console.error("updateSiteSettings", error);
    return false;
  }
  return true;
}

// ============================================================
// PHOTO PRICE UPDATE (photographer can change anytime)
// ============================================================

export async function updatePhotoPrice(photoId: string, price: number): Promise<boolean> {
  const { error } = await supabase.from("photos").update({ price }).eq("id", photoId);

  if (error) {
    console.error("updatePhotoPrice", error);
    return false;
  }
  return true;
}

// ============================================================
// CREATE PHOTO (upload from dashboard)
// ============================================================

export async function createPhoto(
  photo: Omit<Photo, "downloads" | "views" | "likes">,
): Promise<Photo | null> {
  const { data, error } = await supabase
    .from("photos")
    .insert({
      id: photo.id,
      title: photo.title,
      photographer_id: photo.photographerId,
      photographer_name: photo.photographer,
      license: photo.license,
      category: photo.category,
      location: photo.location,
      color: photo.color,
      orientation: photo.orientation,
      ratio: photo.ratio,
      price: photo.price,
      downloads: 0,
      views: 0,
      likes: 0,
      camera: photo.camera,
      lens: photo.lens,
      iso: photo.iso,
      keywords: photo.keywords,
      image: photo.image,
      uploaded_at: new Date().toISOString(),
      aperture: photo.aperture,
      shutter_speed: photo.shutterSpeed,
      focal_length: photo.focalLength,
    })
    .select()
    .single();

  if (error) {
    console.error("createPhoto", error);
    return null;
  }
  return rowToPhoto(data);
}

// ============================================================
// PHOTOGRAPHER PROFILE (settings persistence)
// ============================================================

export interface PhotographerProfileSettings {
  userId: string;
  location: string;
  specialty: string;
  bio: string;
  bankName: string;
  bankAccountLast4: string;
}

export async function fetchPhotographerProfileSettings(
  userId: string,
): Promise<PhotographerProfileSettings | null> {
  const { data } = await supabase
    .from("photographer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    userId: data.user_id,
    location: data.location || "",
    specialty: data.specialty || "",
    bio: data.bio || "",
    bankName: data.bank_name || "",
    bankAccountLast4: data.bank_account_last4 || "",
  };
}

export async function upsertPhotographerProfileSettings(
  settings: PhotographerProfileSettings,
): Promise<boolean> {
  const { error } = await supabase.from("photographer_profiles").upsert({
    user_id: settings.userId,
    location: settings.location,
    specialty: settings.specialty,
    bio: settings.bio,
    bank_name: settings.bankName,
    bank_account_last4: settings.bankAccountLast4,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("upsertPhotographerProfileSettings", error);
    return false;
  }
  return true;
}

// ============================================================
// INCREMENT PHOTO DOWNLOADS
// ============================================================

export async function incrementPhotoDownloads(photoId: string): Promise<void> {
  const { data } = await supabase.from("photos").select("downloads").eq("id", photoId).single();
  if (data)
    await supabase
      .from("photos")
      .update({ downloads: (data.downloads || 0) + 1 })
      .eq("id", photoId);
}

// ============================================================
// INCREMENT PHOTO VIEWS
// ============================================================

export async function incrementPhotoViews(photoId: string): Promise<void> {
  const { data } = await supabase.from("photos").select("views").eq("id", photoId).single();
  if (data)
    await supabase
      .from("photos")
      .update({ views: (data.views || 0) + 1 })
      .eq("id", photoId);
}

// ============================================================
// SOCIAL: LIKES
// ============================================================

export async function hasUserLikedPhoto(userId: string, photoId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();
  return !!data;
}

export async function toggleLike(userId: string, photoId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("user_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    await supabase.from("user_likes").delete().eq("user_id", userId).eq("photo_id", photoId);
    const { data: photo } = await supabase
      .from("photos")
      .select("likes")
      .eq("id", photoId)
      .single();
    if (photo)
      await supabase
        .from("photos")
        .update({ likes: Math.max((photo.likes || 1) - 1, 0) })
        .eq("id", photoId);
    return false;
  } else {
    await supabase.from("user_likes").insert({ user_id: userId, photo_id: photoId });
    const { data: photo } = await supabase
      .from("photos")
      .select("likes")
      .eq("id", photoId)
      .single();
    if (photo)
      await supabase
        .from("photos")
        .update({ likes: (photo.likes || 0) + 1 })
        .eq("id", photoId);
    return true;
  }
}

// ============================================================
// SOCIAL: SAVES (bookmarks)
// ============================================================

export async function hasUserSavedPhoto(userId: string, photoId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_saves")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();
  return !!data;
}

export async function toggleSave(userId: string, photoId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("user_saves")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    await supabase.from("user_saves").delete().eq("user_id", userId).eq("photo_id", photoId);
    return false;
  } else {
    await supabase.from("user_saves").insert({ user_id: userId, photo_id: photoId });
    return true;
  }
}

export async function fetchUserSavedPhotoIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_saves").select("photo_id").eq("user_id", userId);
  return (data || []).map((r: any) => r.photo_id);
}

// ============================================================
// SOCIAL: FOLLOWS
// ============================================================

export async function hasUserFollowedPhotographer(
  userId: string,
  photographerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", photographerId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(userId: string, photographerId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", photographerId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", photographerId);
    return false;
  } else {
    await supabase
      .from("user_follows")
      .insert({ follower_id: userId, following_id: photographerId });
    return true;
  }
}

export async function fetchFollowerCount(photographerId: string): Promise<number> {
  const { count } = await supabase
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", photographerId);
  return count || 0;
}

// ============================================================
// CONTRIBUTOR INTEREST (no auth required)
// ============================================================

export async function createContributorInterest(email: string): Promise<boolean> {
  await logActivity({
    userId: `CONTRIBUTE-${email}`,
    type: "contribute",
    title: "Contributor application",
    desc: email,
  });
  return true;
}

export interface ContributorSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  preferredChannel: string;
  invitationCode: string;
  portfolioLink: string;
  gearDescription: string;
  socialHandle?: string;
  status: "new" | "reviewing" | "approved" | "rejected" | "blocked";
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export async function createContributorSubmission(input: {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  preferredChannel: string;
  invitationCode?: string;
  portfolioLink: string;
  gearDescription: string;
  socialHandle?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("contributor_submissions").insert({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    preferred_channel: input.preferredChannel,
    invitation_code: input.invitationCode || null,
    portfolio_link: input.portfolioLink,
    gear_description: input.gearDescription,
    social_handle: input.socialHandle || null,
  });

  if (error) {
    console.error("createContributorSubmission", error);
    return false;
  }

  return true;
}

export async function fetchContributorSubmissions(): Promise<ContributorSubmission[]> {
  const { data, error } = await supabase
    .from("contributor_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("fetchContributorSubmissions", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    fullName: row.full_name || "",
    email: row.email || "",
    phone: row.phone || "",
    country: row.country || "",
    preferredChannel: row.preferred_channel || "",
    invitationCode: row.invitation_code || "",
    portfolioLink: row.portfolio_link || "",
    gearDescription: row.gear_description || "",
    socialHandle: row.social_handle || "",
    status: row.status,
    adminNote: row.admin_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || "",
  }));
}

export async function updateContributorSubmissionStatus(
  id: string,
  status: ContributorSubmission["status"],
  adminNote = "",
): Promise<boolean> {
  const { error } = await supabase
    .from("contributor_submissions")
    .update({ status, admin_note: adminNote || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateContributorSubmissionStatus", error);
    return false;
  }

  return true;
}

// ============================================================
// ADMIN: ACTIVITY LOGS (system logs from activity_log)
// ============================================================

export interface AdminLogEntry {
  id: string;
  time: string;
  level: string;
  source: string;
  message: string;
}

export async function fetchAdminLogs(limit = 50): Promise<AdminLogEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    time: r.created_at ? new Date(r.created_at).toLocaleString() : "",
    level: r.type === "error" ? "ERROR" : r.type === "warning" ? "WARN" : "INFO",
    source:
      r.type === "purchase"
        ? "Payments"
        : r.type === "auth"
          ? "Auth"
          : r.type === "upload"
            ? "Upload"
            : r.type === "contribute"
              ? "Auth"
              : "System",
    message: r.desc || r.title || "",
  }));
}

// ============================================================
// ADMIN: MONTHLY GROWTH (user signups by month)
// ============================================================

export async function fetchMonthlyGrowth(): Promise<{ m: string; v: number }[]> {
  const { data } = await supabase.from("profiles").select("created_at");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  data.forEach((r: any) => {
    const d = new Date(r.created_at);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    months[key] = (months[key] || 0) + 1;
  });

  return Object.entries(months).map(([m, v]) => ({ m, v }));
}

// ============================================================
// ADMIN: MONTHLY REVENUE (purchases by month)
// ============================================================

export async function fetchMonthlyRevenue(): Promise<{ m: string; v: number }[]> {
  const { data } = await supabase.from("purchases").select("price, date");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  data.forEach((r: any) => {
    const d = new Date(r.date);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    months[key] = (months[key] || 0) + (r.price || 0);
  });

  return Object.entries(months).map(([m, v]) => ({ m, v }));
}

// ============================================================
// ADMIN: CATEGORY STATS (downloads by category)
// ============================================================

export async function fetchCategoryStats(): Promise<{ name: string; downloads: number }[]> {
  const { data } = await supabase.from("photos").select("category, downloads, custom_downloads");

  if (!data || data.length === 0) return [];

  const cats: Record<string, number> = {};
  data.forEach((r: any) => {
    cats[r.category] =
      (cats[r.category] || 0) + Math.max(r.downloads || 0, r.custom_downloads || 0);
  });

  return Object.entries(cats)
    .map(([name, downloads]) => ({ name, downloads }))
    .sort((a, b) => b.downloads - a.downloads);
}

// ============================================================
// ADMIN: USER GROWTH PER MONTH (for chart)
// ============================================================

export async function fetchUserGrowthPerMonth(): Promise<{ m: string; v: number }[]> {
  const { data } = await supabase.from("profiles").select("created_at");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const sorted = data.map((r: any) => new Date(r.created_at).getTime()).sort((a, b) => a - b);
  let cumulative = 0;
  const monthlyCounts: Record<string, number> = {};

  sorted.forEach((ts) => {
    const d = new Date(ts);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });

  const allMonths = Object.keys(monthlyCounts);
  allMonths.forEach((m) => {
    cumulative += monthlyCounts[m];
    months[m] = cumulative;
  });

  return Object.entries(months).map(([m, v]) => ({ m, v }));
}

// ============================================================
// DASHBOARD: PHOTOGRAPHER STATS
// ============================================================

export async function fetchPhotographerStats(photographerId: string): Promise<{
  totalRevenue: number;
  totalDownloads: number;
  totalViews: number;
  totalLikes: number;
  photoCount: number;
  avgPrice: number;
}> {
  const { data: photos } = await supabase
    .from("photos")
    .select("id, downloads, views, likes, price, custom_downloads, custom_views, custom_likes")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0)
    return {
      totalRevenue: 0,
      totalDownloads: 0,
      totalViews: 0,
      totalLikes: 0,
      photoCount: 0,
      avgPrice: 0,
    };

  const totalDownloads = photos.reduce(
    (s: number, p: any) => s + Math.max(p.downloads || 0, p.custom_downloads || 0),
    0,
  );
  const totalViews = photos.reduce(
    (s: number, p: any) => s + Math.max(p.views || 0, p.custom_views || 0),
    0,
  );
  const totalLikes = photos.reduce(
    (s: number, p: any) => s + Math.max(p.likes || 0, p.custom_likes || 0),
    0,
  );
  const avgPrice = photos.reduce((s: number, p: any) => s + (p.price || 0), 0) / photos.length;

  const { data: purchases } = await supabase.from("purchases").select("price, photo_id");

  const photoIds = new Set(photos.map((p: any) => p.id));

  // Real revenue from purchases
  let totalRevenue = (purchases || [])
    .filter((p: any) => photoIds.has(p.photo_id))
    .reduce((s: number, p: any) => s + (p.price || 0), 0);

  // Add bonus revenue for custom downloads that exceed actual downloads
  photos.forEach((p: any) => {
    const actualDownloads = p.downloads || 0;
    const customDownloads = p.custom_downloads || 0;
    if (customDownloads > actualDownloads) {
      totalRevenue += (customDownloads - actualDownloads) * (p.price || 0);
    }
  });

  return {
    totalRevenue,
    totalDownloads,
    totalViews,
    totalLikes,
    photoCount: photos.length,
    avgPrice: Math.round(avgPrice),
  };
}

export async function updatePhotoHypeOverrides(
  photoId: string,
  metrics: {
    customDownloads?: number;
    customViews?: number;
    customLikes?: number;
  },
): Promise<boolean> {
  const updates: Record<string, number> = {};
  if (metrics.customDownloads !== undefined) updates.custom_downloads = metrics.customDownloads;
  if (metrics.customViews !== undefined) updates.custom_views = metrics.customViews;
  if (metrics.customLikes !== undefined) updates.custom_likes = metrics.customLikes;

  if (Object.keys(updates).length === 0) return true;

  // If custom downloads increased, credit the photographer's balance
  if (metrics.customDownloads !== undefined) {
    const { data: photo } = await supabase
      .from("photos")
      .select("custom_downloads, price, photographer_id")
      .eq("id", photoId)
      .single();

    if (photo) {
      const oldCustom = photo.custom_downloads || 0;
      const newCustom = metrics.customDownloads;
      const extraDownloads = newCustom - oldCustom;

      if (extraDownloads > 0 && photo.price > 0) {
        // Look up platform fee and photographer profile
        const { data: settings } = await supabase
          .from("site_settings")
          .select("platform_fee")
          .eq("id", 1)
          .single();
        const commissionPct = 100 - (settings?.platform_fee ?? 20);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", photo.photographer_id)
          .single();

        if (profile) {
          const creditAmount = Math.round(extraDownloads * photo.price * (commissionPct / 100));
          await supabase.rpc("adjust_payout_balance", {
            p_user_id: profile.id,
            p_adjustment: creditAmount,
            p_reason: `Hype Engine: +${extraDownloads} custom downloads on photo ${photoId}`,
          });
        }
      }
    }
  }

  const { error } = await supabase.from("photos").update(updates).eq("id", photoId);
  if (error) {
    console.error("updatePhotoHypeOverrides error", error);
    return false;
  }
  return true;
}

export async function updatePhotographerCustomFollowers(
  photographerId: string,
  customFollowers: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("photographers")
    .update({ custom_followers: customFollowers || null })
    .eq("id", photographerId);
  if (error) {
    console.error("updatePhotographerCustomFollowers error", error);
    return false;
  }
  return true;
}

// ============================================================
// DASHBOARD: MONTHLY REVENUE FOR PHOTOGRAPHER
// ============================================================

export async function fetchPhotographerMonthlyRevenue(
  photographerId: string,
): Promise<{ m: string; v: number }[]> {
  const { data: photos } = await supabase
    .from("photos")
    .select("id")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  const photoIds = photos.map((p: any) => p.id);

  const { data: purchases } = await supabase
    .from("purchases")
    .select("price, date, photo_id")
    .in("photo_id", photoIds);

  if (!purchases || purchases.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  purchases.forEach((r: any) => {
    const d = new Date(r.date);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    months[key] = (months[key] || 0) + (r.price || 0);
  });

  return Object.entries(months).map(([m, v]) => ({ m, v }));
}

// ============================================================
// DASHBOARD: WEEKLY DOWNLOADS FOR PHOTOGRAPHER
// ============================================================

export async function fetchPhotographerWeeklyDownloads(
  photographerId: string,
): Promise<{ m: string; v: number }[]> {
  const { data: photos } = await supabase
    .from("photos")
    .select("id, downloads, custom_downloads")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  const total = photos.reduce(
    (s: number, p: any) => s + Math.max(p.downloads || 0, p.custom_downloads || 0),
    0,
  );
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weights = [0.16, 0.15, 0.14, 0.15, 0.16, 0.12, 0.12];
  return days.map((d, i) => ({ m: d, v: Math.round((total * weights[i]) / 7) }));
}

// ============================================================
// DASHBOARD: TOP CATEGORIES FOR PHOTOGRAPHER
// ============================================================

export async function fetchPhotographerTopCategories(
  photographerId: string,
): Promise<{ name: string; pct: string }[]> {
  const { data: photos } = await supabase
    .from("photos")
    .select("category, downloads, custom_downloads")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  const cats: Record<string, number> = {};
  photos.forEach((r: any) => {
    cats[r.category] =
      (cats[r.category] || 0) + Math.max(r.downloads || 0, r.custom_downloads || 0);
  });

  const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;

  return Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, pct: `${Math.round((count / total) * 100)}%` }));
}

// ============================================================
// ACCOUNT: USER PURCHASE STATS
// ============================================================

export async function fetchUserPurchaseStats(userId: string): Promise<{
  totalSpent: number;
  totalPurchases: number;
  totalLicenses: number;
  recentPurchases: Purchase[];
}> {
  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  const { data: licenses } = await supabase.from("licenses").select("id").eq("user_id", userId);

  const totalSpent = (purchases || []).reduce((s: number, p: any) => s + (p.price || 0), 0);

  return {
    totalSpent,
    totalPurchases: (purchases || []).length,
    totalLicenses: (licenses || []).length,
    recentPurchases: (purchases || []).slice(0, 5).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      photoId: r.photo_id,
      license: r.license,
      price: r.price,
      date: r.date,
    })),
  };
}

// ============================================================
// IMAGE OPTIMIZATION UTILITY
// ============================================================

export function getOptimizedImageUrl(url: string, width = 600): string {
  if (!url) return "";

  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("w", String(width));
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      urlObj.searchParams.set("q", "80");
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  if (url.includes("res.cloudinary.com")) {
    const idx = url.indexOf("/upload/");
    if (idx !== -1) {
      const prefix = url.slice(0, idx + 8);
      const rest = url.slice(idx + 8);
      return prefix + `w_${width},c_limit,f_auto/` + rest;
    }
  }

  return url;
}

export function getFullQualityImageUrl(url: string): string {
  if (!url) return "";

  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete("w");
      urlObj.searchParams.delete("h");
      urlObj.searchParams.delete("crop");
      urlObj.searchParams.delete("fit");
      urlObj.searchParams.set("q", "100");
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  if (url.includes("res.cloudinary.com")) {
    return url.replace(/\/w_\d+,c_limit,f_auto\//, "/");
  }

  return url;
}

// ============================================================
// PAYMENT METHODS — photographer accepted methods
// ============================================================

export interface CryptoWalletEntry {
  coin: string;
  network: string;
  address: string;
}

export interface PhotographerPaymentMethod {
  id: string;
  photographerId: string;
  method: "card" | "local_bank" | "crypto" | "paypal";
  enabled: boolean;
  details: Record<string, unknown>;
}

export async function fetchPaymentMethods(
  photographerId: string,
): Promise<PhotographerPaymentMethod[]> {
  const { data } = await supabase
    .from("photographer_payment_methods")
    .select("*")
    .eq("photographer_id", photographerId);

  if (!data || data.length === 0) {
    return [
      {
        id: `pm-${photographerId}-card`,
        photographerId,
        method: "card",
        enabled: true,
        details: {},
      },
    ];
  }

  return data.map((r) => ({
    id: r.id,
    photographerId: r.photographer_id,
    method: r.method,
    enabled: r.enabled,
    details: r.details || {},
  }));
}

export async function upsertPaymentMethod(
  photographerId: string,
  method: "card" | "local_bank" | "crypto" | "paypal",
  enabled: boolean,
  details: Record<string, unknown> = {},
): Promise<boolean> {
  const { error: upsertError } = await supabase
    .from("photographer_payment_methods")
    .upsert(
      { photographer_id: photographerId, method, enabled, details },
      { onConflict: "photographer_id,method" },
    );

  if (upsertError) {
    console.error("upsertPaymentMethod", upsertError);
    return false;
  }

  return true;
}

export async function fetchAllPaymentMethods(): Promise<PhotographerPaymentMethod[]> {
  const { data } = await supabase.from("photographer_payment_methods").select("*");

  if (!data) return [];

  return data.map((r) => ({
    id: r.id,
    photographerId: r.photographer_id,
    method: r.method,
    enabled: r.enabled,
    details: r.details || {},
  }));
}

// ============================================================
// PAYOUT REQUESTS
// ============================================================

export interface PayoutRequest {
  id: string;
  photographerId: string;
  amount: number;
  method: "card" | "local_bank" | "crypto" | "paypal";
  details: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  adminNote: string;
  requestedAt: string;
  processedAt: string | null;
}

export async function createPayoutRequest(
  photographerId: string,
  amount: number,
  method: "card" | "local_bank" | "crypto" | "paypal",
  details: Record<string, unknown> = {},
): Promise<PayoutRequest | null> {
  const { data, error } = await supabase
    .from("payout_requests")
    .insert({
      photographer_id: photographerId,
      amount,
      method,
      details,
    })
    .select()
    .single();

  if (error) {
    console.error("createPayoutRequest", error);
    return null;
  }

  return {
    id: data.id,
    photographerId: data.photographer_id,
    amount: data.amount,
    method: data.method,
    details: data.details || {},
    status: data.status,
    adminNote: data.admin_note || "",
    requestedAt: data.requested_at,
    processedAt: data.processed_at,
  };
}

export async function fetchPayoutRequests(photographerId?: string): Promise<PayoutRequest[]> {
  let query = supabase
    .from("payout_requests")
    .select("*")
    .order("requested_at", { ascending: false });
  if (photographerId) query = query.eq("photographer_id", photographerId);

  const { data } = await query;
  if (!data) return [];

  return data.map((r) => ({
    id: r.id,
    photographerId: r.photographer_id,
    amount: r.amount,
    method: r.method,
    details: r.details || {},
    status: r.status,
    adminNote: r.admin_note || "",
    requestedAt: r.requested_at,
    processedAt: r.processed_at,
  }));
}

export async function updatePayoutRequestStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  adminNote: string = "",
): Promise<boolean> {
  const { error } = await supabase
    .from("payout_requests")
    .update({ status, admin_note: adminNote, processed_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function fetchPhotographerEmailBySlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase.from("profiles").select("email, name").eq("slug", slug).single();
  if (!data) return null;
  return data.email || null;
}

export async function fetchPhotographerContactBySlug(
  slug: string,
): Promise<{ email: string | null; name: string | null }> {
  if (!slug) return { email: null, name: null };
  const { data } = await supabase.from("profiles").select("email, name").eq("slug", slug).single();
  if (!data) return { email: null, name: null };
  return { email: data.email || null, name: data.name || null };
}

// ============================================================
// PURCHASE WITH PAYMENT METHOD
// ============================================================

export async function createPurchaseWithMethod(
  userId: string,
  photoId: string,
  license: string,
  price: number,
  paymentMethod: string,
): Promise<boolean> {
  const id = `PUR-${Date.now().toString(36)}`;
  const { error } = await supabase.from("purchases").insert({
    id,
    user_id: userId,
    photo_id: photoId,
    license,
    price,
    payment_method: paymentMethod,
    status: "PENDING",
  });

  return !error;
}

// ============================================================
// APPROVE PURCHASE
// ============================================================

export async function approvePurchase(
  purchaseId: string,
  photoId: string,
  userId: string,
): Promise<boolean> {
  const { error: pErr } = await supabase
    .from("purchases")
    .update({ status: "APPROVED" })
    .eq("id", purchaseId);

  if (pErr) return false;

  // Find the corresponding license and update expires_at
  const { data: licenses } = await supabase
    .from("licenses")
    .select("id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .order("purchased_at", { ascending: false })
    .limit(1);

  if (licenses && licenses.length > 0) {
    await supabase.from("licenses").update({ expires_at: "Lifetime" }).eq("id", licenses[0].id);
  }

  return true;
}

export async function rejectPurchase(purchaseId: string): Promise<boolean> {
  const { error } = await supabase
    .from("purchases")
    .update({ status: "REJECTED" })
    .eq("id", purchaseId);
  return !error;
}

// ============================================================
// DELETE PHOTO (admin or photographer)
// ============================================================

export async function deletePhoto(photoId: string): Promise<boolean> {
  const { error } = await supabase.from("photos").delete().eq("id", photoId);

  if (error) {
    console.error("deletePhoto", error);
    return false;
  }
  return true;
}

// ============================================================
// UPDATE USER ROLE (admin only) — syncs slug/profile for Photographer
// ============================================================

export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

  if (error) {
    console.error("updateUserRole", error);
    return false;
  }

  if (newRole === "Photographer") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("slug, name")
      .eq("id", userId)
      .single();

    if (profile && !profile.slug) {
      const slug =
        profile.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-£/g, "") +
        "-" +
        userId.slice(0, 8);

      await supabase.from("profiles").update({ slug }).eq("id", userId);

      const { data: existing } = await supabase
        .from("photographers")
        .select("id")
        .eq("id", slug)
        .single();

      if (!existing) {
        await supabase.from("photographers").insert({
          id: slug,
          name: profile.name,
          location: "",
          specialty: "",
          followers: "0",
          avatar: "",
          bio: "",
          cover: "",
          verified: false,
          gear: [],
        });
      }
    }
  }

  return true;
}

// ============================================================
// RESOLVE MODERATION ITEM
// ============================================================

export async function resolveModeration(moderationId: string, approve: boolean): Promise<boolean> {
  if (approve) {
    const { error } = await supabase.from("moderation_queue").delete().eq("id", moderationId);
    if (error) {
      console.error("resolveModeration (delete)", error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from("moderation_queue")
      .update({ status: "rejected" })
      .eq("id", moderationId);
    if (error) {
      console.error("resolveModeration (reject)", error);
      return false;
    }
  }

  return true;
}

// ============================================================
// UPDATE USER STATUS (admin toggles Active/Pending/Suspended)
// ============================================================

export async function updateUserStatus(userId: string, status: string): Promise<boolean> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);

  if (error) {
    console.error("updateUserStatus", error);
    return false;
  }
  return true;
}

// ============================================================
// ADMIN CREATE USER (invokes the admin-create-user edge function)
// ============================================================

export interface AdminCreateUserInput {
  email: string;
  password?: string;
  name: string;
  role: "Buyer" | "Photographer" | "Enterprise" | "Admin";
  status?: "Active" | "Pending" | "Suspended" | "Blocked";
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  phone?: string;
  dob?: string;
  occupation?: string;
  location?: string;
  bio?: string;
}

export interface AdminCreateUserResult {
  ok: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    verificationStatus: string;
  };
  password: string;
  tempPasswordGenerated: boolean;
}

export async function adminCreateUser(input: AdminCreateUserInput): Promise<AdminCreateUserResult> {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: input,
  });

  if (error) {
    console.error("adminCreateUser", error);
    throw new Error(error.message || "Failed to create user");
  }
  if (!data?.ok) {
    throw new Error(data?.error || "Failed to create user");
  }
  return data as AdminCreateUserResult;
}

// ============================================================
// UPDATE USER VERIFICATION STATUS (manual admin override)
// ============================================================

export async function updateUserVerificationStatus(
  userId: string,
  verification_status: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ verification_status })
    .eq("id", userId);

  if (error) {
    console.error("updateUserVerificationStatus", error);
    return false;
  }
  return true;
}

export async function updateAdminBalance(
  userId: string,
  adjustment: number,
  reason?: string,
  adminId?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("adjust_payout_balance", {
    p_user_id: userId,
    p_adjustment: adjustment,
    p_reason: reason || null,
    p_admin_id: adminId || null,
  });

  if (error) {
    console.error("updateAdminBalance", error);
    return false;
  }
  return true;
}

export async function fetchBalanceAdjustments(
  userId: string,
): Promise<{ amount: number; balanceAfter: number; reason: string | null; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("balance_adjustments")
    .select("amount, balance_after, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((r: any) => ({
    amount: r.amount,
    balanceAfter: r.balance_after,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

// ============================================================
// FETCH FOLLOWERS (for a photographer profile)
// ============================================================

export interface FollowerInfo {
  followerId: string;
  followingId: string;
  name: string;
  avatar: string;
}

export async function fetchFollowers(photographerId: string): Promise<FollowerInfo[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .eq("following_id", photographerId)
    .limit(50);

  if (!data) return [];

  const followerIds = [...new Set(data.map((r: any) => r.follower_id))];
  if (followerIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, avatar")
    .in("id", followerIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return data.map((r: any) => ({
    followerId: r.follower_id,
    followingId: r.following_id,
    name: profileMap.get(r.follower_id)?.name || r.follower_id,
    avatar: profileMap.get(r.follower_id)?.avatar || "",
  }));
}

// ============================================================
// FETCH FOLLOWING (who a photographer follows)
// ============================================================

export async function fetchFollowing(photographerId: string): Promise<FollowerInfo[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .eq("follower_id", photographerId)
    .limit(50);

  if (!data) return [];

  const followingIds = [...new Set(data.map((r: any) => r.following_id))];
  if (followingIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, avatar")
    .in("id", followingIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return data.map((r: any) => ({
    followerId: r.follower_id,
    followingId: r.following_id,
    name: profileMap.get(r.following_id)?.name || r.following_id,
    avatar: profileMap.get(r.following_id)?.avatar || "",
  }));
}

// ============================================================
// VERIFICATION DOCUMENTS
// ============================================================

export interface VerificationDocument {
  id: string;
  userId: string;
  documentType: string;
  documentNumber: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export async function fetchVerificationDocuments(userId: string): Promise<VerificationDocument[]> {
  const { data } = await supabase
    .from("verification_documents")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    documentType: r.document_type,
    documentNumber: r.document_number || "",
    fileUrl: r.file_url,
    status: r.status,
    adminNote: r.admin_note || "",
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  }));
}

export async function uploadVerificationDocument(
  userId: string,
  documentType: string,
  documentNumber: string,
  file: File,
  kycDetails?: { phone?: string; dob?: string; occupation?: string; fullName?: string },
): Promise<VerificationDocument | null> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  let fileUrl: string;
  if (cloudName && uploadPreset) {
    const fd = new FormData();
    fd.append("upload_preset", uploadPreset);
    fd.append("file", file);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Document upload to Cloudinary failed");
    const json = await res.json();
    fileUrl = json.secure_url;
  } else {
    throw new Error(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const { data, error } = await supabase
    .from("verification_documents")
    .insert({
      user_id: userId,
      document_type: documentType,
      document_number: documentNumber,
      file_url: fileUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const profileUpdates: any = {};
  if (kycDetails?.phone) profileUpdates.phone = kycDetails.phone;
  if (kycDetails?.dob) profileUpdates.dob = kycDetails.dob;
  if (kycDetails?.occupation) profileUpdates.occupation = kycDetails.occupation;
  if (kycDetails?.fullName) profileUpdates.name = kycDetails.fullName;

  await supabase.from("profiles").update(profileUpdates).eq("id", userId);

  return {
    id: data.id,
    userId: data.user_id,
    documentType: data.document_type,
    documentNumber: data.document_number || "",
    fileUrl: data.file_url,
    status: data.status,
    adminNote: data.admin_note || "",
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
  };
}

export async function fetchMyVerificationDocument(
  userId: string,
): Promise<VerificationDocument | null> {
  const { data } = await supabase
    .from("verification_documents")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    documentType: data.document_type,
    documentNumber: data.document_number || "",
    fileUrl: data.file_url,
    status: data.status,
    adminNote: data.admin_note || "",
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
  };
}

export async function payVerificationFee(userId: string): Promise<boolean> {
  // Simulate payment processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Record the verification fee as a purchase
  const purchaseId = `VF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  await supabase.from("purchases").insert({
    id: purchaseId,
    user_id: userId,
    photo_id: null,
    price: 247,
    license: "Verification Fee",
    status: "APPROVED",
    payment_method: "card",
  });

  const { error } = await supabase
    .from("profiles")
    .update({ verification_status: "pending" })
    .eq("id", userId);

  if (error) {
    console.error("payVerificationFee error", error);
    throw new Error(error.message);
  }

  return true;
}

export async function fetchAllVerificationDocuments(): Promise<VerificationDocument[]> {
  const { data } = await supabase
    .from("verification_documents")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    documentType: r.document_type,
    documentNumber: r.document_number || "",
    fileUrl: r.file_url,
    status: r.status,
    adminNote: r.admin_note || "",
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  }));
}

export async function reviewVerificationDocument(
  documentId: string,
  status: "approved" | "rejected",
  adminNote: string,
  reviewedBy: string,
): Promise<boolean> {
  const { data: doc } = await supabase
    .from("verification_documents")
    .select("user_id")
    .eq("id", documentId)
    .single();

  if (!doc) return false;

  const { error } = await supabase
    .from("verification_documents")
    .update({
      status,
      admin_note: adminNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", documentId);

  if (error) return false;

  await supabase
    .from("profiles")
    .update({ verification_status: status === "approved" ? "verified" : "rejected" })
    .eq("id", doc.user_id);

  return true;
}

export interface AdminPaymentMethod {
  id: string;
  methodType: string;
  name: string;
  details: Record<string, any>;
  enabled: boolean;
  createdAt: string;
}

export async function fetchAdminPaymentMethods(): Promise<AdminPaymentMethod[]> {
  const { data } = await supabase.from("admin_payment_methods").select("*").order("created_at");

  if (!data) return [];
  return data.map((m: any) => ({
    id: m.id,
    methodType: m.method_type,
    name: m.name,
    details: typeof m.details === "string" ? JSON.parse(m.details || "{}") : m.details || {},
    enabled: m.enabled,
    createdAt: m.created_at,
  }));
}

export async function createAdminPaymentMethod(
  methodType: string,
  name: string,
  details: Record<string, any>,
): Promise<AdminPaymentMethod> {
  const { data, error } = await supabase
    .from("admin_payment_methods")
    .insert({ method_type: methodType, name, details })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create payment method");

  return {
    id: data.id,
    methodType: data.method_type,
    name: data.name,
    details:
      typeof data.details === "string" ? JSON.parse(data.details || "{}") : data.details || {},
    enabled: data.enabled,
    createdAt: data.created_at,
  };
}

export async function updateAdminPaymentMethod(
  id: string,
  updates: { enabled?: boolean; details?: Record<string, any>; name?: string },
): Promise<void> {
  const { error } = await supabase.from("admin_payment_methods").update(updates).eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteAdminPaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from("admin_payment_methods").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
