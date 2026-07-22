import { useState, useEffect } from "react";

import {
  Activity,
  Download,
  Heart,
  FolderHeart,
  Receipt,
  Settings,
  CreditCard,
  LogOut,
  Bell,
  FileText,
  TrendingUp,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  Wallet,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Eyebrow, Button, Badge } from "../components/ui";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { GlobalVerificationModal } from "../components/GlobalVerificationModal";
import { CreatorTabs } from "./account/CreatorTabs";
import { SideNav } from "../components/SideNav";
import {
  fetchPurchases,
  fetchLicenses,
  fetchActivity,
  fetchUserPurchaseStats,
  fetchUserSavedPhotoIds,
  fetchPhotosByIds,
  type Purchase,
  type LicenseRecord,
  type ActivityLogItem,
  getOptimizedImageUrl,
  getFullQualityImageUrl,
} from "../data/db";
import type { Photo } from "../data/db";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

const nav = [
  { id: "dashboard", label: "Home", icon: Activity, isCreator: true },
  { id: "collections", label: "Collections", icon: FolderHeart },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "licenses", label: "Licenses", icon: FileText },
  { id: "portfolio", label: "Portfolio", icon: ImageIcon, isCreator: true },
  { id: "payouts", label: "Payouts", icon: Wallet, isCreator: true },
  { id: "security", label: "Settings", icon: Settings },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export function Account() {
  const { user, updateProfile, changePassword, isAuthenticated, logout, upgradeToCreator } =
    useAuth();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const isPendingVerification =
    user?.role === "Photographer" && user?.verificationStatus === "pending";
  const isRejectedVerification =
    user?.role === "Photographer" && user?.verificationStatus === "rejected";
  const defaultTab =
    user?.role === "Photographer" || user?.role === "Admin"
      ? isPendingVerification || isRejectedVerification
        ? "security"
        : "dashboard"
      : "security";
  const active = (() => {
    if (!requestedTab) return defaultTab;
    const navItem = nav.find((item) => item.id === requestedTab);
    if (!navItem) return defaultTab;
    if (navItem.isCreator && user?.role !== "Photographer" && user?.role !== "Admin")
      return defaultTab;
    return requestedTab;
  })();
  const setActive = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === defaultTab) next.delete("tab");
    else next.set("tab", id);
    setParams(next);
  };

  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [active]);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    company: user?.company || "",
    location: user?.location || "",
    bio: user?.bio || "",
  });
  const [passwordData, setPasswordData] = useState({ current: "", next: "", confirm: "" });
  const [settingsTab, setSettingsTab] = useState<"profile" | "verification" | "security">(
    "profile",
  );

  // Fetch photos for purchases/licenses
  const [purchasePhotos, setPurchasePhotos] = useState<Record<string, Photo>>({});
  const [licensePhotos, setLicensePhotos] = useState<Record<string, Photo>>({});

  // Real data from DB
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [purchaseStats, setPurchaseStats] = useState({
    totalSpent: 0,
    totalPurchases: 0,
    totalLicenses: 0,
    recentPurchases: [],
  });
  const [savedPhotoIds, setSavedPhotoIds] = useState<string[]>([]);
  const [phone, setPhone] = useState(user?.phone || "");
  const [occupation, setOccupation] = useState(user?.occupation || "");
  const [dob, setDob] = useState(user?.dob || "");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    user?.socialLinks || { instagram: "", twitter: "", linkedin: "", website: "" },
  );
  const [references, setReferences] = useState<
    { name: string; email: string; phone: string; relationship: string }[]
  >(user?.references || []);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      fetchPurchases(user.id).catch(() => {
        toast.error("An error occurred");
        return null;
      }),
      fetchLicenses(user.id).catch(() => {
        toast.error("An error occurred");
        return null;
      }),
      fetchActivity(user.id).catch(() => {
        toast.error("An error occurred");
        return null;
      }),
    ]).then(([purchases, licenses, activity]) => {
      if (purchases) setPurchases(purchases);
      if (licenses) setLicenses(licenses);
      if (activity) setActivity(activity);
    });

    fetchUserPurchaseStats(user.id)
      .then(setPurchaseStats)
      .catch(() => {
        toast.error("An error occurred");
        return null;
      });
    fetchUserSavedPhotoIds(user.id)
      .then(setSavedPhotoIds)
      .catch(() => {
        toast.error("An error occurred");
        return null;
      });
  }, [user?.id]);

  useEffect(() => {
    const fetchAllData = async () => {
      const allPhotoIds = Array.from(
        new Set([
          ...purchases.map((p) => p.photoId),
          ...licenses.map((l) => l.photoId),
          ...savedPhotoIds,
        ]),
      );

      if (allPhotoIds.length === 0) return;

      try {
        const photos = await fetchPhotosByIds(allPhotoIds);
        const photoMap = photos.reduce(
          (acc, photo) => {
            acc[photo.id] = photo;
            return acc;
          },
          {} as Record<string, Photo>,
        );

        setPurchasePhotos(photoMap);
        setLicensePhotos(photoMap);
      } catch (e) {
        console.error("Failed to batch fetch photos", e);
      }
    };

    fetchAllData();
  }, [purchases, licenses, savedPhotoIds]);

  const handleProfileSave = async () => {
    if (isAuthenticated) {
      try {
        await updateProfile({
          name: profileData.name,
          email: profileData.email,
          company: profileData.company,
          location: profileData.location,
          bio: profileData.bio,
          phone,
          occupation,
          dob,
          socialLinks,
          references,
        });
        toast.success("Profile saved");
      } catch {
        toast.error("Failed to save profile");
      }
    }
  };

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Upload configuration missing.");
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        await updateProfile({ avatar: data.secure_url });
        toast.success("Profile picture updated");
      } else {
        toast.error("Failed to upload image");
      }
    } catch {
      toast.error("Upload error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.next !== passwordData.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordData.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      if (isAuthenticated) {
        await changePassword(passwordData.current, passwordData.next);
      } else {
        toast.success("Password changed");
      }
      setPasswordData({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
  };

  if (!user) return null;

  return (
    <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-8 px-5 sm:px-8 lg:px-12">
        <SideNav
          items={nav.filter(
            (n) =>
              !n.isCreator ||
              user?.role === "Admin" ||
              (user?.role === "Photographer" && user?.verificationStatus === "verified"),
          )}
          active={active}
          onSelect={setActive}
          header={() => (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10 shrink-0 ring-2 ring-[#1e4a3f]/10">
                <AvatarImage
                  src={user?.avatar ? getOptimizedImageUrl(user.avatar, 80) : ""}
                  alt=""
                  loading="lazy"
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#1e4a3f] text-white font-serif text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name || "User"}</p>
                <p className="text-xs text-[#6b716d] capitalize">{user?.role || "Buyer"}</p>
              </div>
            </div>
          )}
          footer={(collapsed) => (
            <button
              onClick={() => {
                logout();
              }}
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center rounded-lg py-2.5 text-sm text-[#4a534e] transition hover:bg-[#eef1ec] ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}
            >
              <LogOut className="size-[18px] shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <Eyebrow>MY ACCOUNT</Eyebrow>
          </div>

          {/* Profile Header Cover — always on mobile, dashboard only on desktop */}
          <div
            className={`relative h-28 w-full rounded-2xl overflow-hidden mb-8 ns-shadow-sm ${active !== "dashboard" ? "sm:hidden" : ""}`}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover opacity-40 blur-md scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1e4a3f] to-[#2a5e4f]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 flex items-center gap-4">
              <div className="relative group size-14 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white">
                <Avatar className="w-full h-full object-cover">
                  <AvatarImage src={user?.avatar || ""} alt="" loading="lazy" />
                  <AvatarFallback className="bg-[#e7ebe2] text-[#1e4a3f] font-mono text-lg">
                    {user?.name?.slice(0, 2).toUpperCase() || "NS"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {isUploadingAvatar ? (
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              <div className="text-white">
                <h1 className="font-serif text-xl sm:text-2xl font-semibold leading-tight">
                  {user?.name || "User"}
                </h1>
                <p className="text-xs text-white/70 font-medium tracking-wide mt-0.5">
                  {user?.role || "Buyer"}
                  {user?.company ? ` · ${user.company}` : ""}
                </p>
              </div>
            </div>
          </div>

          {user?.role === "Buyer" && (
            <div className="mb-6 bg-gradient-to-r from-[#1e4a3f] to-[#2a5e4f] rounded-2xl p-6 sm:p-8 ns-shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <h3 className="font-serif text-xl text-white mb-1">Become a Contributor</h3>
                <p className="text-sm text-white/70 max-w-md">
                  Upload photos, manage your portfolio, and earn revenue from licenses.
                </p>
              </div>
              <button
                onClick={upgradeToCreator}
                className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#1e4a3f] transition hover:bg-white/90"
              >
                Start Selling
              </button>
            </div>
          )}

          {isPendingVerification && (
            <div className="mb-6 bg-gradient-to-r from-[#fff8e6] to-[#fef3cd] rounded-2xl p-6 sm:p-8 ns-shadow-sm border border-[#b38600]/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="grid size-10 place-items-center rounded-full bg-[#b38600]/10 flex-shrink-0">
                  <Clock className="size-5 text-[#b38600]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-[#18211f] mb-1">
                    Verification In Progress
                  </h3>
                  <p className="text-sm text-[#59645f]">
                    Your documents are being reviewed. Dashboard access (portfolio, payouts,
                    uploads) will unlock once approved.
                  </p>
                </div>
                <button
                  onClick={() => setActive("security")}
                  className="shrink-0 rounded-full bg-[#1e4a3f] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#123b31]"
                >
                  View Status
                </button>
              </div>
            </div>
          )}

          {isRejectedVerification && (
            <div className="mb-6 bg-gradient-to-r from-[#fff0f0] to-[#fde8e8] rounded-2xl p-6 sm:p-8 ns-shadow-sm border border-[#e63946]/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="grid size-10 place-items-center rounded-full bg-[#e63946]/10 flex-shrink-0">
                  <AlertCircle className="size-5 text-[#e63946]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-[#18211f] mb-1">
                    Verification Needs Attention
                  </h3>
                  <p className="text-sm text-[#59645f]">
                    Your previous verification was not approved. Please review the feedback and
                    resubmit.
                  </p>
                </div>
                <button
                  onClick={() => setActive("security")}
                  className="shrink-0 rounded-full bg-[#e63946] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#c1303d]"
                >
                  Resubmit
                </button>
              </div>
            </div>
          )}

          {/* Mobile nav */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {nav
              .filter(
                (n) =>
                  !n.isCreator ||
                  user?.role === "Admin" ||
                  (user?.role === "Photographer" && user?.verificationStatus === "verified"),
              )
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    active === n.id
                      ? "border-[#1e4a3f] bg-[#1e4a3f] text-white"
                      : "border-[#ececec] bg-white text-[#6b716d]"
                  }`}
                >
                  {n.label}
                </button>
              ))}
          </div>

          {active === "collections" && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-[#6b716d]">Saved items and collections appear here.</p>
              {savedPhotoIds.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 ns-shadow-sm text-center">
                  <FolderHeart className="size-10 text-[#9aa09b] mx-auto mb-3" />
                  <p className="font-serif text-lg text-[#18211f]">No saved items yet</p>
                  <p className="mt-1 text-sm text-[#6b716d]">
                    Browse photos and save them to your collections.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {savedPhotoIds.map((id) => (
                    <Link
                      key={id}
                      to={`/photo/${id}`}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-[#ececec] ns-shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {purchasePhotos[id]?.image ? (
                        <img
                          src={getOptimizedImageUrl(purchasePhotos[id].image, 400)}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-[#9aa09b]">
                          <Heart className="size-6" />
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {active === "downloads" && (
            <div className="overflow-hidden bg-white rounded-2xl ns-shadow-sm">
              {purchases.length === 0 ? (
                <div className="p-8 text-center">
                  <Download className="size-10 text-[#9aa09b] mx-auto mb-3" />
                  <p className="font-serif text-lg text-[#18211f]">No downloads yet</p>
                  <p className="mt-1 text-sm text-[#6b716d]">
                    Purchased photos will appear here for download.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[#f7f7f7] font-mono text-[11px] tracking-[0.1em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">License</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Downloads</th>
                      <th className="px-6 py-4 text-right">Views</th>
                      <th className="px-6 py-4 text-right">Likes</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]/60">
                    {purchases
                      .filter((pur) => pur.photoId)
                      .map((pur) => {
                        const p = purchasePhotos[pur.photoId];
                        return (
                          <tr
                            key={pur.id}
                            className="hover:bg-[#FAF9F5] transition-all duration-150"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getOptimizedImageUrl(p?.image || "", 100)}
                                  alt=""
                                  loading="lazy"
                                  className="size-11 object-cover rounded-lg shadow-sm"
                                />
                                <Link
                                  to={`/photo/${pur.photoId}`}
                                  className="font-semibold text-[#18211f] hover:text-[#1e4a3f] hover:underline"
                                >
                                  {p?.title}
                                </Link>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge tone="muted">{pur.license}</Badge>
                            </td>
                            <td className="px-6 py-4 text-[#6b716d] text-xs">{pur.date}</td>
                            <td className="px-6 py-4 text-right text-xs font-mono text-[#18211f]">
                              {p
                                ? Math.max(
                                    p.downloads || 0,
                                    p.customDownloads || 0,
                                  ).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-mono text-[#18211f]">
                              {p
                                ? Math.max(p.views || 0, p.customViews || 0).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-mono text-[#18211f]">
                              {p
                                ? Math.max(p.likes || 0, p.customLikes || 0).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {pur.status === "APPROVED" ? (
                                <button
                                  onClick={() => {
                                    if (p?.image) {
                                      const a = document.createElement("a");
                                      a.href = getFullQualityImageUrl(p.image);
                                      a.download = `NS-CAPTURES-${p.id}.jpg`;
                                      a.target = "_blank";
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      toast.success("Download started");
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4a3f] bg-[#dce8df]/60 hover:bg-[#dce8df] px-3.5 py-1.5 rounded-full transition-all duration-200"
                                >
                                  <Download className="size-3.5" /> Download
                                </button>
                              ) : pur.status === "REJECTED" ? (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                  Rejected
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                                  Pending Verification
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "licenses" && (
            <div className="overflow-hidden bg-white rounded-2xl ns-shadow-sm">
              {licenses.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="size-10 text-[#9aa09b] mx-auto mb-3" />
                  <p className="font-serif text-lg text-[#18211f]">No licenses yet</p>
                  <p className="mt-1 text-sm text-[#6b716d]">
                    Licenses for purchased photos will appear here.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f7f7f7] font-mono text-[11px] tracking-[0.1em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                    <tr>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">License</th>
                      <th className="px-6 py-4">License ID</th>
                      <th className="px-6 py-4">Purchased</th>
                      <th className="px-6 py-4">Expires</th>
                      <th className="px-6 py-4">Downloads</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]/60">
                    {licenses
                      .filter((lic) => lic.photoId)
                      .map((lic) => {
                        const p = licensePhotos[lic.photoId];
                        return (
                          <tr
                            key={lic.id}
                            className="hover:bg-[#FAF9F5] transition-all duration-150"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getOptimizedImageUrl(p?.image || "", 100)}
                                  alt=""
                                  loading="lazy"
                                  className="size-11 object-cover rounded-lg shadow-sm"
                                />
                                <Link
                                  to={`/photo/${lic.photoId}`}
                                  className="font-semibold text-[#18211f] hover:text-[#1e4a3f] hover:underline"
                                >
                                  {p?.title}
                                </Link>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge tone={lic.licenseType === "EXTENDED" ? "green" : "muted"}>
                                {lic.licenseType}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-[#4a534e]">{lic.id}</td>
                            <td className="px-6 py-4 text-[#6b716d] text-xs">
                              {lic.purchasedAt
                                ? new Date(lic.purchasedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                    year: "numeric",
                                  })
                                : ""}
                            </td>
                            <td className="px-6 py-4 text-[#6b716d] text-xs">{lic.expiresAt}</td>
                            <td className="px-6 py-4 text-[#18211f] font-mono text-sm">
                              {lic.downloads}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => toast.success("License certificate downloaded")}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4a3f] bg-[#dce8df]/60 hover:bg-[#dce8df] px-3.5 py-1.5 rounded-full transition-all duration-200"
                              >
                                <FileText className="size-3.5" /> Certificate
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "activity" && (
            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 ns-shadow-sm text-center">
                  <Bell className="size-10 text-[#9aa09b] mx-auto mb-3" />
                  <p className="font-serif text-lg text-[#18211f]">No activity yet</p>
                  <p className="mt-1 text-sm text-[#6b716d]">
                    Your recent actions will appear here.
                  </p>
                </div>
              ) : (
                activity.map((a) => {
                  const iconMap = {
                    download: <Download className="size-5 text-[#1e4a3f]" />,
                    purchase: <TrendingUp className="size-5 text-[#1e4a3f]" />,
                    collection: <FolderHeart className="size-5 text-[#1e4a3f]" />,
                    like: <Heart className="size-5 text-[#d4183d]" />,
                    login: <AlertCircle className="size-5 text-[#d4183d]" />,
                    plan: <CreditCard className="size-5 text-[#1e4a3f]" />,
                  };
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-4 bg-white rounded-2xl p-5 ns-shadow-sm transition-all duration-300"
                    >
                      <div className="flex-shrink-0 grid size-10 place-items-center rounded-xl bg-[#f5f5f5]">
                        {iconMap[a.type as keyof typeof iconMap]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#18211f]">{a.title}</p>
                        <p className="mt-0.5 text-xs text-[#6b716d]">{a.desc}</p>
                      </div>
                      <time className="text-xs text-[#9aa09b] font-mono shrink-0">
                        {a.createdAt ? format(new Date(a.createdAt), "MMM d, yyyy") : ""}
                      </time>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {active === "security" && (
            <div>
              {/* Settings sub-tabs */}
              <div className="flex gap-1 border-b border-[#ececec] mb-6">
                {[
                  { id: "profile" as const, label: "Profile" },
                  { id: "verification" as const, label: "Verification" },
                  { id: "security" as const, label: "Security" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSettingsTab(t.id)}
                    className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                      settingsTab === t.id
                        ? "border-[#1e4a3f] text-[#1e4a3f]"
                        : "border-transparent text-[#6b716d] hover:text-[#18211f]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Profile */}
              {settingsTab === "profile" && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm transition-all duration-300">
                  <h3 className="font-serif text-xl text-[#18211f] mb-6">Profile details</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                    <Field
                      label="Email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                    <Field
                      label="Company"
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                    />
                    <div className="block">
                      <span className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                        Location
                      </span>
                      <select
                        value={profileData.location}
                        onChange={(e) =>
                          setProfileData({ ...profileData, location: e.target.value })
                        }
                        className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition duration-200 focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                      >
                        <option value="">Select location</option>
                        <optgroup label="Africa">
                          <option value="Lagos, Nigeria">Lagos, Nigeria</option>
                          <option value="Abuja, Nigeria">Abuja, Nigeria</option>
                          <option value="Nairobi, Kenya">Nairobi, Kenya</option>
                          <option value="Accra, Ghana">Accra, Ghana</option>
                          <option value="Cape Town, South Africa">Cape Town, South Africa</option>
                          <option value="Johannesburg, South Africa">
                            Johannesburg, South Africa
                          </option>
                          <option value="Cairo, Egypt">Cairo, Egypt</option>
                          <option value="Addis Ababa, Ethiopia">Addis Ababa, Ethiopia</option>
                          <option value="Dar es Salaam, Tanzania">Dar es Salaam, Tanzania</option>
                          <option value="Kigali, Rwanda">Kigali, Rwanda</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="London, UK">London, UK</option>
                          <option value="Paris, France">Paris, France</option>
                          <option value="Berlin, Germany">Berlin, Germany</option>
                          <option value="Amsterdam, Netherlands">Amsterdam, Netherlands</option>
                          <option value="Barcelona, Spain">Barcelona, Spain</option>
                          <option value="Rome, Italy">Rome, Italy</option>
                          <option value="Lisbon, Portugal">Lisbon, Portugal</option>
                          <option value="Istanbul, Turkey">Istanbul, Turkey</option>
                        </optgroup>
                        <optgroup label="North America">
                          <option value="New York, USA">New York, USA</option>
                          <option value="Los Angeles, USA">Los Angeles, USA</option>
                          <option value="Chicago, USA">Chicago, USA</option>
                          <option value="Toronto, Canada">Toronto, Canada</option>
                          <option value="Vancouver, Canada">Vancouver, Canada</option>
                          <option value="Mexico City, Mexico">Mexico City, Mexico</option>
                        </optgroup>
                        <optgroup label="South America">
                          <option value="São Paulo, Brazil">São Paulo, Brazil</option>
                          <option value="Buenos Aires, Argentina">Buenos Aires, Argentina</option>
                          <option value="Bogotá, Colombia">Bogotá, Colombia</option>
                        </optgroup>
                        <optgroup label="Asia">
                          <option value="Tokyo, Japan">Tokyo, Japan</option>
                          <option value="Seoul, South Korea">Seoul, South Korea</option>
                          <option value="Bangkok, Thailand">Bangkok, Thailand</option>
                          <option value="Mumbai, India">Mumbai, India</option>
                          <option value="Dubai, UAE">Dubai, UAE</option>
                          <option value="Singapore">Singapore</option>
                          <option value="Hong Kong">Hong Kong</option>
                        </optgroup>
                        <optgroup label="Oceania">
                          <option value="Sydney, Australia">Sydney, Australia</option>
                          <option value="Melbourne, Australia">Melbourne, Australia</option>
                          <option value="Auckland, New Zealand">Auckland, New Zealand</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="block">
                      <span className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                        Role
                      </span>
                      <p className="mt-2 rounded-xl border border-[#ececec] bg-[#f7f7f7] px-4 py-3 text-sm text-[#6b716d]">
                        {user?.role || "Buyer"}
                      </p>
                    </div>
                    <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Field
                      label="Occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                    />
                    <Field
                      label="Date of Birth"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                  <div className="mt-6">
                    <h4 className="text-[13px] font-medium text-[#758078] uppercase tracking-wide mb-3">
                      Social Profiles
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {["instagram", "twitter", "linkedin", "website"].map((platform) => (
                        <label key={platform} className="block">
                          <span className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                            {platform}
                          </span>
                          <input
                            type="text"
                            placeholder={
                              platform === "website" ? "https://your-site.com" : `@${platform}`
                            }
                            value={socialLinks[platform] || ""}
                            onChange={(e) =>
                              setSocialLinks((prev) => ({ ...prev, [platform]: e.target.value }))
                            }
                            className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition duration-200 focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <span className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                      Bio
                    </span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Tell visitors about your work and style..."
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition duration-200 focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm resize-none"
                    />
                    <p className="mt-1 text-xs text-[#8a8f89]">{profileData.bio.length}/500</p>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                        References
                      </h4>
                      <button
                        onClick={() =>
                          setReferences((prev) => [
                            ...prev,
                            { name: "", email: "", phone: "", relationship: "" },
                          ])
                        }
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1e4a3f] hover:text-[#123b31] transition-colors"
                      >
                        <Plus className="size-4" /> Add
                      </button>
                    </div>
                    {references.length === 0 ? (
                      <p className="text-sm text-[#6b716d]">No references added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {references.map((ref, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 p-4 rounded-xl bg-[#f8f9f7] group"
                          >
                            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e7ebe2] text-[#1e4a3f] font-serif text-sm font-semibold">
                              {ref.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                placeholder="Full name"
                                value={ref.name}
                                onChange={(e) => {
                                  const next = [...references];
                                  next[i] = { ...next[i], name: e.target.value };
                                  setReferences(next);
                                }}
                                className="block w-full bg-transparent text-sm font-semibold text-[#18211f] placeholder-[#b0b5b1] outline-none border-b border-transparent focus:border-[#1e4a3f]/20 transition pb-0.5"
                              />
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="email"
                                  placeholder="email@example.com"
                                  value={ref.email}
                                  onChange={(e) => {
                                    const next = [...references];
                                    next[i] = { ...next[i], email: e.target.value };
                                    setReferences(next);
                                  }}
                                  className="block w-full bg-transparent text-xs text-[#6b716d] placeholder-[#b0b5b1] outline-none border-b border-transparent focus:border-[#1e4a3f]/20 transition pb-0.5"
                                />
                                <input
                                  type="text"
                                  placeholder="Relationship"
                                  value={ref.relationship}
                                  onChange={(e) => {
                                    const next = [...references];
                                    next[i] = { ...next[i], relationship: e.target.value };
                                    setReferences(next);
                                  }}
                                  className="block w-32 shrink-0 bg-transparent text-xs text-[#6b716d] placeholder-[#b0b5b1] outline-none border-b border-transparent focus:border-[#1e4a3f]/20 transition pb-0.5"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setReferences((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="shrink-0 p-1.5 text-[#b91c1c]/40 hover:text-[#b91c1c] hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove reference"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={handleProfileSave}>Save changes</Button>
                  </div>
                </div>
              )}

              {/* Verification */}
              {settingsTab === "verification" && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm">
                  <h3 className="font-serif text-xl text-[#18211f] mb-6">Identity Verification</h3>
                  <div className="max-w-md space-y-4">
                    <div className="bg-[#f7f7f7] rounded-xl p-4 border border-[#ececec]">
                      <div className="flex items-start gap-3">
                        <ShieldCheck
                          className={`size-6 shrink-0 mt-0.5 ${
                            user?.verificationStatus === "verified"
                              ? "text-green-600"
                              : user?.verificationStatus === "pending"
                                ? "text-amber-500"
                                : user?.verificationStatus === "rejected"
                                  ? "text-red-500"
                                  : "text-[#6b716d]"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-[#18211f]">Account Status</p>
                          <p className="text-sm mt-1 mb-3 text-[#6b716d]">
                            {user?.verificationStatus === "verified"
                              ? "Your identity is verified. You have full access to photographer features."
                              : user?.verificationStatus === "pending"
                                ? "Your verification is currently under review by our team."
                                : user?.verificationStatus === "rejected"
                                  ? "Your previous verification was rejected. Please submit a clearer document."
                                  : "You must verify your identity before you can withdraw earnings or publish public collections."}
                          </p>
                          {user?.verificationStatus !== "verified" &&
                            user?.verificationStatus !== "pending" && (
                              <Button
                                onClick={() => setIsVerificationModalOpen(true)}
                                className="bg-[#1e4a3f] text-white hover:bg-[#123b31] rounded-full text-xs py-1 h-8"
                              >
                                Verify Identity
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {settingsTab === "security" && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm">
                  <h3 className="font-serif text-xl text-[#18211f] mb-6">Security & Password</h3>
                  <div className="max-w-md space-y-6">
                    <div className="border border-[#ececec] rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#18211f]">Two-Factor Authentication</p>
                          <p className="text-xs text-[#6b716d]">Add an extra layer of security</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable
                        </Button>
                      </div>
                    </div>
                    <div className="border border-[#ececec] rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#18211f]">Passkeys</p>
                          <p className="text-xs text-[#6b716d]">Sign in with Face ID / Touch ID</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Add passkey
                        </Button>
                      </div>
                    </div>
                    <hr className="border-[#ececec]" />
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <h4 className="font-semibold text-[#18211f]">Change Password</h4>
                      <Field
                        label="Current password"
                        type="password"
                        value={passwordData.current}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, current: e.target.value })
                        }
                      />
                      <Field
                        label="New password"
                        type="password"
                        value={passwordData.next}
                        onChange={(e) => setPasswordData({ ...passwordData, next: e.target.value })}
                      />
                      <Field
                        label="Confirm new password"
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirm: e.target.value })
                        }
                      />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-[#1e4a3f] py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31]"
                      >
                        Update password
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === "billing" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-6 bg-white rounded-2xl p-6 ns-shadow-sm transition-all duration-200">
                <div>
                  <p className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
                    Account Summary
                  </p>
                  <p className="mt-1 font-serif text-2xl text-[#18211f] font-semibold">
                    Pay-per-license
                  </p>
                  <p className="mt-1 text-sm text-[#59645f]">
                    Purchased {purchaseStats.totalPurchases} photo
                    {purchaseStats.totalPurchases !== 1 ? "s" : ""} · Total spent £
                    {purchaseStats.totalSpent.toFixed(2)}
                  </p>
                </div>
                <Link to="/">
                  <Button variant="outline">Browse Gallery</Button>
                </Link>
              </div>
              <div>
                <div className="mb-4">
                  <Eyebrow>INVOICES</Eyebrow>
                </div>
                <div className="overflow-hidden bg-white rounded-2xl ns-shadow-sm">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-[#f7f7f7] font-mono text-[11px] tracking-[0.1em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                      <tr>
                        <th className="px-6 py-4">Invoice</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec]/60">
                      {purchases.map((pur) => (
                        <tr key={pur.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                          <td className="px-6 py-4 font-semibold text-[#18211f]">{pur.id}</td>
                          <td className="px-6 py-4 text-[#6b716d] text-xs">{pur.date}</td>
                          <td className="px-6 py-4 text-[#18211f]">£{pur.price}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toast("Receipt downloaded")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4a3f] bg-[#dce8df]/60 hover:bg-[#dce8df] px-3.5 py-1.5 rounded-full transition-all duration-200"
                            >
                              <Receipt className="size-3.5" /> Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {["dashboard", "portfolio", "payouts"].includes(active) && (
            <CreatorTabs active={active} />
          )}
        </div>
      </div>

      <GlobalVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[#758078] uppercase tracking-wide">
        {label}
      </span>
      <div className="relative mt-2">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          className="w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition duration-200 focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa09b] hover:text-[#333935]"
            tabIndex={-1}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}
