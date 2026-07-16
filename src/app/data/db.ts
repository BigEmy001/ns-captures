// Data access layer — wraps Supabase queries with fallback to local mock data.
// Every function returns the same shape the UI already expects.

import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  photos as mockPhotos,
  photographers as mockPhotographers,
  collections as mockCollections,
  briefs as mockBriefs,
  adminUsers as mockAdminUsers,
  moderationQueue as mockModerationQueue,
  userPurchases as mockUserPurchases,
  userCollections as mockUserCollections,
  mockLicenses as mockLicenses,
  mockActivity as mockActivity,
  Photo,
  Photographer,
  Collection,
  Brief,
  AdminUser,
  ModerationItem,
  License,
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
}

// ============================================================
// PHOTOGRAPHERS
// ============================================================

export async function fetchPhotographers(): Promise<Photographer[]> {
  if (!isSupabaseConfigured) return mockPhotographers;

  const { data, error } = await supabase!
    .from("photographers")
    .select("*")
    .order("name");

  if (error || !data || data.length === 0) return mockPhotographers;

  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    location: p.location || "",
    specialty: p.specialty || "",
    followers: p.followers || "0",
    images: 0, // computed separately
    avatar: p.avatar || "",
    bio: p.bio || "",
    cover: p.cover || p.avatar || "",
    verified: p.verified || false,
    gear: p.gear || [],
  }));
}

export async function fetchPhotographer(id: string): Promise<Photographer | undefined> {
  if (!isSupabaseConfigured) {
    // Replicate the original getPhotographer logic
    const known = mockPhotographers.find((p) => p.id === id);
    const shots = mockPhotos.filter((p) => p.photographerId === id);
    if (known) return { ...known, images: shots.length || known.images };
    if (shots.length === 0) return undefined;
    const first = shots[0];
    const totalLikes = shots.reduce((s, p) => s + p.likes, 0);
    return {
      id,
      name: first.photographer,
      location: first.location,
      specialty: first.category,
      followers: `${(totalLikes / 1000).toFixed(1)}k`,
      images: shots.length,
      avatar: first.image,
      cover: first.image,
      verified: true,
      gear: [first.camera, first.lens],
      bio: `${first.category} photographer based in ${first.location}, contributing to the NS CAPTURES archive.`,
    };
  }

  const { data: photographer } = await supabase!
    .from("photographers")
    .select("*")
    .eq("id", id)
    .single();

  // Count their photos
  const { count } = await supabase!
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
    };
  }

  // Auto-generate profile from photos (same logic as original)
  const { data: shots } = await supabase!
    .from("photos")
    .select("*")
    .eq("photographer_id", id)
    .limit(1);

  if (!shots || shots.length === 0) return undefined;

  const first = shots[0];
  const { count: likeCount } = await supabase!
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
  };
}

export async function fetchPhotos(): Promise<Photo[]> {
  if (!isSupabaseConfigured) return mockPhotos;

  const { data, error } = await supabase!
    .from("photos")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error || !data || data.length === 0) return mockPhotos;

  return data.map(rowToPhoto);
}

export async function fetchPhoto(id: string): Promise<Photo | undefined> {
  if (!isSupabaseConfigured) {
    return mockPhotos.find((p) => p.id === id);
  }

  const { data } = await supabase!
    .from("photos")
    .select("*")
    .eq("id", id)
    .single();

  return data ? rowToPhoto(data) : undefined;
}

export async function fetchPhotosByPhotographer(photographerId: string): Promise<Photo[]> {
  if (!isSupabaseConfigured) {
    return mockPhotos.filter((p) => p.photographerId === photographerId);
  }

  const { data } = await supabase!
    .from("photos")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("uploaded_at", { ascending: false });

  if (!data) return [];
  return data.map(rowToPhoto);
}

// ============================================================
// COLLECTIONS
// ============================================================

export async function fetchCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured) return mockCollections;

  const { data, error } = await supabase!
    .from("collections")
    .select("*");

  if (error || !data || data.length === 0) return mockCollections;

  return data.map((c: any) => ({
    id: c.id,
    title: c.title,
    curator: c.curator || "",
    count: c.count || 0,
    description: c.description || "",
    cover: c.cover || [],
  }));
}

// ============================================================
// BRIEFS
// ============================================================

export async function fetchBriefs(): Promise<Brief[]> {
  if (!isSupabaseConfigured) return mockBriefs;

  const { data, error } = await supabase!
    .from("briefs")
    .select("*");

  if (error || !data || data.length === 0) return mockBriefs;

  return data.map((b: any) => ({
    id: b.id,
    title: b.title,
    location: b.location || "",
    license: b.license || "COMMERCIAL",
    budget: b.budget || 0,
    delivery: b.delivery || "",
    status: b.status || "MATCHING",
    description: b.description || "",
  }));
}

// ============================================================
// ADMIN
// ============================================================

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return mockAdminUsers;

  const { data, error } = await supabase!
    .from("profiles")
    .select("id, name, role, created_at");

  if (error || !data || data.length === 0) return mockAdminUsers;

  // Also fetch auth emails via admin API (not available from client)
  // Fall back to mock for email data
  return mockAdminUsers;
}

export async function fetchModerationQueue(): Promise<ModerationItem[]> {
  if (!isSupabaseConfigured) return mockModerationQueue;

  const { data, error } = await supabase!
    .from("moderation_queue")
    .select("*");

  if (error || !data || data.length === 0) return mockModerationQueue;

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
  if (!isSupabaseConfigured) {
    return {
      totalUsers: 12410,
      photographers: 1204,
      assets: 84200,
      revenue: 142000,
    };
  }

  const [usersCount, photosCount, photographerCount, purchasesSum] = await Promise.all([
    supabase!.from("profiles").select("id", { count: "exact", head: true }),
    supabase!.from("photos").select("id", { count: "exact", head: true }),
    supabase!.from("profiles").select("id", { count: "exact", head: true }).eq("role", "Photographer"),
    supabase!.from("purchases").select("price"),
  ]);

  const revenue = (purchasesSum.data || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0);

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
  if (!isSupabaseConfigured) return mockUserPurchases;

  const { data, error } = await supabase!
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error || !data || data.length === 0) return mockUserPurchases;

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    photoId: r.photo_id,
    license: r.license,
    price: r.price,
    date: r.date,
  }));
}

export async function createPurchase(purchase: Omit<Purchase, "id">): Promise<Purchase | null> {
  if (!isSupabaseConfigured) return null;

  const id = `INV-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase!
    .from("purchases")
    .insert({ id, user_id: purchase.userId, photo_id: purchase.photoId, license: purchase.license, price: purchase.price, date: purchase.date })
    .select()
    .single();

  if (error) { console.error("createPurchase", error); return null; }
  return { id: data.id, userId: data.user_id, photoId: data.photo_id, license: data.license, price: data.price, date: data.date };
}

export async function fetchAllPurchases(): Promise<Purchase[]> {
  if (!isSupabaseConfigured) return mockUserPurchases;

  const { data, error } = await supabase!
    .from("purchases")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return mockUserPurchases;
  return data.map((r: any) => ({
    id: r.id, userId: r.user_id, photoId: r.photo_id, license: r.license, price: r.price, date: r.date,
  }));
}

// ============================================================
// LICENSES
// ============================================================

export async function fetchLicenses(userId: string): Promise<LicenseRecord[]> {
  if (!isSupabaseConfigured) return mockLicenses;

  const { data, error } = await supabase!
    .from("licenses")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false });

  if (error || !data || data.length === 0) return mockLicenses;

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
  if (!isSupabaseConfigured) return null;

  const id = `LIC-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase!
    .from("licenses")
    .insert({
      id, user_id: lic.userId, photo_id: lic.photoId, title: lic.title,
      license_type: lic.licenseType, price: lic.price,
      purchased_at: lic.purchasedAt, expires_at: lic.expiresAt, downloads: lic.downloads,
    })
    .select()
    .single();

  if (error) { console.error("createLicense", error); return null; }
  return { id: data.id, userId: data.user_id, photoId: data.photo_id, title: data.title, licenseType: data.license_type, price: data.price, purchasedAt: data.purchased_at, expiresAt: data.expires_at, downloads: data.downloads };
}

// ============================================================
// PAYOUTS
// ============================================================

export async function fetchPayouts(photographerId: string): Promise<Payout[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase!
    .from("payouts")
    .select("*")
    .eq("photographer_id", photographerId)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, photographerId: r.photographer_id, userId: r.user_id, date: r.date, method: r.method, amount: r.amount, status: r.status,
  }));
}

export async function fetchAllPayouts(): Promise<Payout[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase!
    .from("payouts")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, photographerId: r.photographer_id, userId: r.user_id, date: r.date, method: r.method, amount: r.amount, status: r.status,
  }));
}

export async function createPayout(payout: Omit<Payout, "id">): Promise<Payout | null> {
  if (!isSupabaseConfigured) return null;

  const id = `PAY-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase!
    .from("payouts")
    .insert({ id, photographer_id: payout.photographerId, user_id: payout.userId, date: payout.date, method: payout.method, amount: payout.amount, status: payout.status })
    .select()
    .single();

  if (error) { console.error("createPayout", error); return null; }
  return { id: data.id, photographerId: data.photographer_id, userId: data.user_id, date: data.date, method: data.method, amount: data.amount, status: data.status };
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export async function fetchActivity(userId: string): Promise<ActivityLogItem[]> {
  if (!isSupabaseConfigured) return mockActivity;

  const { data, error } = await supabase!
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) return mockActivity;

  return data.map((r: any) => ({
    id: r.id, userId: r.user_id, type: r.type, title: r.title, desc: r.desc || "", createdAt: r.created_at,
  }));
}

export async function logActivity(entry: Omit<ActivityLogItem, "id" | "createdAt">): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase!
    .from("activity_log")
    .insert({ user_id: entry.userId, type: entry.type, title: entry.title, desc: entry.desc });

  if (error) console.error("logActivity", error);
}

// ============================================================
// COLLECTION PHOTOS (junction)
// ============================================================

export async function fetchCollectionPhotos(collectionId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase!
    .from("collection_photos")
    .select("photo_id")
    .eq("collection_id", collectionId)
    .order("position");

  if (error || !data) return [];
  return data.map((r: any) => r.photo_id);
}

export async function addPhotoToCollection(collectionId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  // Get next position
  const { data: existing } = await supabase!
    .from("collection_photos")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = existing && existing.length > 0 ? (existing[0] as any).position + 1 : 0;

  const { error } = await supabase!
    .from("collection_photos")
    .insert({ collection_id: collectionId, photo_id: photoId, position: nextPos });

  if (error) { console.error("addPhotoToCollection", error); return false; }

  // Update collection count
  await supabase!.rpc("increment_collection_count", { cid: collectionId }).catch(() => {
    // Fallback: manually update count
    supabase!.from("collection_photos").select("photo_id", { count: "exact", head: true })
      .eq("collection_id", collectionId)
      .then(({ count }) => {
        supabase!.from("collections").update({ count: count || 0 }).eq("id", collectionId);
      });
  });

  return true;
}

export async function removePhotoFromCollection(collectionId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("collection_photos")
    .delete()
    .eq("collection_id", collectionId)
    .eq("photo_id", photoId);

  if (error) { console.error("removePhotoFromCollection", error); return false; }

  // Update collection count
  const { count } = await supabase!
    .from("collection_photos")
    .select("photo_id", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  await supabase!.from("collections").update({ count: count || 0 }).eq("id", collectionId);

  return true;
}

// ============================================================
// SITE SETTINGS
// ============================================================

export async function fetchSiteSettings(): Promise<SiteSettingsRow> {
  const defaults: SiteSettingsRow = {
    id: 1,
    siteName: "NS CAPTURES",
    siteUrl: "https://ns-captures.com",
    supportEmail: "support@ns-captures.com",
    platformFee: 20,
    defaultCommission: 70,
    minPrice: 1000,
    maxFileSize: 100,
    maintenanceMode: false,
    signupEnabled: true,
    moderationRequired: true,
  };

  if (!isSupabaseConfigured) return defaults;

  const { data, error } = await supabase!
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

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
  };
}

export async function updateSiteSettings(settings: SiteSettingsRow): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("site_settings")
    .upsert({
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
    });

  if (error) { console.error("updateSiteSettings", error); return false; }
  return true;
}

// ============================================================
// PHOTO PRICE UPDATE (photographer can change anytime)
// ============================================================

export async function updatePhotoPrice(photoId: string, price: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("photos")
    .update({ price })
    .eq("id", photoId);

  if (error) { console.error("updatePhotoPrice", error); return false; }
  return true;
}

// ============================================================
// INCREMENT PHOTO DOWNLOADS
// ============================================================

export async function incrementPhotoDownloads(photoId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase!
    .from("photos")
    .select("downloads")
    .eq("id", photoId)
    .single();

  if (data) {
    await supabase!
      .from("photos")
      .update({ downloads: (data.downloads || 0) + 1 })
      .eq("id", photoId);
  }
}
