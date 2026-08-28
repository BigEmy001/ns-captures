export type {
  Photo,
  Photographer,
  Collection,
  AdminUser,
  ModerationItem,
  License,
} from "../data/photos";
import { fillAgreement } from "../../lib/agreement";
import { supabase } from "../../lib/supabase";
import { statusForStage, stageIndex, type PayoutStage } from "./payout-stages";
import { isCreatorRole } from "./roles";
import {
  shouldShowInApp,
  type AppNotification,
  type NotificationCategory,
  type NotificationPreferences,
  type NotificationPriority,
} from "./notifications";
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
  /** Default charge applied when a payout is converted to another currency. */
  conversionFeePercent: number;
  contactLink?: string;
  allowedLicenses?: string[];
  /** Where to write about settling a charge. Falls back to supportEmail. */
  paymentDeskEmail?: string;
  /** WhatsApp link or number for the desk. Falls back to contactLink. */
  paymentDeskWhatsapp?: string;
  /** A line of guidance shown beside the desk. */
  paymentDeskNote?: string;
}

/**
 * Credits a contributor, preferring the itemised ledger and falling back to a
 * plain balance adjustment if the ledger functions are not installed yet.
 * Money must not depend on a migration having been run.
 */
async function creditContributor(args: {
  userId: string;
  type: EarningType;
  netAmount: number;
  grossAmount?: number;
  platformFee?: number;
  photoId?: string | null;
  reference?: string | null;
  description: string;
  adminId?: string | null;
}): Promise<boolean> {
  const { error } = await supabase.rpc("record_contributor_earning", {
    p_user_id: args.userId,
    p_type: args.type,
    p_net_amount: args.netAmount,
    p_gross_amount: args.grossAmount ?? args.netAmount,
    p_platform_fee: args.platformFee ?? 0,
    p_photo_id: args.photoId ?? null,
    p_reference: args.reference ?? null,
    p_description: args.description,
    p_status: "available",
    p_admin_id: args.adminId ?? null,
  });

  if (!error) return true;

  console.error("creditContributor (ledger), falling back to balance", error);

  const { error: fallbackError } = await supabase.rpc("adjust_payout_balance", {
    p_user_id: args.userId,
    p_adjustment: args.netAmount,
    p_reason: args.description,
    p_admin_id: args.adminId ?? null,
  });

  if (fallbackError) {
    console.error("creditContributor (balance)", fallbackError);
    return false;
  }
  return true;
}

export type EarningType =
  "licensing" | "acquisition" | "bonus" | "award" | "download" | "adjustment";
export type EarningStatus = "pending" | "available" | "paid" | "cancelled";

export interface ContributorEarning {
  id: string;
  type: EarningType;
  status: EarningStatus;
  photoId: string | null;
  photoTitle?: string;
  reference: string | null;
  description: string | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  createdAt: string;
  availableAt: string | null;
  paidAt: string | null;
}

export interface EarningsSummary {
  available: number;
  pending: number;
  lifetime: number;
  byType: Record<EarningType, number>;
}

// ============================================================
// PHOTOGRAPHERS
// ============================================================

/**
 * Recognition level and specialties for a set of contributor slugs. Kept apart
 * from the photographers table because they live on the profile, and absent
 * until the programme migrations run — in which case nothing is added.
 */
export async function fetchContributorPublicFields(
  slugs: string[],
): Promise<Record<string, { contributorLevel?: string; specialties?: string[] }>> {
  if (slugs.length === 0) return {};

  // A visitor with no account reaches this, so it reads the public view.
  const { data, error } = await supabase
    .from("public_profiles")
    .select("slug, contributor_level, specialties")
    .in("slug", slugs);

  if (error || !data) return {};

  const map: Record<string, { contributorLevel?: string; specialties?: string[] }> = {};
  for (const row of data as any[]) {
    if (!row.slug) continue;
    map[row.slug] = {
      contributorLevel: row.contributor_level || undefined,
      specialties: row.specialties || undefined,
    };
  }
  return map;
}

/**
 * Every photographer, with their published portfolio size, largest first.
 *
 * Counts come from the database rather than the browser — the alternative is
 * downloading every photo's photographer_id to work out thirty-odd numbers.
 *
 * Deliberately unfiltered. The creator dashboard looks itself up in this list
 * by slug, so dropping photographers with nothing published would stop a new
 * creator finding their own profile. Callers that are shop windows rather than
 * lookups do their own filtering — see Home.
 */
export async function fetchPhotographers(): Promise<Photographer[]> {
  return withRetry(
    async () => {
      const [{ data, error }, { data: counts }] = await Promise.all([
        supabase.from("photographers").select("*").order("name"),
        supabase.rpc("photographer_photo_counts"),
      ]);

      if (error || !data || data.length === 0) return [];

      const byId = new Map<string, number>(
        (counts || []).map((r: any) => [r.photographer_id, Number(r.photo_count) || 0]),
      );

      return data
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          location: p.location || "",
          specialty: p.specialty || "",
          images: byId.get(p.id) || 0,
          avatar: p.avatar || "",
          bio: p.bio || "",
          cover: p.cover || p.avatar || "",
          verified: p.verified || false,
          gear: p.gear || [],
        }))
        .sort((a, b) => b.images - a.images);
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
      images: photoCount || 0,
      avatar: photographer.avatar || "",
      bio: photographer.bio || "",
      cover: photographer.cover || photographer.avatar || "",
      verified: photographer.verified || false,
      gear: photographer.gear || [],
    };
  }

  const { data: shots } = await supabase
    .from("photos")
    .select("*")
    .eq("photographer_id", id)
    .limit(1);

  if (!shots || shots.length === 0) return undefined;

  const first = shots[0];

  return {
    id,
    name: first.photographer_name || first.photographer_id,
    location: first.location || "",
    specialty: first.category || "",
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
    status: row.status || "published",
    acquisitionState: row.acquisition_state ?? null,
    description: row.description || undefined,
    modelRelease: row.model_release ?? null,
    propertyRelease: row.property_release ?? null,
    copyrightDeclaredAt: row.copyright_declared_at ?? null,
    reviewNote: row.review_note ?? null,
    featured: row.featured === true,
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

/**
 * Every photograph regardless of review status. Public reads must keep using
 * fetchPhotos(), which is published-only; RLS backs that up.
 */
export async function fetchAllPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("fetchAllPhotos", error);
    return [];
  }
  return (data || []).map((r) => rowToPhoto(r));
}

/** Places a submitted photograph in front of the review team. */
export async function submitPhotoForReview(
  photoId: string,
  photographerName: string,
  reason = "New submission",
): Promise<boolean> {
  const { error } = await supabase.from("moderation_queue").upsert({
    id: `MOD-${photoId}`,
    photo_id: photoId,
    photographer: photographerName,
    reason,
    submitted: new Date().toISOString(),
    status: "pending",
  });

  if (error) {
    console.error("submitPhotoForReview", error);
    return false;
  }
  return true;
}

/** Whether new submissions must be reviewed before they reach the marketplace. */
export async function isModerationRequired(): Promise<boolean> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("moderation_required")
    .eq("id", 1)
    .maybeSingle();

  // Fail safe: if the setting can't be read, review rather than auto-publish.
  if (error || !data) return true;
  return data.moderation_required !== false;
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

/**
 * Curated collections, sized by what they actually contain.
 *
 * collections.count is a stored figure nothing maintains — every collection
 * overstated itself by three to seven times. The count comes from membership
 * now, and a collection holding nothing is left out rather than shown as an
 * empty set.
 */
export async function fetchCollections(): Promise<Collection[]> {
  return withRetry(
    async () => {
      const [{ data, error }, { data: counts }] = await Promise.all([
        supabase.from("collections").select("*"),
        supabase.rpc("collection_photo_counts"),
      ]);

      if (error || !data || data.length === 0) return [];

      const byId = new Map<string, number>(
        (counts || []).map((r: any) => [r.collection_id, Number(r.photo_count) || 0]),
      );

      return data
        .map((c: any) => ({
          id: c.id,
          title: c.title,
          curator: c.curator || "",
          count: byId.get(c.id) || 0,
          description: c.description || "",
          cover: c.cover || [],
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);
    },
    { maxRetries: 2, baseDelay: 800 },
  );
}

// ============================================================
// ADMIN
// ============================================================

const ADMIN_USER_COLUMNS =
  "id, name, email, role, status, created_at, phone, dob, occupation, verification_status, payout_balance, avatar, bio, location, social_links, profile_references, slug";

/** Contributor programme columns, absent until the programme migrations run. */
const ADMIN_USER_PROGRAMME_COLUMNS =
  ", contributor_id, contributor_level, country, city, specialties, payout_currency";

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const withProgramme = await supabase
    .from("profiles")
    .select(ADMIN_USER_COLUMNS + ADMIN_USER_PROGRAMME_COLUMNS)
    .order("created_at", { ascending: false });

  // The programme columns do not exist until those migrations run. Fall back
  // to the core columns rather than showing an empty user list.
  const result = withProgramme.error
    ? await supabase
        .from("profiles")
        .select(ADMIN_USER_COLUMNS)
        .order("created_at", { ascending: false })
    : withProgramme;

  const data = result.data as any[] | null;

  if (result.error || !data || data.length === 0) return [];

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
    contributorId: p.contributor_id || undefined,
    contributorLevel: p.contributor_level || "international",
    payoutCurrency: p.payout_currency || undefined,
    country: p.country || undefined,
    city: p.city || undefined,
    specialties: p.specialties || [],
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
  const { data, error } = await supabase
    .from("moderation_queue")
    .select("*")
    .eq("status", "pending")
    .order("submitted", { ascending: true });

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
      .in("role", ["Photographer", "Contributor"]),
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

  Promise.resolve(
    supabase.rpc("increment_collection_count", { collection_id: collectionId }),
  ).catch(() => {
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
    conversionFeePercent: 3.7,
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
    conversionFeePercent: data.conversion_fee_percent ?? defaults.conversionFeePercent,
    contactLink: data.contact_link,
    allowedLicenses: data.allowed_licenses || defaults.allowedLicenses,
    paymentDeskEmail: data.payment_desk_email || undefined,
    paymentDeskWhatsapp: data.payment_desk_whatsapp || undefined,
    paymentDeskNote: data.payment_desk_note || undefined,
  };
}

export async function updateSiteSettings(settings: SiteSettingsRow): Promise<boolean> {
  const core = {
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
    payment_desk_email: settings.paymentDeskEmail || null,
    payment_desk_whatsapp: settings.paymentDeskWhatsapp || null,
    payment_desk_note: settings.paymentDeskNote || null,
  };

  const { error } = await supabase.from("site_settings").upsert({
    ...core,
    conversion_fee_percent: settings.conversionFeePercent,
  });

  if (!error) return true;

  // The conversion charge column does not exist yet. Saving settings — the
  // maintenance toggle among them — must not depend on that migration.
  const { error: coreError } = await supabase.from("site_settings").upsert(core);

  if (coreError) {
    console.error("updateSiteSettings", coreError);
    return false;
  }

  console.warn("Settings saved without the conversion charge:", error.message);
  return true;
}

export type MaintenanceStatus = {
  maintenanceMode: boolean;
  siteName: string;
  supportEmail: string;
};

/**
 * Lightweight public read of the maintenance flag, used by the gate that wraps
 * every route. Fails open: if the settings row can't be reached the site stays
 * available rather than locking everyone out on a transient network error.
 */
export async function fetchMaintenanceStatus(): Promise<MaintenanceStatus> {
  const fallback: MaintenanceStatus = {
    maintenanceMode: false,
    siteName: "NS CAPTURES",
    supportEmail: "support@nscaptures.com",
  };

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("maintenance_mode, site_name, support_email")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      maintenanceMode: data.maintenance_mode === true,
      siteName: data.site_name || fallback.siteName,
      supportEmail: data.support_email || fallback.supportEmail,
    };
  } catch {
    return fallback;
  }
}

// ============================================================
// PHOTO PRICE UPDATE (photographer can change anytime)
// ============================================================

/**
 * Moves a photograph in or out of direct acquisition consideration. Passing
 * null returns it to the ordinary marketplace lifecycle.
 */
export async function setPhotoAcquisitionState(
  photoId: string,
  state: "review" | "acquired" | null,
): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .update({ acquisition_state: state })
    .eq("id", photoId);

  if (error) {
    console.error("setPhotoAcquisitionState", error);
    return false;
  }
  return true;
}

export async function updatePhotoPrice(photoId: string, price: number): Promise<boolean> {
  const { error } = await supabase.from("photos").update({ price }).eq("id", photoId);

  if (error) {
    console.error("updatePhotoPrice", error);
    return false;
  }
  return true;
}

// ============================================================
// PHOTO FIELD UPDATE (photographer can edit title, category, location, etc.)
// ============================================================

export async function updatePhotoField(
  photoId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase.from("photos").update(fields).eq("id", photoId);
  if (error) {
    console.error("updatePhotoField", error);
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
      status: photo.status || "published",
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

  // Submission metadata lives in a later migration; a photograph must still
  // upload without it.
  const metadata: Record<string, unknown> = {};
  if (photo.description) metadata.description = photo.description;
  if (photo.modelRelease) metadata.model_release = photo.modelRelease;
  if (photo.propertyRelease) metadata.property_release = photo.propertyRelease;
  if (photo.copyrightDeclaredAt) metadata.copyright_declared_at = photo.copyrightDeclaredAt;

  if (Object.keys(metadata).length > 0) {
    const { error: metaError } = await supabase.from("photos").update(metadata).eq("id", photo.id);
    if (metaError) console.warn("createPhoto metadata skipped:", metaError.message);
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
  // Goes through the database function: `photos` carries no UPDATE grant for
  // visitors, and doing the arithmetic in SQL stops two simultaneous downloads
  // from reading the same number and losing one.
  await supabase.rpc("increment_photo_download", { p_photo_id: photoId });
}

// ============================================================
// INCREMENT PHOTO VIEWS
// ============================================================

export async function incrementPhotoViews(photoId: string): Promise<void> {
  await supabase.rpc("increment_photo_view", { p_photo_id: photoId });
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
    await supabase.rpc("adjust_photo_likes", { p_photo_id: photoId, p_delta: -1 });
    return false;
  } else {
    await supabase.from("user_likes").insert({ user_id: userId, photo_id: photoId });
    await supabase.rpc("adjust_photo_likes", { p_photo_id: photoId, p_delta: 1 });
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
    cats[r.category] = (cats[r.category] || 0) + (r.custom_downloads || 0) + (r.downloads || 0);
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
    (s: number, p: any) => s + (p.custom_downloads || 0) + (p.downloads || 0),
    0,
  );
  const totalViews = photos.reduce(
    (s: number, p: any) => s + (p.custom_views || 0) + (p.views || 0),
    0,
  );
  const totalLikes = photos.reduce(
    (s: number, p: any) => s + (p.custom_likes || 0) + (p.likes || 0),
    0,
  );
  const avgPrice = photos.reduce((s: number, p: any) => s + (p.price || 0), 0) / photos.length;

  const { data: purchases } = await supabase.from("purchases").select("price, photo_id");

  const photoIds = new Set(photos.map((p: any) => p.id));

  // Real revenue from purchases
  const totalRevenue = (purchases || [])
    .filter((p: any) => photoIds.has(p.photo_id))
    .reduce((s: number, p: any) => s + (p.price || 0), 0);

  // Revenue is what was actually paid, and nothing else. The Hype Engine sets a
  // display baseline for downloads; it must never reach a figure a photographer
  // reads as earnings and requests a payout against.

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
          await creditContributor({
            userId: profile.id,
            type: "download",
            netAmount: creditAmount,
            grossAmount: extraDownloads * photo.price,
            platformFee: extraDownloads * photo.price - creditAmount,
            photoId,
            description: `Hype Engine: +${extraDownloads} custom downloads on photo ${photoId}`,
          });
        }
      }
    }
  }

  // Select back the row so an RLS-blocked write (0 rows, no error) is reported
  // as a failure instead of a silent success.
  const { data: updated, error } = await supabase
    .from("photos")
    .update(updates)
    .eq("id", photoId)
    .select("id");
  if (error) {
    console.error("updatePhotoHypeOverrides error", error);
    return false;
  }
  if (!updated || updated.length === 0) {
    console.error("updatePhotoHypeOverrides: no row updated for", photoId);
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

  const months: Record<string, number> = {};

  // 1. Real purchase revenue
  const { data: purchases } = await supabase
    .from("purchases")
    .select("price, date, photo_id")
    .in("photo_id", photoIds);

  (purchases || []).forEach((r: any) => {
    const d = new Date(r.date);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    months[key] = (months[key] || 0) + (r.price || 0);
  });

  // 2. Hype Engine revenue from balance_adjustments ledger
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("slug", photographerId)
    .single();

  if (profile) {
    const { data: adjustments } = await supabase
      .from("balance_adjustments")
      .select("amount, created_at, reason")
      .eq("user_id", profile.id)
      .like("reason", "Hype Engine%");

    (adjustments || []).forEach((r: any) => {
      const d = new Date(r.created_at);
      const key = monthNames[d.getMonth()] + " " + d.getFullYear();
      months[key] = (months[key] || 0) + (r.amount || 0);
    });
  }

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
    (s: number, p: any) => s + (p.custom_downloads || 0) + (p.downloads || 0),
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
    cats[r.category] = (cats[r.category] || 0) + (r.custom_downloads || 0) + (r.downloads || 0);
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

export const COINS = [
  { symbol: "BTC", name: "Bitcoin", networks: ["Bitcoin", "Lightning"] },
  { symbol: "ETH", name: "Ethereum", networks: ["ERC20", "Arbitrum", "Optimism", "Base"] },
  {
    symbol: "USDT",
    name: "Tether",
    networks: ["ERC20", "TRC20", "BEP20", "Solana", "Polygon", "Avalanche C"],
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    networks: ["ERC20", "TRC20", "BEP20", "Solana", "Polygon", "Avalanche C", "Base"],
  },
  { symbol: "SOL", name: "Solana", networks: ["Solana"] },
  { symbol: "LTC", name: "Litecoin", networks: ["Litecoin"] },
  { symbol: "XRP", name: "Ripple", networks: ["XRP Ledger"] },
  { symbol: "BCH", name: "Bitcoin Cash", networks: ["Bitcoin Cash"] },
  { symbol: "BNB", name: "BNB", networks: ["BEP20", "BEP2"] },
  { symbol: "MATIC", name: "Polygon", networks: ["Polygon"] },
  { symbol: "AVAX", name: "Avalanche", networks: ["Avalanche C", "Avalanche X"] },
  { symbol: "TRX", name: "Tron", networks: ["TRC20"] },
  { symbol: "ADA", name: "Cardano", networks: ["Cardano"] },
  { symbol: "DOT", name: "Polkadot", networks: ["Polkadot"] },
  { symbol: "DOGE", name: "Dogecoin", networks: ["Dogecoin"] },
  { symbol: "DAI", name: "Dai", networks: ["ERC20", "Polygon", "Optimism"] },
];

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

  // Return exactly what is stored. Previously this fabricated an empty "card"
  // method when the creator had none, which made the admin payout panel show a
  // Bank Transfer that was never set up and had no details to pay against.
  if (!data) return [];

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
  stage: PayoutStage;
  adminNote: string;
  requestedAt: string;
  processedAt: string | null;
  payoutCurrency: string | null;
  conversionRate: number | null;
  conversionFeePercent: number | null;
  conversionFeeAmount: number | null;
  conversionFeeBearer: string | null;
  conversionFeeGbp: number | null;
  conversionFeeStatus: string | null;
  conversionFeePaidAt: string | null;
  convertedAmount: number | null;
  transactionReference: string | null;
  /** Set once, when the balance was debited. Its presence prevents a second debit. */
  debitedAt: string | null;
  /** Admin who raised this for the contributor. Null when self-requested. */
  initiatedBy?: string | null;
  /** The returned payout this one replaces. */
  reinitiatedFrom?: string | null;
  returnedReason?: string | null;
  estimatedArrival?: string | null;
}

export interface PayoutConversion {
  currency: string;
  rate: number;
  feePercent: number;
  feeAmount: number;
  feeGbp: number;
  bearer: string;
  netConverted: number;
}

export interface PayoutEvent {
  id: string;
  stage: PayoutStage;
  note: string | null;
  createdAt: string;
}

/** The dated trail behind one payout, oldest first. */
export async function fetchPayoutEvents(payoutRequestId: string): Promise<PayoutEvent[]> {
  const { data, error } = await supabase
    .from("payout_events")
    .select("id, stage, note, created_at")
    .eq("payout_request_id", payoutRequestId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    stage: row.stage,
    note: row.note,
    createdAt: row.created_at,
  }));
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

  // Open the timeline straight away, so the contributor sees the first step.
  await supabase.from("payout_events").insert({
    payout_request_id: data.id,
    stage: "requested",
    note: "Withdrawal request submitted.",
  });

  return {
    id: data.id,
    photographerId: data.photographer_id,
    amount: data.amount,
    method: data.method,
    details: data.details || {},
    status: data.status,
    stage: (data.stage as PayoutStage) || "requested",
    payoutCurrency: data.payout_currency ?? null,
    conversionRate: data.conversion_rate ?? null,
    conversionFeePercent: data.conversion_fee_percent ?? null,
    conversionFeeAmount: data.conversion_fee_amount ?? null,
    conversionFeeBearer: data.conversion_fee_bearer ?? null,
    conversionFeeGbp: data.conversion_fee_gbp ?? null,
    conversionFeeStatus: data.conversion_fee_status ?? null,
    conversionFeePaidAt: data.conversion_fee_paid_at ?? null,
    convertedAmount: data.converted_amount ?? null,
    transactionReference: data.transaction_reference ?? null,
    debitedAt: data.debited_at ?? null,
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
    stage: (r.stage as PayoutStage) || stageFromLegacyStatus(r.status),
    adminNote: r.admin_note || "",
    payoutCurrency: r.payout_currency ?? null,
    conversionRate: r.conversion_rate ?? null,
    conversionFeePercent: r.conversion_fee_percent ?? null,
    conversionFeeAmount: r.conversion_fee_amount ?? null,
    conversionFeeBearer: r.conversion_fee_bearer ?? null,
    conversionFeeGbp: r.conversion_fee_gbp ?? null,
    conversionFeeStatus: r.conversion_fee_status ?? null,
    conversionFeePaidAt: r.conversion_fee_paid_at ?? null,
    convertedAmount: r.converted_amount ?? null,
    transactionReference: r.transaction_reference ?? null,
    debitedAt: r.debited_at ?? null,
    initiatedBy: r.initiated_by ?? null,
    reinitiatedFrom: r.reinitiated_from ?? null,
    returnedReason: r.returned_reason ?? null,
    estimatedArrival: r.estimated_arrival ?? null,
    requestedAt: r.requested_at,
    processedAt: r.processed_at,
  }));
}

/** For rows written before the timeline existed. */
function stageFromLegacyStatus(status: string): PayoutStage {
  if (status === "PAID") return "completed";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "requested";
}

/**
 * Raises a withdrawal for a contributor who cannot reach the form themselves.
 *
 * The amount is checked against their real balance inside the database
 * function, so an assisted request can never be for money the ledger cannot
 * honour. The admin who raised it is recorded on the row.
 */
export async function adminInitiatePayout(
  photographerSlug: string,
  amount: number,
  method: "card" | "local_bank" | "crypto" | "paypal",
  details: Record<string, unknown> = {},
  note?: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("admin_initiate_payout", {
    p_photographer_slug: photographerSlug,
    p_amount: amount,
    p_method: method,
    p_details: details,
    p_note: note ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data as string };
}

/**
 * Replaces a returned payout with a fresh attempt.
 *
 * A new row is created rather than the original being rewound, so both attempts
 * stay in the history. The replacement carries the original's amount and its
 * debit marker: re-initiating re-sends money already accounted for, and must
 * neither become a way to enter a new figure nor debit the balance twice.
 */
export async function reinitiatePayout(
  payoutId: string,
  options: {
    method?: "card" | "local_bank" | "crypto" | "paypal";
    details?: Record<string, unknown>;
    reason?: string;
    estimatedArrival?: string;
  } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("reinitiate_payout", {
    p_payout_id: payoutId,
    p_method: options.method ?? null,
    p_details: options.details ?? null,
    p_reason: options.reason ?? null,
    p_estimated_arrival: options.estimatedArrival ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data as string };
}

/**
 * Moves a payout to a new stage: records the dated event, keeps the coarse
 * status in step, and does the money at the two points that matter — the
 * balance is debited once when the payout is approved, and the earnings ledger
 * is settled when it completes.
 */
export interface PayoutStageResult {
  ok: boolean;
  /** False when the timeline schema is not installed and only the coarse status moved. */
  stageStored: boolean;
}

export async function advancePayoutStage(
  request: PayoutRequest,
  stage: PayoutStage,
  options: {
    note?: string;
    adminId?: string;
    conversion?: PayoutConversion;
    transactionReference?: string;
  } = {},
): Promise<PayoutStageResult> {
  const status = statusForStage(stage);
  // Whether the money has already left, rather than whether the payout happens
  // to be sitting at Approved. An admin correcting a mistake by moving the
  // stage back and forward must not debit the balance twice.
  const alreadyDebited = Boolean(request.debitedAt);

  const core = {
    status,
    admin_note: options.note ?? request.adminNote,
    processed_at: new Date().toISOString(),
  };

  const referencePatch = options.transactionReference
    ? { transaction_reference: options.transactionReference }
    : {};

  const conversionPatch = options.conversion
    ? {
        payout_currency: options.conversion.currency,
        conversion_rate: options.conversion.rate,
        conversion_fee_percent: options.conversion.feePercent,
        conversion_fee_amount: options.conversion.feeAmount,
        conversion_fee_bearer: options.conversion.bearer,
        conversion_fee_gbp: options.conversion.feeGbp,
        conversion_fee_status:
          options.conversion.bearer === "contributor" ? "outstanding" : "waived",
        converted_amount: options.conversion.netConverted,
      }
    : {};

  let stageStored = true;

  const { error } = await supabase
    .from("payout_requests")
    .update({ ...core, ...conversionPatch, ...referencePatch, stage })
    .eq("id", request.id);

  if (error) {
    // The timeline columns are not installed. Actioning a payout must still
    // work, so fall back to the coarse status the platform already reads.
    stageStored = false;

    const { error: coreError } = await supabase
      .from("payout_requests")
      .update(core)
      .eq("id", request.id);

    if (coreError) {
      console.error("advancePayoutStage", coreError);
      return { ok: false, stageStored: false };
    }
  }

  if (stageStored) {
    await supabase.from("payout_events").insert({
      payout_request_id: request.id,
      stage,
      note: options.note || null,
      created_by: options.adminId || null,
    });
  }

  const profileId = await profileIdForSlug(request.photographerId);
  if (!profileId) return { ok: true, stageStored };

  // Give the money back when a payout is called off after it was debited.
  // `returned` is not included: that money is expected to move again on a
  // replacement, which carries the debit forward rather than taking it twice.
  if ((stage === "cancelled" || stage === "rejected") && alreadyDebited) {
    const { error: refundError } = await supabase.rpc("refund_payout", {
      p_payout_id: request.id,
      p_reason: options.note || null,
    });
    if (refundError) console.error("advancePayoutStage refund", refundError);
  }

  // Debit once, at approval or any point past it.
  //
  // Keying only on `stage === "approved"` meant an admin who moved a payout
  // straight from Requested to Processing skipped the debit entirely, and the
  // money went out without ever leaving the balance. Anything at or beyond
  // approval commits the money, so the debit is owed from that point on.
  const approvedIdx = stageIndex("approved");
  const thisIdx = stageIndex(stage);
  const commitsMoney = thisIdx >= approvedIdx && approvedIdx !== -1 && thisIdx !== -1;

  if (commitsMoney && !alreadyDebited) {
    const { error: debitError } = await supabase.rpc("adjust_payout_balance", {
      p_user_id: profileId,
      p_adjustment: -(request.amount || 0),
      p_reason: `Payout approved: request ${request.id}`,
    });

    if (debitError) {
      console.error("advancePayoutStage debit", debitError);
      return { ok: false, stageStored };
    }

    // Record that it happened, so it cannot happen again.
    await supabase
      .from("payout_requests")
      .update({ debited_at: new Date().toISOString() })
      .eq("id", request.id);
  }

  // Tell the contributor where their payout has got to. The intermediate
  // banking steps stay on the timeline rather than becoming notifications.
  const NOTIFIED_STAGES: Record<string, { title: string; priority?: "high" }> = {
    approved: { title: "Payout approved" },
    delivered: { title: "Payment delivered" },
    completed: { title: "Payout completed" },
    rejected: { title: "Payout rejected", priority: "high" },
    cancelled: { title: "Payout cancelled", priority: "high" },
    returned: { title: "Payout returned by the bank", priority: "high" },
  };

  const announcement = NOTIFIED_STAGES[stage];
  if (announcement) {
    await notify({
      userId: profileId,
      category: "earnings",
      priority: announcement.priority,
      title: announcement.title,
      body:
        `£${(request.amount || 0).toLocaleString()}${options.note ? ` — ${options.note}` : ""}` +
        // Say plainly where the money is, rather than leaving them to wonder.
        ((stage === "cancelled" || stage === "rejected") && alreadyDebited
          ? " — returned to your available balance."
          : ""),
      link: "/account?tab=payouts",
    });
  }

  if (options.conversion?.bearer === "contributor") {
    await notify({
      userId: profileId,
      category: "earnings",
      priority: "high",
      title: "Conversion charge outstanding",
      body: `£${options.conversion.feeGbp.toFixed(2)} is payable separately. Your payout is not reduced.`,
      link: "/account?tab=payouts",
    });
  }

  // Settle the ledger when the money has actually gone.
  if (stage === "completed") {
    await supabase.rpc("settle_earnings_for_payout", {
      p_user_id: profileId,
      p_amount: request.amount || 0,
      p_payout_request_id: request.id,
    });
  }

  return { ok: true, stageStored };
}

/**
 * The contributor's own payout currency. Null means they have not chosen one
 * and the currency of their country should be used instead.
 */
export async function setPayoutCurrency(userId: string, currency: string | null): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ payout_currency: currency })
    .eq("id", userId);

  if (error) {
    console.error("setPayoutCurrency", error);
    return false;
  }
  return true;
}

/**
 * Records a contributor's payment of an outstanding conversion charge. The
 * charge sits against the payout rather than being taken out of it, so this is
 * the contributor settling a separate balance.
 */
export async function submitConversionFeePayment(
  payoutRequestId: string,
  receiptUrl: string,
  methodName: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("payout_requests")
    .update({
      conversion_fee_receipt_url: receiptUrl || null,
      conversion_fee_method: methodName || null,
    })
    .eq("id", payoutRequestId);

  if (error) {
    console.error("submitConversionFeePayment", error);
    return false;
  }
  return true;
}

/** Admin confirms the charge has actually been received. */
export async function markConversionFeePaid(payoutRequestId: string): Promise<boolean> {
  const { error } = await supabase
    .from("payout_requests")
    .update({ conversion_fee_status: "paid", conversion_fee_paid_at: new Date().toISOString() })
    .eq("id", payoutRequestId);

  if (error) {
    console.error("markConversionFeePaid", error);
    return false;
  }
  return true;
}

/** payout_requests keys the photographer by profile slug, not by user id. */
async function profileIdForSlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id || null;
}

export async function updatePayoutRequestStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  adminNote: string = "",
): Promise<boolean> {
  // Fetch the request first to get the photographer + amount for the debit.
  // payout_requests.photographer_id holds the profile slug, not the user id.
  const { data: request } = await supabase
    .from("payout_requests")
    .select("photographer_id, amount, status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("payout_requests")
    .update({ status, admin_note: adminNote, processed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return false;
  if (!request) return true;

  const alreadyCommitted = request.status === "APPROVED" || request.status === "PAID";
  const commits = status === "APPROVED" || status === "PAID";

  if (commits && !alreadyCommitted) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", request.photographer_id)
      .single();

    if (profile) {
      // The RPC refuses to take a balance below zero, so a debit can fail.
      const { error: debitError } = await supabase.rpc("adjust_payout_balance", {
        p_user_id: profile.id,
        p_adjustment: -(request.amount || 0),
        p_reason: `Payout ${status.toLowerCase()}: request ${id}`,
      });

      if (debitError) {
        console.error("updatePayoutRequestStatus debit", debitError);
        return false;
      }

      // Mark the oldest cleared earnings as paid, up to the payout amount.
      if (status === "PAID") {
        await supabase.rpc("settle_earnings_for_payout", {
          p_user_id: profile.id,
          p_amount: request.amount || 0,
          p_payout_request_id: id,
        });
      }
    }
  } else if (status === "PAID" && request.status !== "PAID") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", request.photographer_id)
      .single();

    if (profile) {
      await supabase.rpc("settle_earnings_for_payout", {
        p_user_id: profile.id,
        p_amount: request.amount || 0,
        p_payout_request_id: id,
      });
    }
  }

  return true;
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

  if (error) return false;

  // Book the photographer's share as pending. It clears — and reaches their
  // balance — only when an admin approves the sale.
  await recordPendingSaleEarning(id, photoId, price);

  return true;
}

/**
 * Writes the photographer's share of a sale to the ledger as `pending`.
 * Safe to call more than once for the same purchase: the reference is unique,
 * so a repeat is recorded as a no-op rather than duplicate money.
 */
async function recordPendingSaleEarning(
  purchaseId: string,
  photoId: string,
  price: number,
): Promise<void> {
  const contributor = await resolvePhotoContributor(photoId);
  if (!contributor) return;

  const { data: settings } = await supabase
    .from("site_settings")
    .select("platform_fee")
    .eq("id", 1)
    .single();

  const platformFeePct = settings?.platform_fee ?? 20;
  const gross = price || contributor.price || 0;
  const net = Math.round(gross * ((100 - platformFeePct) / 100));

  if (net <= 0) return;

  await supabase.rpc("record_contributor_earning", {
    p_user_id: contributor.userId,
    p_type: "licensing",
    p_net_amount: net,
    p_gross_amount: gross,
    p_platform_fee: gross - net,
    p_photo_id: photoId,
    p_reference: purchaseId,
    p_description: `Marketplace licence: ${contributor.title || photoId}`,
    p_status: "pending",
  });
}

/**
 * Maps a photo to the profile that earns from it. A buyer runs this while
 * checking out, so it reads the public view rather than the profiles table.
 */
async function resolvePhotoContributor(
  photoId: string,
): Promise<{ userId: string; price: number; title: string } | null> {
  const { data: photo } = await supabase
    .from("photos")
    .select("photographer_id, price, title")
    .eq("id", photoId)
    .single();

  if (!photo?.photographer_id) return null;

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("slug", photo.photographer_id)
    .single();

  if (!profile) return null;

  return { userId: profile.id, price: photo.price || 0, title: photo.title || "" };
}

// ============================================================
// APPROVE PURCHASE
// ============================================================

export async function approvePurchase(
  purchaseId: string,
  photoId: string,
  userId: string,
): Promise<boolean> {
  // Fetch purchase + photo + settings to compute photographer share
  const { data: purchase } = await supabase
    .from("purchases")
    .select("price, status")
    .eq("id", purchaseId)
    .single();

  const { error: pErr } = await supabase
    .from("purchases")
    .update({ status: "APPROVED" })
    .eq("id", purchaseId);

  if (pErr) return false;

  // Clear the photographer's share into their balance (only on first approval)
  if (purchase && purchase.status !== "APPROVED" && photoId) {
    const { data: cleared, error: clearError } = await supabase.rpc("mark_earning_available", {
      p_reference: purchaseId,
    });

    if (!clearError && !cleared) {
      // No pending row — a purchase made before the ledger existed. Book and
      // clear the earning in one step.
      await recordPendingSaleEarning(purchaseId, photoId, purchase.price || 0);
      await supabase.rpc("mark_earning_available", { p_reference: purchaseId });
    }

    if (clearError) {
      // The ledger is not installed. Credit the photographer directly so a
      // missing migration never costs them a sale.
      const contributor = await resolvePhotoContributor(photoId);
      const { data: settings } = await supabase
        .from("site_settings")
        .select("platform_fee")
        .eq("id", 1)
        .single();

      if (contributor) {
        const gross = purchase.price || contributor.price || 0;
        const net = Math.round(gross * ((100 - (settings?.platform_fee ?? 20)) / 100));

        if (net > 0) {
          await supabase.rpc("adjust_payout_balance", {
            p_user_id: contributor.userId,
            p_adjustment: net,
            p_reason: `Sale approved: photo ${photoId}`,
          });
        }
      }
    }
  }

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
  // Read the photo before the status changes, so the download can be taken back.
  const { data: purchase } = await supabase
    .from("purchases")
    .select("photo_id")
    .eq("id", purchaseId)
    .maybeSingle();

  const { error } = await supabase
    .from("purchases")
    .update({ status: "REJECTED" })
    .eq("id", purchaseId);

  if (error) return false;

  // The sale never completed, so the photographer's pending share falls away.
  await supabase.rpc("cancel_earning", { p_reference: purchaseId });

  // Checkout counted a download when the payment was submitted. It never
  // completed, so that download comes off the photograph too.
  if (purchase?.photo_id) {
    await supabase.rpc("revoke_photo_download", { p_photo_id: purchase.photo_id });
  }

  return true;
}

// ============================================================
// DELETE PHOTO (admin or photographer)
// ============================================================

export async function deletePhoto(photoId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.error("deletePhoto: not authenticated");
    return false;
  }

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/delete-photo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ photoId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("deletePhoto", body);
    return false;
  }
  return true;
}

// ============================================================
// UPDATE USER ROLE (admin only) — syncs slug/profile for Photographer
// ============================================================

/** What the caller needs to tell the person what just happened to them. */
export interface RoleChangeResult {
  ok: boolean;
  contributorId?: string;
  email?: string;
  name?: string;
}

/**
 * Changes someone's role. Promoting to Photographer also opens the contributor
 * portal: an admin setting the role is itself the vetting decision, so it would
 * be wrong to then send that person through the verification fee to get in.
 */
export async function updateUserRole(userId: string, newRole: string): Promise<RoleChangeResult> {
  const becomesCreator = isCreatorRole(newRole) && newRole !== "Admin";

  const patch: Record<string, unknown> = { role: newRole };
  if (becomesCreator) patch.verification_status = "verified";

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);

  if (error) {
    console.error("updateUserRole", error);
    return { ok: false };
  }

  // Admission to the programme puts a contributor agreement in front of them,
  // so there is something to sign before they start submitting work. The text
  // is supplied by NS CAPTURES; this only creates the record awaiting it.
  if (newRole === "Contributor") {
    const { data: existing } = await supabase
      .from("agreements")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "contributor")
      .maybeSingle();

    if (!existing) {
      await createAgreement({
        userId,
        kind: "contributor",
        title: "International Contributor Agreement",
        body: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
        announce: false,
      });

      await notify({
        userId,
        category: "account",
        priority: "high",
        title: "Welcome to the contributor programme",
        body: "Your International Contributor Agreement is ready to review and sign.",
        link: "/account?tab=agreements",
      });
    }
  }

  if (becomesCreator) {
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
          .replace(/^-+|-+$/g, "") +
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
          avatar: "",
          bio: "",
          cover: "",
          verified: false,
          gear: [],
        });
      }
    }
  }

  // The contributor ID is assigned by trigger, so it has to be read back.
  const { data: after } = await supabase
    .from("profiles")
    .select("contributor_id, email, name")
    .eq("id", userId)
    .maybeSingle();

  return {
    ok: true,
    contributorId: after?.contributor_id || undefined,
    email: after?.email || undefined,
    name: after?.name || undefined,
  };
}

// ============================================================
// RESOLVE MODERATION ITEM
// ============================================================

/**
 * Resolve a review. The photograph's own status is what the contributor and the
 * public gallery read, so it moves with the queue row rather than after it:
 * approving publishes, declining marks the submission declined.
 */
export async function resolveModeration(
  moderationId: string,
  approve: boolean,
  photoId?: string,
  note?: string,
): Promise<boolean> {
  const targetId =
    photoId ||
    (
      await supabase
        .from("moderation_queue")
        .select("photo_id")
        .eq("id", moderationId)
        .maybeSingle()
    ).data?.photo_id;

  if (targetId) {
    const status = approve ? "published" : "rejected";

    const { error: photoError } = await supabase
      .from("photos")
      .update({ status, review_note: note || null })
      .eq("id", targetId);

    if (photoError) {
      // review_note arrives with a later migration; the decision itself must
      // still land.
      const { error: statusError } = await supabase
        .from("photos")
        .update({ status })
        .eq("id", targetId);

      if (statusError) {
        console.error("resolveModeration (photo status)", statusError);
        return false;
      }
    }
  }

  if (targetId) {
    const contributor = await resolvePhotoContributor(targetId);
    if (contributor) {
      await notify({
        userId: contributor.userId,
        category: "photography",
        title: approve ? "Photograph approved" : "Submission update",
        body: approve
          ? `"${contributor.title}" has been approved for marketplace licensing.`
          : note || `"${contributor.title}" was not selected for marketplace publication.`,
        link: "/account?tab=submissions",
      });
    }
  }

  if (approve) {
    const { error } = await supabase.from("moderation_queue").delete().eq("id", moderationId);
    if (error) {
      console.error("resolveModeration (delete)", error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from("moderation_queue")
      .update({ status: "rejected", reason: note || "Not selected for publication" })
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
  role: "Buyer" | "Photographer" | "Contributor" | "Enterprise" | "Admin";
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
  // Routed through the ledger rather than adjust_payout_balance directly, so a
  // manual admin edit shows up as a line the contributor can see rather than
  // an unexplained jump in their balance.
  return creditContributor({
    userId,
    type: "adjustment",
    netAmount: adjustment,
    description: reason || "Balance adjustment by NS CAPTURES",
    adminId,
  });
}

// ============================================================
// CONTRIBUTOR PORTAL — ACQUISITIONS, AGREEMENTS, PUBLICATIONS
// ============================================================
//
// Every reader here resolves to an empty list if the table is missing, so the
// portal renders its empty states rather than erroring while migration 035 is
// still unapplied.

export type AcquisitionCategory = "standard" | "premium" | "signature" | "exceptional";
export type AcquisitionRights = "non_exclusive" | "exclusive" | "assignment";
export type AcquisitionStatus =
  | "under_consideration"
  | "offer_made"
  | "awaiting_contributor"
  | "agreement_pending"
  | "agreement_signed"
  | "payment_pending"
  | "paid"
  | "declined"
  | "cancelled";

export interface Acquisition {
  id: string;
  reference: string;
  userId: string;
  photoId: string | null;
  photoTitle?: string;
  photoImage?: string;
  category: AcquisitionCategory;
  amount: number;
  currency: string;
  rights: AcquisitionRights;
  territory: string | null;
  term: string | null;
  permittedUses: string | null;
  attribution: string | null;
  status: AcquisitionStatus;
  selectionNote: string | null;
  offeredAt: string | null;
  respondedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  responseNote?: string | null;
}

export async function fetchAcquisitions(userId: string): Promise<Acquisition[]> {
  const { data, error } = await supabase
    .from("acquisitions")
    .select("*, photos(title, image)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    photoId: row.photo_id,
    photoTitle: row.photos?.title || undefined,
    photoImage: row.photos?.image || undefined,
    category: row.category,
    amount: Number(row.amount || 0),
    currency: row.currency || "GBP",
    rights: row.rights,
    territory: row.territory,
    term: row.term,
    permittedUses: row.permitted_uses,
    attribution: row.attribution,
    status: row.status,
    selectionNote: row.selection_note,
    responseNote: row.response_note ?? null,
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }));
}

export type AgreementKind =
  "contributor" | "acquisition" | "publication" | "marketplace_licence" | "bonus";
export type AgreementStatus =
  "awaiting_signature" | "signed" | "active" | "declined" | "terminated";

export interface Agreement {
  id: string;
  reference: string;
  kind: AgreementKind;
  title: string;
  version: string;
  body: string | null;
  status: AgreementStatus;
  acquisitionId: string | null;
  signedName: string | null;
  signedAt: string | null;
  effectiveDate: string | null;
  createdAt: string;
  declinedReason?: string | null;
  declinedAt?: string | null;
}

export async function fetchAgreements(userId: string): Promise<Agreement[]> {
  const { data, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    title: row.title,
    version: row.version,
    body: row.body,
    status: row.status,
    acquisitionId: row.acquisition_id,
    signedName: row.signed_name,
    signedAt: row.signed_at,
    declinedReason: row.declined_reason ?? null,
    declinedAt: row.declined_at ?? null,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  }));
}

/** Records the contributor's acceptance. Returns false if it is not theirs to sign. */
export async function signAgreement(agreementId: string, signedName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("sign_agreement", {
    p_agreement_id: agreementId,
    p_signed_name: signedName,
  });

  if (error) {
    console.error("signAgreement", error);
    return false;
  }
  return data === true;
}

/**
 * Refusing an agreement. The mirror of signing, and just as final: the row
 * moves to declined and neither answer can be given twice.
 */
export async function declineAgreement(agreementId: string, reason?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("decline_agreement", {
    p_agreement_id: agreementId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    console.error("declineAgreement", error);
    return false;
  }
  return data === true;
}

/**
 * Answering an acquisition offer. Accepting moves it to agreement_pending —
 * agreeing in principle is what prompts the agreement, and nothing is
 * transferred until that agreement is signed.
 */
export async function respondToAcquisition(
  acquisitionId: string,
  accept: boolean,
  note?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("respond_to_acquisition", {
    p_acquisition_id: acquisitionId,
    p_accept: accept,
    p_note: note?.trim() || null,
  });

  if (error) {
    console.error("respondToAcquisition", error);
    return false;
  }
  return data === true;
}

export type PublicationStatus =
  "under_consideration" | "shortlisted" | "selected" | "published" | "not_selected";

export interface PublicationEntry {
  id: string;
  photoId: string | null;
  photoTitle?: string;
  photoImage?: string;
  collectionName: string;
  edition: string | null;
  status: PublicationStatus;
  note: string | null;
  createdAt: string;
}

export async function fetchPublicationEntries(userId: string): Promise<PublicationEntry[]> {
  const { data, error } = await supabase
    .from("publication_entries")
    .select("*, photos(title, image)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    photoId: row.photo_id,
    photoTitle: row.photos?.title || undefined,
    photoImage: row.photos?.image || undefined,
    collectionName: row.collection_name,
    edition: row.edition,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

// ============================================================
// CONTRIBUTOR PROPOSALS
// ============================================================
//
// The invitation that precedes everything: sent to a photographer who has no
// account yet, and accepted from a public page. The recipient's side runs
// through the "proposal" edge function, because a token is the only credential
// they hold and it has to be checked server-side.

export type ProposalStatus = "issued" | "viewed" | "accepted" | "declined" | "expired";

export interface ContributorProposal {
  id: string;
  reference: string;
  token: string;
  email: string;
  name: string;
  location: string | null;
  occupation: string | null;
  body: string | null;
  status: ProposalStatus;
  issuedAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  expiresAt: string;
  createdUserId: string | null;
}

/** What the recipient sees. Never carries the token or anyone else's proposal. */
export interface PublicProposal {
  reference: string;
  name: string;
  email: string;
  location: string | null;
  occupation: string | null;
  body: string | null;
  status: ProposalStatus;
  issuedAt: string;
  expiresAt: string;
}

function rowToProposal(row: any): ContributorProposal {
  return {
    id: row.id,
    reference: row.reference,
    token: row.token,
    email: row.email,
    name: row.name,
    location: row.location,
    occupation: row.occupation,
    body: row.body,
    status: row.status,
    issuedAt: row.issued_at,
    viewedAt: row.viewed_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
    createdUserId: row.created_user_id,
  };
}

export async function fetchProposals(): Promise<ContributorProposal[]> {
  const { data, error } = await supabase
    .from("contributor_proposals")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToProposal);
}

export async function createProposal(input: {
  email: string;
  name: string;
  location?: string;
  occupation?: string;
  body: string;
  adminId?: string;
}): Promise<ContributorProposal | null> {
  const { data, error } = await supabase
    .from("contributor_proposals")
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      location: input.location || null,
      occupation: input.occupation || null,
      body: input.body,
      created_by: input.adminId || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createProposal", error);
    return null;
  }
  return rowToProposal(data);
}

/** Withdraw a proposal that has not been answered. */
export async function cancelProposal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("contributor_proposals")
    .update({ status: "expired", responded_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["issued", "viewed"]);

  if (error) {
    console.error("cancelProposal", error);
    return false;
  }
  return true;
}

/** The link the recipient opens. The token is the credential, so treat it as one. */
export function proposalLink(token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.nscaptures.com";
  return `${origin}/proposal/${token}`;
}

// ---- the recipient's side, through the edge function ----------------------

async function callProposalFunction(
  token: string,
  action: "view" | "accept" | "decline",
): Promise<any> {
  const { data, error } = await supabase.functions.invoke("proposal", {
    body: { token, action },
  });

  if (error) throw new Error(error.message || "Could not reach the proposal");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function viewProposal(token: string): Promise<PublicProposal | null> {
  try {
    const data = await callProposalFunction(token, "view");
    return (data?.proposal as PublicProposal) || null;
  } catch (err) {
    console.error("viewProposal", err);
    return null;
  }
}

export async function acceptProposal(
  token: string,
): Promise<{ ok: boolean; password?: string; email?: string; message?: string }> {
  try {
    const data = await callProposalFunction(token, "accept");
    return { ok: true, password: data?.password, email: data?.email };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function declineProposal(token: string): Promise<boolean> {
  try {
    await callProposalFunction(token, "decline");
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// CURATION, FEATURING AND ADMISSION
// ============================================================

/** Feature or unfeature a photograph on the marketplace. */
export async function setPhotoFeatured(photoId: string, featured: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .update({ featured, featured_at: featured ? new Date().toISOString() : null })
    .eq("id", photoId);

  if (error) {
    console.error("setPhotoFeatured", error);
    return false;
  }

  if (featured) {
    const contributor = await resolvePhotoContributor(photoId);
    if (contributor) {
      await notify({
        userId: contributor.userId,
        category: "photography",
        title: "Your photograph is featured",
        body: `"${contributor.title}" has been featured on NS CAPTURES.`,
        link: `/photo/${photoId}`,
      });
    }
  }

  return true;
}

/**
 * Ask a contributor for more information on a submission. The photograph stays
 * in review rather than being decided either way.
 */
export async function requestSubmissionInformation(
  photoId: string,
  question: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .update({ review_note: question })
    .eq("id", photoId);

  if (error) {
    console.error("requestSubmissionInformation", error);
    return false;
  }

  const contributor = await resolvePhotoContributor(photoId);
  if (contributor) {
    await notify({
      userId: contributor.userId,
      category: "photography",
      priority: "high",
      title: "More information needed",
      body: `NS CAPTURES has a question about "${contributor.title}": ${question}`,
      link: "/account?tab=submissions",
    });
  }

  return true;
}

export async function createCollection(input: {
  id: string;
  title: string;
  description?: string;
  curator?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("collections").insert({
    id: input.id,
    title: input.title,
    description: input.description || null,
    curator: input.curator || "NS CAPTURES",
    count: 0,
  });

  if (error) {
    console.error("createCollection", error);
    return false;
  }
  return true;
}

export async function deleteCollection(collectionId: string): Promise<boolean> {
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);

  if (error) {
    console.error("deleteCollection", error);
    return false;
  }
  return true;
}

/**
 * Turns an approved application into a contributor account: creates the user,
 * emails their credentials, and links the two so a second approval cannot
 * create a duplicate.
 */
export async function admitContributorFromSubmission(submission: {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
}): Promise<{ ok: boolean; password?: string; message?: string }> {
  const { data: existing } = await supabase
    .from("contributor_submissions")
    .select("created_user_id")
    .eq("id", submission.id)
    .maybeSingle();

  if (existing?.created_user_id) {
    return { ok: false, message: "An account has already been created for this application." };
  }

  try {
    const result = await adminCreateUser({
      email: submission.email,
      name: submission.fullName,
      role: "Contributor",
      status: "Active",
      verificationStatus: "verified",
      phone: submission.phone,
    });

    await supabase
      .from("contributor_submissions")
      .update({
        created_user_id: result.user?.id || null,
        account_created_at: new Date().toISOString(),
        status: "approved",
      })
      .eq("id", submission.id);

    return { ok: true, password: result.password };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function fetchNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    category: row.category,
    priority: row.priority,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("markNotificationRead", error);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("markAllNotificationsRead", error);
    return false;
  }
  return true;
}

/**
 * Raises a notification, honouring the recipient's preferences. High priority
 * always goes through: an acquisition offer or an agreement awaiting signature
 * is not something to have opted out of.
 *
 * Never throws and never blocks the thing that triggered it — a notification
 * failing must not fail a payout or an approval.
 */
export async function notify(input: {
  userId: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const priority = input.priority || "normal";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", input.userId)
      .maybeSingle();

    const preferences = (profile?.notification_preferences || {}) as NotificationPreferences;

    if (!shouldShowInApp(preferences, input.category, priority)) return;

    await supabase.from("notifications").insert({
      user_id: input.userId,
      category: input.category,
      priority,
      title: input.title,
      body: input.body || null,
      link: input.link || null,
    });
  } catch (err) {
    console.warn("notify skipped:", (err as Error).message);
  }
}

export async function fetchNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .maybeSingle();

  return (data?.notification_preferences || {}) as NotificationPreferences;
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", userId);

  if (error) {
    console.error("saveNotificationPreferences", error);
    return false;
  }
  return true;
}

// ============================================================
// PROGRAMME ADMINISTRATION — writes behind the contributor portal
// ============================================================

/**
 * How an acquisition's status maps onto the photograph itself. A photograph is
 * only "acquired" once the acquisition has actually been paid; everything
 * before that is consideration, and a withdrawn offer leaves no mark.
 */
export function photoStateForAcquisition(status: AcquisitionStatus): "review" | "acquired" | null {
  if (status === "paid") return "acquired";
  if (status === "declined" || status === "cancelled") return null;
  return "review";
}

export interface AcquisitionInput {
  photoId: string;
  userId: string;
  category: AcquisitionCategory;
  amount: number;
  rights: AcquisitionRights;
  territory?: string;
  term?: string;
  permittedUses?: string;
  attribution?: string;
  selectionNote?: string;
  status?: AcquisitionStatus;
}

/** Every acquisition across the platform, for the admin console. */
export async function fetchAllAcquisitions(): Promise<(Acquisition & { userName?: string })[]> {
  const { data, error } = await supabase
    .from("acquisitions")
    .select("*, photos(title, image), profiles(name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    photoId: row.photo_id,
    photoTitle: row.photos?.title || undefined,
    photoImage: row.photos?.image || undefined,
    userName: row.profiles?.name || undefined,
    category: row.category,
    amount: Number(row.amount || 0),
    currency: row.currency || "GBP",
    rights: row.rights,
    territory: row.territory,
    term: row.term,
    permittedUses: row.permitted_uses,
    attribution: row.attribution,
    status: row.status,
    selectionNote: row.selection_note,
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }));
}

export async function createAcquisition(input: AcquisitionInput): Promise<Acquisition | null> {
  const status = input.status || "offer_made";

  const { data, error } = await supabase
    .from("acquisitions")
    .insert({
      photo_id: input.photoId,
      user_id: input.userId,
      category: input.category,
      amount: input.amount,
      rights: input.rights,
      territory: input.territory || "Worldwide",
      term: input.term || null,
      permitted_uses: input.permittedUses || null,
      attribution: input.attribution || null,
      selection_note: input.selectionNote || null,
      status,
      offered_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createAcquisition", error);
    return null;
  }

  // Keep the photograph's own state in step with the offer.
  await setPhotoAcquisitionState(input.photoId, photoStateForAcquisition(status));

  await notify({
    userId: input.userId,
    category: "acquisitions",
    priority: "high",
    title: "New acquisition offer",
    body: `NS CAPTURES has made a direct acquisition offer of £${input.amount.toLocaleString()}.`,
    link: "/account?tab=acquisitions",
  });

  return {
    id: data.id,
    reference: data.reference,
    userId: data.user_id,
    photoId: data.photo_id,
    category: data.category,
    amount: Number(data.amount || 0),
    currency: data.currency || "GBP",
    rights: data.rights,
    territory: data.territory,
    term: data.term,
    permittedUses: data.permitted_uses,
    attribution: data.attribution,
    status: data.status,
    selectionNote: data.selection_note,
    offeredAt: data.offered_at,
    respondedAt: data.responded_at,
    paidAt: data.paid_at,
    createdAt: data.created_at,
  };
}

/**
 * Moves an acquisition to a new status. Marking it paid is the point at which
 * the money reaches the contributor: it books an acquisition earning against
 * their balance, keyed on the acquisition reference so it cannot double-pay.
 */
export async function updateAcquisitionStatus(
  acquisition: Acquisition,
  status: AcquisitionStatus,
): Promise<boolean> {
  const patch: Record<string, unknown> = { status };

  if (status === "paid") patch.paid_at = new Date().toISOString();
  if (status === "declined" || status === "cancelled") {
    patch.responded_at = new Date().toISOString();
  }

  const { error } = await supabase.from("acquisitions").update(patch).eq("id", acquisition.id);

  if (error) {
    console.error("updateAcquisitionStatus", error);
    return false;
  }

  if (acquisition.photoId) {
    await setPhotoAcquisitionState(acquisition.photoId, photoStateForAcquisition(status));
  }

  if (status === "agreement_pending") {
    await notify({
      userId: acquisition.userId,
      category: "acquisitions",
      priority: "high",
      title: "Agreement requires your signature",
      body: `Your acquisition agreement for ${acquisition.photoTitle || acquisition.reference} is ready to review and sign.`,
      link: "/account?tab=agreements",
    });
  }

  if (status === "paid" && acquisition.amount > 0) {
    await creditContributor({
      userId: acquisition.userId,
      type: "acquisition",
      netAmount: acquisition.amount,
      photoId: acquisition.photoId,
      reference: acquisition.reference,
      description: `Direct acquisition: ${acquisition.photoTitle || acquisition.reference}`,
    });

    await notify({
      userId: acquisition.userId,
      category: "earnings",
      title: "Acquisition paid",
      body: `£${acquisition.amount.toLocaleString()} has been credited to your balance.`,
      link: "/account?tab=earnings",
    });
  }

  return true;
}

/** Issues an agreement for a contributor to review and sign. */
export async function createAgreement(input: {
  userId: string;
  kind: AgreementKind;
  title: string;
  body: string;
  version?: string;
  acquisitionId?: string;
  effectiveDate?: string;
  /**
   * Whether to email the contributor that something needs signing. On by
   * default, so no caller can quietly issue an agreement nobody hears about.
   * Admission turns it off because the welcome email already says it.
   */
  announce?: boolean;
}): Promise<boolean> {
  const prefix =
    input.kind === "acquisition" ? "ACQ" : input.kind === "publication" ? "PUB" : "NSC-CA";
  const reference = `${prefix}-${new Date().getFullYear()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  const version = input.version || "1.0";
  const effectiveDate = input.effectiveDate || null;

  // Who the agreement is about, so its placeholders can be filled in for them.
  const { data: who } = await supabase
    .from("profiles")
    .select("name, email, contributor_id, country")
    .eq("id", input.userId)
    .maybeSingle();

  // Filled once, here, and stored filled. Doing it when the agreement is
  // displayed instead would let a signed document change afterwards.
  const body = fillAgreement(input.body, {
    reference,
    version,
    effectiveDate,
    name: who?.name,
    contributorId: who?.contributor_id,
    email: who?.email,
    country: who?.country,
  });

  const { error } = await supabase.from("agreements").insert({
    reference,
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body,
    version,
    acquisition_id: input.acquisitionId || null,
    effective_date: effectiveDate,
    status: "awaiting_signature",
  });

  if (error) {
    console.error("createAgreement", error);
    return false;
  }

  if (input.announce !== false && who?.email) {
    // An unsent email must never make a created agreement look like a failure.
    try {
      const { sendAgreementIssued } = await import("../../lib/email");
      await sendAgreementIssued(who.email, who.name || "there", {
        title: input.title,
        reference,
        version,
      });
    } catch (err) {
      console.error("Agreement-issued email failed:", err);
    }
  }

  return true;
}

export interface AgreementTemplate {
  id: string;
  kind: AgreementKind;
  title: string;
  version: string;
  body: string;
  isCurrent: boolean;
}

/** The texts available to issue from, newest first. */
export async function fetchAgreementTemplates(): Promise<AgreementTemplate[]> {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select("id, kind, title, version, body, is_current")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("fetchAgreementTemplates", error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    version: t.version,
    body: t.body,
    isCurrent: t.is_current,
  }));
}

export async function fetchAllAgreements(): Promise<(Agreement & { userName?: string })[]> {
  const { data, error } = await supabase
    .from("agreements")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    title: row.title,
    version: row.version,
    body: row.body,
    status: row.status,
    acquisitionId: row.acquisition_id,
    signedName: row.signed_name,
    signedAt: row.signed_at,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
    userName: row.profiles?.name || undefined,
  }));
}

/**
 * Awards a bonus. This writes straight to the earnings ledger, so it credits
 * the contributor's balance and shows up as a line they can see.
 */
export async function awardBonus(input: {
  userId: string;
  type: "bonus" | "award";
  amount: number;
  description: string;
  photoId?: string;
  adminId?: string;
}): Promise<boolean> {
  await notify({
    userId: input.userId,
    category: "earnings",
    title: input.type === "award" ? "Discovery award" : "Bonus awarded",
    body: `${input.description} — £${input.amount.toLocaleString()} credited to your balance.`,
    link: "/account?tab=bonuses",
  });

  return creditContributor({
    userId: input.userId,
    type: input.type,
    netAmount: input.amount,
    photoId: input.photoId,
    description: input.description,
    adminId: input.adminId,
  });
}

export async function createPublicationEntry(input: {
  userId: string;
  photoId: string;
  collectionName: string;
  edition?: string;
  status?: PublicationStatus;
  note?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("publication_entries").insert({
    user_id: input.userId,
    photo_id: input.photoId,
    collection_name: input.collectionName,
    edition: input.edition || null,
    status: input.status || "under_consideration",
    note: input.note || null,
  });

  if (error) {
    console.error("createPublicationEntry", error);
    return false;
  }
  return true;
}

export async function updatePublicationStatus(
  id: string,
  status: PublicationStatus,
): Promise<boolean> {
  const { data: entry } = await supabase
    .from("publication_entries")
    .select("user_id, collection_name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("publication_entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updatePublicationStatus", error);
    return false;
  }

  if (entry?.user_id && status !== "under_consideration") {
    const headline: Record<string, string> = {
      shortlisted: "Publication shortlist",
      selected: "Selected for publication",
      published: "Published",
      not_selected: "Publication update",
    };

    await notify({
      userId: entry.user_id,
      category: "publications",
      title: headline[status] || "Publication update",
      body: `Your photograph in ${entry.collection_name}.`,
      link: "/account?tab=publications",
    });
  }

  return true;
}

export async function fetchAllPublicationEntries(): Promise<
  (PublicationEntry & { userName?: string })[]
> {
  const { data, error } = await supabase
    .from("publication_entries")
    .select("*, photos(title, image), profiles(name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    photoId: row.photo_id,
    photoTitle: row.photos?.title || undefined,
    photoImage: row.photos?.image || undefined,
    collectionName: row.collection_name,
    edition: row.edition,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    userName: row.profiles?.name || undefined,
  }));
}

/** Recognition status. Displayed on the contributor's dashboard. */
export async function setContributorLevel(
  userId: string,
  level: "international" | "featured" | "collection",
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ contributor_level: level })
    .eq("id", userId);

  if (error) {
    console.error("setContributorLevel", error);
    return false;
  }
  return true;
}

// ============================================================
// LICENSED WORK — the contributor's own photographs, as licensed by customers
// ============================================================

export interface LicensedWork {
  photoId: string;
  title: string;
  image: string;
  licenceCount: number;
  grossValue: number;
  lastLicensedAt: string | null;
}

/**
 * Licences taken out on this contributor's photographs, grouped per
 * photograph. Built from the existing licences table rather than a new one.
 */
export async function fetchLicensedWork(photographerSlug: string): Promise<LicensedWork[]> {
  const { data: photos } = await supabase
    .from("photos")
    .select("id, title, image")
    .eq("photographer_id", photographerSlug);

  if (!photos || photos.length === 0) return [];

  const byId = new Map(photos.map((p: any) => [p.id, p]));

  const { data: licences } = await supabase
    .from("licenses")
    .select("photo_id, price, purchased_at")
    .in(
      "photo_id",
      photos.map((p: any) => p.id),
    );

  if (!licences || licences.length === 0) return [];

  const grouped = new Map<string, LicensedWork>();

  for (const licence of licences as any[]) {
    const photo = byId.get(licence.photo_id);
    if (!photo) continue;

    const existing = grouped.get(licence.photo_id);
    const purchasedAt = licence.purchased_at || null;

    if (existing) {
      existing.licenceCount += 1;
      existing.grossValue += Number(licence.price || 0);
      if (purchasedAt && (!existing.lastLicensedAt || purchasedAt > existing.lastLicensedAt)) {
        existing.lastLicensedAt = purchasedAt;
      }
    } else {
      grouped.set(licence.photo_id, {
        photoId: licence.photo_id,
        title: photo.title || "Untitled",
        image: photo.image || "",
        licenceCount: 1,
        grossValue: Number(licence.price || 0),
        lastLicensedAt: purchasedAt,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => b.licenceCount - a.licenceCount);
}

/** Curated collections that include at least one of this contributor's photographs. */
export async function fetchCollectionsFeaturing(
  photographerSlug: string,
): Promise<{ id: string; title: string; count: number }[]> {
  const { data: photos } = await supabase
    .from("photos")
    .select("id")
    .eq("photographer_id", photographerSlug);

  if (!photos || photos.length === 0) return [];

  const { data: links } = await supabase
    .from("collection_photos")
    .select("collection_id, photo_id")
    .in(
      "photo_id",
      photos.map((p: any) => p.id),
    );

  if (!links || links.length === 0) return [];

  const counts = new Map<string, number>();
  for (const link of links as any[]) {
    counts.set(link.collection_id, (counts.get(link.collection_id) || 0) + 1);
  }

  const { data: collections } = await supabase
    .from("collections")
    .select("id, title")
    .in("id", [...counts.keys()]);

  return (collections || []).map((c: any) => ({
    id: c.id,
    title: c.title || "Untitled collection",
    count: counts.get(c.id) || 0,
  }));
}

// ============================================================
// CONTRIBUTOR EARNINGS LEDGER
// ============================================================

/** Every ledger line for one contributor, newest first. */
export async function fetchContributorEarnings(userId: string): Promise<ContributorEarning[]> {
  const { data, error } = await supabase
    .from("contributor_earnings")
    .select("*, photos(title)")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchContributorEarnings", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    photoId: row.photo_id,
    photoTitle: row.photos?.title || undefined,
    reference: row.reference,
    description: row.description,
    grossAmount: Number(row.gross_amount || 0),
    platformFee: Number(row.platform_fee || 0),
    netAmount: Number(row.net_amount || 0),
    currency: row.currency || "GBP",
    createdAt: row.created_at,
    availableAt: row.available_at,
    paidAt: row.paid_at,
  }));
}

/**
 * What a contributor can actually draw: their balance, less anything already
 * requested and awaiting a decision. Lifetime and the breakdown come from the
 * ledger, but this number comes from the balance, so what they are shown always
 * matches what a payout would pay.
 */
export function withdrawableFrom(
  payoutBalance: number,
  pendingRequests: { amount: number; status: string }[] = [],
): number {
  const reserved = pendingRequests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return Math.max(0, (payoutBalance || 0) - reserved);
}

const EMPTY_BY_TYPE: Record<EarningType, number> = {
  licensing: 0,
  acquisition: 0,
  bonus: 0,
  award: 0,
  download: 0,
  adjustment: 0,
};

/**
 * Itemises the ledger: what is pending, what has been earned in total, and how
 * it breaks down by type.
 *
 * The `available` figure it returns is the ledger's own view. It is not what a
 * contributor can withdraw — profiles.payout_balance is, and the two can differ
 * whenever a payout settles part of an entry rather than all of it. Anything
 * showing someone their spendable money should pass the balance to
 * withdrawableFrom() instead.
 */
export function summariseEarnings(entries: ContributorEarning[]): EarningsSummary {
  const summary: EarningsSummary = {
    available: 0,
    pending: 0,
    lifetime: 0,
    byType: { ...EMPTY_BY_TYPE },
  };

  for (const entry of entries) {
    if (entry.status === "available") summary.available += entry.netAmount;
    if (entry.status === "pending") summary.pending += entry.netAmount;
    if (entry.status !== "pending") {
      summary.lifetime += entry.netAmount;
      summary.byType[entry.type] += entry.netAmount;
    }
  }

  return summary;
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
    .from("public_profiles")
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
    .from("public_profiles")
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
  paymentReceiptUrl?: string;
  paymentMethodName?: string;
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
    paymentReceiptUrl: r.payment_receipt_url || undefined,
    paymentMethodName: r.payment_method_name || undefined,
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
    paymentReceiptUrl: data.payment_receipt_url || undefined,
    paymentMethodName: data.payment_method_name || undefined,
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
    paymentReceiptUrl: data.payment_receipt_url || undefined,
    paymentMethodName: data.payment_method_name || undefined,
    status: data.status,
    adminNote: data.admin_note || "",
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
  };
}

export async function payVerificationFee(
  userId: string,
  receiptUrl?: string,
  paymentMethodName?: string,
): Promise<boolean> {
  // Record the verification fee as a purchase
  const purchaseId = `VF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  await supabase.from("purchases").insert({
    id: purchaseId,
    user_id: userId,
    photo_id: null,
    price: 247,
    license: "Verification Fee",
    status: "APPROVED",
    payment_method: paymentMethodName || "card",
    receipt_url: receiptUrl || null,
  });

  const { error } = await supabase
    .from("profiles")
    .update({ verification_status: "pending" })
    .eq("id", userId);

  if (error) {
    console.error("payVerificationFee error", error);
    throw new Error(error.message);
  }

  // Update latest verification_document for this user with payment receipt & method name
  const { data: doc } = await supabase
    .from("verification_documents")
    .select("id")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (doc) {
    await supabase
      .from("verification_documents")
      .update({
        payment_receipt_url: receiptUrl || null,
        payment_method_name: paymentMethodName || null,
      })
      .eq("id", doc.id);
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
    paymentReceiptUrl: r.payment_receipt_url || undefined,
    paymentMethodName: r.payment_method_name || undefined,
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
