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
    aperture: row.aperture || undefined,
    shutterSpeed: row.shutter_speed || undefined,
    focalLength: row.focal_length || undefined,
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
// CREATE BRIEF (Request modal)
// ============================================================

export async function createBrief(brief: { title: string; location: string; license: string; budget: number; description: string }): Promise<Brief | null> {
  if (!isSupabaseConfigured) {
    return { id: `BRF-${Date.now().toString(36)}`, ...brief, delivery: "30 days", status: "OPEN" };
  }

  const id = `BRF-${Date.now().toString(36)}`;
  const { data, error } = await supabase!
    .from("briefs")
    .insert({
      id,
      title: brief.title,
      location: brief.location,
      license: brief.license,
      budget: brief.budget,
      description: brief.description,
      status: "OPEN",
    })
    .select()
    .single();

  if (error) { console.error("createBrief", error); return null; }
  return { id: data.id, title: data.title, location: data.location, license: data.license, budget: data.budget, delivery: data.delivery || "", status: data.status, description: data.description || "" };
}

// ============================================================
// ADMIN
// ============================================================

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return mockAdminUsers;

  const { data, error } = await supabase!
    .from("profiles")
    .select("id, name, email, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return mockAdminUsers;

  return data.map((p: any, i: number) => ({
    id: p.id,
    name: p.name || "Unknown",
    email: p.email || `${p.name?.toLowerCase().replace(/\s+/g, ".") || "user"}@ns-captures.com`,
    role: (p.role || "Buyer") as AdminUser["role"],
    status: (p.status || "Active") as AdminUser["status"],
    joined: p.created_at
      ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "Unknown",
  }));
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
// CREATE PHOTO (upload from dashboard)
// ============================================================

export async function createPhoto(photo: Omit<Photo, "downloads" | "views" | "likes">): Promise<Photo | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase!
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

  if (error) { console.error("createPhoto", error); return null; }
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

export async function fetchPhotographerProfileSettings(userId: string): Promise<PhotographerProfileSettings | null> {
  if (!isSupabaseConfigured) return null;

  const { data } = await supabase!
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

export async function upsertPhotographerProfileSettings(settings: PhotographerProfileSettings): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("photographer_profiles")
    .upsert({
      user_id: settings.userId,
      location: settings.location,
      specialty: settings.specialty,
      bio: settings.bio,
      bank_name: settings.bankName,
      bank_account_last4: settings.bankAccountLast4,
      updated_at: new Date().toISOString(),
    });

  if (error) { console.error("upsertPhotographerProfileSettings", error); return false; }
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

// ============================================================
// LOCAL STORAGE HELPERS FOR MOCK MODE
// ============================================================

function getLocalSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function saveLocalSet(key: string, set: Set<string>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  }
}

// ============================================================
// SOCIAL: LIKES
// ============================================================

export async function hasUserLikedPhoto(userId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const likes = getLocalSet(`likes_${userId}`);
    return likes.has(photoId);
  }
  const { data } = await supabase!
    .from("user_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();
  return !!data;
}

export async function toggleLike(userId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const likes = getLocalSet(`likes_${userId}`);
    let isLiked = false;
    if (likes.has(photoId)) {
      likes.delete(photoId);
    } else {
      likes.add(photoId);
      isLiked = true;
    }
    saveLocalSet(`likes_${userId}`, likes);
    return isLiked;
  }

  const { data: existing } = await supabase!
    .from("user_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    await supabase!.from("user_likes").delete().eq("user_id", userId).eq("photo_id", photoId);
    // Decrement likes on photos table
    const { data: photo } = await supabase!.from("photos").select("likes").eq("id", photoId).single();
    if (photo) await supabase!.from("photos").update({ likes: Math.max((photo.likes || 1) - 1, 0) }).eq("id", photoId);
    return false; // unliked
  } else {
    await supabase!.from("user_likes").insert({ user_id: userId, photo_id: photoId });
    const { data: photo } = await supabase!.from("photos").select("likes").eq("id", photoId).single();
    if (photo) await supabase!.from("photos").update({ likes: (photo.likes || 0) + 1 }).eq("id", photoId);
    return true; // liked
  }
}

// ============================================================
// SOCIAL: SAVES (bookmarks)
// ============================================================

export async function hasUserSavedPhoto(userId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const saves = getLocalSet(`saves_${userId}`);
    return saves.has(photoId);
  }
  const { data } = await supabase!
    .from("user_saves")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();
  return !!data;
}

export async function toggleSave(userId: string, photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const saves = getLocalSet(`saves_${userId}`);
    let isSaved = false;
    if (saves.has(photoId)) {
      saves.delete(photoId);
    } else {
      saves.add(photoId);
      isSaved = true;
    }
    saveLocalSet(`saves_${userId}`, saves);
    return isSaved;
  }

  const { data: existing } = await supabase!
    .from("user_saves")
    .select("photo_id")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    await supabase!.from("user_saves").delete().eq("user_id", userId).eq("photo_id", photoId);
    return false; // unsaved
  } else {
    await supabase!.from("user_saves").insert({ user_id: userId, photo_id: photoId });
    return true; // saved
  }
}

export async function fetchUserSavedPhotoIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return Array.from(getLocalSet(`saves_${userId}`));
  }
  const { data } = await supabase!
    .from("user_saves")
    .select("photo_id")
    .eq("user_id", userId);
  return (data || []).map((r: any) => r.photo_id);
}

// ============================================================
// SOCIAL: FOLLOWS
// ============================================================

export async function hasUserFollowedPhotographer(userId: string, photographerId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const follows = getLocalSet(`follows_${userId}`);
    return follows.has(photographerId);
  }
  const { data } = await supabase!
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", photographerId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(userId: string, photographerId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const follows = getLocalSet(`follows_${userId}`);
    let isFollowing = false;
    if (follows.has(photographerId)) {
      follows.delete(photographerId);
    } else {
      follows.add(photographerId);
      isFollowing = true;
    }
    saveLocalSet(`follows_${userId}`, follows);
    return isFollowing;
  }

  const { data: existing } = await supabase!
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", photographerId)
    .maybeSingle();

  if (existing) {
    await supabase!.from("user_follows").delete().eq("follower_id", userId).eq("following_id", photographerId);
    return false; // unfollowed
  } else {
    await supabase!.from("user_follows").insert({ follower_id: userId, following_id: photographerId });
    return true; // followed
  }
}

export async function fetchFollowerCount(photographerId: string): Promise<number> {
  if (!isSupabaseConfigured) {
    // If not configured, we'll try to find their profile's follower string or return 0
    return 0; // We can leave it as 0 since mock UI already uses profile.followers
  }
  const { count } = await supabase!
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", photographerId);
  return count || 0;
}

// ============================================================
// CONTRIBUTOR INTEREST (no auth required)
// ============================================================

export async function createContributorInterest(email: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    await logActivity({ userId: `CONTRIBUTE-${email}`, type: "contribute", title: "Contributor application", desc: email });
    return true;
  }
  await logActivity({ userId: `CONTRIBUTE-${email}`, type: "contribute", title: "Contributor application", desc: email });
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
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase!
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    time: r.created_at ? new Date(r.created_at).toLocaleString() : "",
    level: r.type === "error" ? "ERROR" : r.type === "warning" ? "WARN" : "INFO",
    source: r.type === "purchase" ? "Payments" : r.type === "auth" ? "Auth" : r.type === "upload" ? "Upload" : r.type === "contribute" ? "Auth" : "System",
    message: r.desc || r.title || "",
  }));
}

// ============================================================
// ADMIN: MONTHLY GROWTH (user signups by month)
// ============================================================

export async function fetchMonthlyGrowth(): Promise<{ m: string; v: number }[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("profiles")
    .select("created_at");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("purchases")
    .select("price, date");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("photos")
    .select("category, downloads");

  if (!data || data.length === 0) return [];

  const cats: Record<string, number> = {};
  data.forEach((r: any) => {
    cats[r.category] = (cats[r.category] || 0) + (r.downloads || 0);
  });

  return Object.entries(cats)
    .map(([name, downloads]) => ({ name, downloads }))
    .sort((a, b) => b.downloads - a.downloads);
}

// ============================================================
// ADMIN: USER GROWTH PER MONTH (for chart)
// ============================================================

export async function fetchUserGrowthPerMonth(): Promise<{ m: string; v: number }[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("profiles")
    .select("created_at");

  if (!data || data.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Cumulative growth
  const sorted = data.map((r: any) => new Date(r.created_at).getTime()).sort((a, b) => a - b);
  let cumulative = 0;
  const monthlyCounts: Record<string, number> = {};

  sorted.forEach((ts) => {
    const d = new Date(ts);
    const key = monthNames[d.getMonth()] + " " + d.getFullYear();
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });

  // Build cumulative array
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
  if (!isSupabaseConfigured) return { totalRevenue: 0, totalDownloads: 0, totalViews: 0, totalLikes: 0, photoCount: 0, avgPrice: 0 };

  const { data: photos } = await supabase!
    .from("photos")
    .select("id, downloads, views, likes, price")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return { totalRevenue: 0, totalDownloads: 0, totalViews: 0, totalLikes: 0, photoCount: 0, avgPrice: 0 };

  const totalDownloads = photos.reduce((s: number, p: any) => s + (p.downloads || 0), 0);
  const totalViews = photos.reduce((s: number, p: any) => s + (p.views || 0), 0);
  const totalLikes = photos.reduce((s: number, p: any) => s + (p.likes || 0), 0);
  const avgPrice = photos.reduce((s: number, p: any) => s + (p.price || 0), 0) / photos.length;

  // Revenue from purchases where this photographer's photos were bought
  const { data: purchases } = await supabase!
    .from("purchases")
    .select("price, photo_id");

  const photoIds = new Set(photos.map((p: any) => p.id));
  const totalRevenue = (purchases || [])
    .filter((p: any) => photoIds.has(p.photo_id))
    .reduce((s: number, p: any) => s + (p.price || 0), 0);

  return { totalRevenue, totalDownloads, totalViews, totalLikes, photoCount: photos.length, avgPrice: Math.round(avgPrice) };
}

// ============================================================
// DASHBOARD: MONTHLY REVENUE FOR PHOTOGRAPHER
// ============================================================

export async function fetchPhotographerMonthlyRevenue(photographerId: string): Promise<{ m: string; v: number }[]> {
  if (!isSupabaseConfigured) return [];

  // Get photographer's photo IDs
  const { data: photos } = await supabase!
    .from("photos")
    .select("id")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  const photoIds = photos.map((p: any) => p.id);

  const { data: purchases } = await supabase!
    .from("purchases")
    .select("price, date, photo_id")
    .in("photo_id", photoIds);

  if (!purchases || purchases.length === 0) return [];

  const months: Record<string, number> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export async function fetchPhotographerWeeklyDownloads(photographerId: string): Promise<{ m: string; v: number }[]> {
  if (!isSupabaseConfigured) return [];

  const { data: photos } = await supabase!
    .from("photos")
    .select("id, downloads")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  // Approximate weekly distribution from total downloads
  const total = photos.reduce((s: number, p: any) => s + (p.downloads || 0), 0);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Distribute roughly with weekend lower
  const weights = [0.16, 0.15, 0.14, 0.15, 0.16, 0.12, 0.12];
  return days.map((d, i) => ({ m: d, v: Math.round(total * weights[i] / 7) }));
}

// ============================================================
// DASHBOARD: TOP CATEGORIES FOR PHOTOGRAPHER
// ============================================================

export async function fetchPhotographerTopCategories(photographerId: string): Promise<{ name: string; pct: string }[]> {
  if (!isSupabaseConfigured) return [];

  const { data: photos } = await supabase!
    .from("photos")
    .select("category, downloads")
    .eq("photographer_id", photographerId);

  if (!photos || photos.length === 0) return [];

  const cats: Record<string, number> = {};
  photos.forEach((r: any) => {
    cats[r.category] = (cats[r.category] || 0) + (r.downloads || 0);
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
  if (!isSupabaseConfigured) return { totalSpent: 0, totalPurchases: 0, totalLicenses: 0, recentPurchases: [] };

  const { data: purchases } = await supabase!
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  const { data: licenses } = await supabase!
    .from("licenses")
    .select("id")
    .eq("user_id", userId);

  const totalSpent = (purchases || []).reduce((s: number, p: any) => s + (p.price || 0), 0);

  return {
    totalSpent,
    totalPurchases: (purchases || []).length,
    totalLicenses: (licenses || []).length,
    recentPurchases: (purchases || []).slice(0, 5).map((r: any) => ({
      id: r.id, userId: r.user_id, photoId: r.photo_id, license: r.license, price: r.price, date: r.date,
    })),
  };
}

// ============================================================
// IMAGE OPTIMIZATION UTILITY
// ============================================================

export function getOptimizedImageUrl(url: string, width = 600): string {
  if (!url) return "";

  // Handle Unsplash image resizing
  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("w", String(width));
      // Auto format and compress
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      urlObj.searchParams.set("q", "80");
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Handle Cloudinary image resizing/compression
  if (url.includes("res.cloudinary.com")) {
    const match = url.match(/\/upload\/(v\d+\/)?/);
    if (match) {
      const insertIndex = url.indexOf(match[0]) + match[0].length;
      return url.slice(0, insertIndex) + `w_${width},c_limit,q_auto,f_auto/` + url.slice(insertIndex);
    }
  }

  return url;
}

export function getFullQualityImageUrl(url: string): string {
  if (!url) return "";

  // Handle Unsplash - strip query params to get original raw master resolution
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

  // For Cloudinary, remove any inserted optimization subpaths
  if (url.includes("res.cloudinary.com")) {
    return url.replace(/\/w_\d+,c_limit,q_auto,f_auto\//, "/");
  }

  return url;
}

// ============================================================
// PAYMENT METHODS — photographer accepted methods
// ============================================================

export interface PhotographerPaymentMethod {
  id: string;
  photographerId: string;
  method: "card" | "crypto" | "paypal";
  enabled: boolean;
  details: Record<string, unknown>;
}

// Mock fallback for payment methods
const mockPaymentMethods: Record<string, PhotographerPaymentMethod[]> = {
  "patrick-watson-quine": [
    { id: "pm-1", photographerId: "patrick-watson-quine", method: "card", enabled: true, details: {} },
    { id: "pm-2", photographerId: "patrick-watson-quine", method: "paypal", enabled: true, details: { email: "patrick@paypal.me" } },
  ],
  "lexmond-dennis": [
    { id: "pm-3", photographerId: "lexmond-dennis", method: "card", enabled: true, details: {} },
    { id: "pm-4", photographerId: "lexmond-dennis", method: "crypto", enabled: true, details: { wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78" } },
  ],
};

export async function fetchPaymentMethods(photographerId: string): Promise<PhotographerPaymentMethod[]> {
  if (!isSupabaseConfigured) return mockPaymentMethods[photographerId] || [
    { id: "pm-default", photographerId, method: "card", enabled: true, details: {} },
  ];

  const { data } = await supabase!
    .from("photographer_payment_methods")
    .select("*")
    .eq("photographer_id", photographerId);

  if (!data || data.length === 0) {
    // Return defaults if none configured
    return [
      { id: `pm-${photographerId}-card`, photographerId, method: "card", enabled: true, details: {} },
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
  method: "card" | "crypto" | "paypal",
  enabled: boolean,
  details: Record<string, unknown> = {}
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase!
    .from("photographer_payment_methods")
    .upsert(
      { photographer_id: photographerId, method, enabled, details },
      { onConflict: "photographer_id,method" }
    );

  return !error;
}

export async function fetchAllPaymentMethods(): Promise<PhotographerPaymentMethod[]> {
  if (!isSupabaseConfigured) return Object.values(mockPaymentMethods).flat();

  const { data } = await supabase!
    .from("photographer_payment_methods")
    .select("*");

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
  method: "card" | "crypto" | "paypal";
  details: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  adminNote: string;
  requestedAt: string;
  processedAt: string | null;
}

export async function createPayoutRequest(
  photographerId: string,
  amount: number,
  method: "card" | "crypto" | "paypal",
  details: Record<string, unknown> = {}
): Promise<PayoutRequest | null> {
  if (!isSupabaseConfigured) {
    return {
      id: `PR-${Date.now().toString(36)}`,
      photographerId,
      amount,
      method,
      details,
      status: "PENDING",
      adminNote: "",
      requestedAt: new Date().toISOString(),
      processedAt: null,
    };
  }

  const { data, error } = await supabase!
    .from("payout_requests")
    .insert({
      photographer_id: photographerId,
      amount,
      method,
      details,
    })
    .select()
    .single();

  if (error) { console.error("createPayoutRequest", error); return null; }

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
  if (!isSupabaseConfigured) return [];

  let query = supabase!.from("payout_requests").select("*").order("requested_at", { ascending: false });
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
  adminNote: string = ""
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase!
    .from("payout_requests")
    .update({ status, admin_note: adminNote, processed_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

// ============================================================
// PURCHASE WITH PAYMENT METHOD
// ============================================================

export async function createPurchaseWithMethod(
  userId: string,
  photoId: string,
  license: string,
  price: number,
  paymentMethod: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const id = `PUR-${Date.now().toString(36)}`;
  const { error } = await supabase!
    .from("purchases")
    .insert({
      id,
      user_id: userId,
      photo_id: photoId,
      license,
      price,
      payment_method: paymentMethod,
    });

  return !error;
}

// ============================================================
// DELETE PHOTO (admin or photographer)
// ============================================================

export async function deletePhoto(photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (error) { console.error("deletePhoto", error); return false; }
  return true;
}

// ============================================================
// UPDATE USER ROLE (admin only) — syncs slug/profile for Photographer
// ============================================================

export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) { console.error("updateUserRole", error); return false; }

  // If promoting to Photographer, ensure they have a slug and directory entry
  if (newRole === "Photographer") {
    const { data: profile } = await supabase!
      .from("profiles")
      .select("slug, name")
      .eq("id", userId)
      .single();

    if (profile && !profile.slug) {
      const slug = profile.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + "-" + userId.slice(0, 8);

      await supabase!.from("profiles").update({ slug }).eq("id", userId);

      // Also create a photographer directory entry
      const { data: existing } = await supabase!
        .from("photographers")
        .select("id")
        .eq("id", slug)
        .single();

      if (!existing) {
        await supabase!.from("photographers").insert({
          id: slug,
          name: profile.name,
          location: "",
          specialty: "",
          followers: "0",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080",
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
  if (!isSupabaseConfigured) return false;

  if (approve) {
    const { error } = await supabase!
      .from("moderation_queue")
      .delete()
      .eq("id", moderationId);
    if (error) { console.error("resolveModeration (delete)", error); return false; }
  } else {
    const { error } = await supabase!
      .from("moderation_queue")
      .update({ status: "rejected" })
      .eq("id", moderationId);
    if (error) { console.error("resolveModeration (reject)", error); return false; }
  }

  return true;
}

// ============================================================
// UPDATE BRIEF STATUS (photographer accepts a brief)
// ============================================================

export async function updateBriefStatus(briefId: string, status: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("briefs")
    .update({ status })
    .eq("id", briefId);

  if (error) { console.error("updateBriefStatus", error); return false; }
  return true;
}

// ============================================================
// UPDATE USER STATUS (admin toggles Active/Pending/Suspended)
// ============================================================

export async function updateUserStatus(userId: string, status: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase!
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) { console.error("updateUserStatus", error); return false; }
  return true;
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
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("user_follows")
    .select("follower_id, following_id")
    .eq("following_id", photographerId)
    .limit(50);

  if (!data) return [];

  // Enrich with profile names
  const followerIds = [...new Set(data.map((r: any) => r.follower_id))];
  if (followerIds.length === 0) return [];

  const { data: profiles } = await supabase!
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
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase!
    .from("user_follows")
    .select("follower_id, following_id")
    .eq("follower_id", photographerId)
    .limit(50);

  if (!data) return [];

  const followingIds = [...new Set(data.map((r: any) => r.following_id))];
  if (followingIds.length === 0) return [];

  const { data: profiles } = await supabase!
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
