import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Download, Heart, FolderHeart, Receipt, Settings, CreditCard, LogOut, Bell, Shield, FileText, TrendingUp, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow, Button, Badge } from "../components/ui";
import { SideNav } from "../components/SideNav";
import { fetchPhoto, fetchPurchases, fetchLicenses, fetchActivity, fetchUserPurchaseStats, fetchUserSavedPhotoIds, type Purchase, type LicenseRecord, type ActivityLogItem } from "../data/db";
import type { Photo } from "../data/db";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

const nav = [
  { id: "overview", label: "Overview", icon: Settings },
  { id: "collections", label: "Collections", icon: FolderHeart },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "licenses", label: "Licenses", icon: FileText },
  { id: "activity", label: "Activity", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export function Account() {
  const { user, updateProfile, changePassword, isAuthenticated, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const active = nav.some((item) => item.id === requestedTab) ? requestedTab! : "overview";
  const setActive = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next);
  };
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    company: user?.company || "",
  });
  const [passwordData, setPasswordData] = useState({ current: "", next: "", confirm: "" });

  // Fetch photos for purchases/licenses
  const [purchasePhotos, setPurchasePhotos] = useState<Record<string, Photo>>({});
  const [licensePhotos, setLicensePhotos] = useState<Record<string, Photo>>({});

  // Real data from DB
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [purchaseStats, setPurchaseStats] = useState({ totalSpent: 0, totalPurchases: 0, totalLicenses: 0, recentPurchases: [] });
  const [savedPhotoIds, setSavedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      fetchPurchases(user.id).catch(() => {}),
      fetchLicenses(user.id).catch(() => {}),
      fetchActivity(user.id).catch(() => {}),
    ]).then(([purchases, licenses, activity]) => {
      if (purchases) setPurchases(purchases);
      if (licenses) setLicenses(licenses);
      if (activity) setActivity(activity);
    });

    fetchUserPurchaseStats(user.id).then(setPurchaseStats).catch(() => {});
    fetchUserSavedPhotoIds(user.id).then(setSavedPhotoIds).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const allPhotoIds = new Set([
      ...purchases.map((p) => p.photoId),
      ...licenses.map((l) => l.photoId),
      ...savedPhotoIds,
    ]);
    allPhotoIds.forEach(async (id) => {
      try {
        const photo = await fetchPhoto(id);
        if (photo) {
          setPurchasePhotos((prev) => ({ ...prev, [id]: photo }));
          setLicensePhotos((prev) => ({ ...prev, [id]: photo }));
        }
      } catch {}
    });
  }, [purchases, licenses, savedPhotoIds]);

  const handleProfileSave = async () => {
    if (isAuthenticated) {
      try {
        await updateProfile(profileData);
      } catch (err: any) {
        toast.error(err.message || "Failed to update profile");
      }
    } else {
      toast.success("Profile saved");
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

  return (
    <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-8 px-5 sm:px-8 lg:px-12">
        <SideNav
          items={nav}
          active={active}
          onSelect={setActive}
          header={() => (
            <div className="flex min-w-0 items-center gap-3">
              <img src={user?.avatar || ""} alt="" loading="lazy" className="size-10 rounded-full object-cover ring-2 ring-[#1e4a3f]/10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name || "User"}</p>
                <p className="text-xs text-[#6b716d]">{user?.plan || "Starter"} plan</p>
              </div>
            </div>
          )}
          footer={(collapsed) => (
            <button
              onClick={() => { logout(); toast.success("Signed out"); }}
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

          {/* Profile Header Cover */}
          <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-8 shadow-sm border border-[#ececec]/80">
            <img
              src={user?.avatar || ""}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 flex items-center gap-4">
              <img src={user?.avatar || ""} alt="" loading="lazy" className="size-16 rounded-full object-cover border-2 border-white shadow-md" />
              <div className="text-white">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight">{user?.name || "User"}</h1>
                <p className="text-xs text-white/80 font-mono tracking-wider uppercase mt-1">
                  {user?.role || "Buyer"} · {user?.company || ""}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {nav.map((n) => (
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

          {active === "overview" && (
            <div className="space-y-8">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "PLAN", value: user?.plan || "Starter" },
                  { label: "PURCHASES", value: String(purchaseStats.totalPurchases) },
                  { label: "SAVED ITEMS", value: String(savedPhotoIds.length) },
                  { label: "MEMBER SINCE", value: user?.memberSince || "—" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm ns-lift hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300"
                  >
                    <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{s.label}</p>
                    <p className="mt-2 font-serif text-2xl text-[#18211f] font-medium">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Usage Meter - removed, not applicable for per-photo marketplace */}

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                <h3 className="font-serif text-xl text-[#18211f] mb-6">Profile details</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Full name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                  <Field label="Email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                  <Field label="Company" value={profileData.company} onChange={(e) => setProfileData({ ...profileData, company: e.target.value })} />
                   <div className="block">
                     <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">Role</span>
                     <p className="mt-2 rounded-xl border border-[#ececec] bg-[#f7f7f7] px-4 py-3 text-sm text-[#6b716d]">
                       {user?.role || "Buyer"}
                     </p>
                   </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleProfileSave}>Save changes</Button>
                </div>
              </div>
            </div>
          )}

          {active === "collections" && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-[#6b716d]">Saved items and collections appear here.</p>
              {savedPhotoIds.length === 0 ? (
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-8 ns-shadow-sm text-center">
                  <FolderHeart className="size-10 text-[#9aa09b] mx-auto mb-3" />
                  <p className="font-serif text-lg text-[#18211f]">No saved items yet</p>
                  <p className="mt-1 text-sm text-[#6b716d]">Browse photos and save them to your collections.</p>
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
                        <img src={purchasePhotos[id].image} alt="" loading="lazy" className="size-full object-cover" />
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
            <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                  <tr>
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">License</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececec]/60">
                  {purchases.map((pur) => {
                    const p = purchasePhotos[pur.photoId];
                    return (
                      <tr key={pur.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={p?.image} alt="" loading="lazy" className="size-11 object-cover rounded-lg shadow-sm" />
                            <Link to={`/photo/${pur.photoId}`} className="font-semibold text-[#18211f] hover:text-[#1e4a3f] hover:underline">
                              {p?.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone="muted">{pur.license}</Badge>
                        </td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{pur.date}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toast.success("Download started")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4a3f] bg-[#dce8df]/60 hover:bg-[#dce8df] px-3.5 py-1.5 rounded-full transition-all duration-200"
                          >
                            <Download className="size-3.5" /> Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {active === "licenses" && (
            <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase border-b border-[#ececec]">
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
                  {licenses.map((lic) => {
                    const p = licensePhotos[lic.photoId];
                    return (
                      <tr key={lic.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={p?.image} alt="" loading="lazy" className="size-11 object-cover rounded-lg shadow-sm" />
                            <Link to={`/photo/${lic.photoId}`} className="font-semibold text-[#18211f] hover:text-[#1e4a3f] hover:underline">
                              {p?.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={lic.licenseType === "EXTENDED" ? "green" : "muted"}>{lic.licenseType}</Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#4a534e]">{lic.id}</td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{lic.purchasedAt ? new Date(lic.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : ""}</td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{lic.expiresAt}</td>
                        <td className="px-6 py-4 text-[#18211f] font-mono text-sm">{lic.downloads}</td>
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
            </div>
          )}

          {active === "activity" && (
            <div className="space-y-3">
              {activity.map((a) => {
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
                    className="flex items-start gap-4 border border-[#ececec]/80 bg-white rounded-2xl p-5 ns-shadow-sm hover:border-[#1e4a3f]/20 transition-all duration-300"
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
              })}
            </div>
          )}

          {active === "security" && (
            <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm">
              <h3 className="font-serif text-xl text-[#18211f] mb-6">Security & Password</h3>
              <div className="max-w-md space-y-6">
                <div className="border border-[#ececec] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#18211f]">Two-Factor Authentication</p>
                      <p className="text-xs text-[#6b716d]">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                </div>
                <div className="border border-[#ececec] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#18211f]">Passkeys</p>
                      <p className="text-xs text-[#6b716d]">Sign in with Face ID / Touch ID</p>
                    </div>
                    <Button variant="outline" size="sm">Add passkey</Button>
                  </div>
                </div>
                <hr className="border-[#ececec]" />
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <h4 className="font-semibold text-[#18211f]">Change Password</h4>
                  <Field label="Current password" type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} />
                  <Field label="New password" type="password" value={passwordData.next} onChange={(e) => setPasswordData({ ...passwordData, next: e.target.value })} />
                  <Field label="Confirm new password" type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
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

          {active === "billing" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-6 border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/20 transition-all duration-200">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">Current Plan</p>
                  <p className="mt-1 font-serif text-2xl text-[#18211f] font-semibold">{user?.plan || "Starter"} — Pay per photo</p>
                  <p className="mt-1 text-sm text-[#59645f]">No active subscription · Purchased {purchaseStats.totalPurchases} photo{purchaseStats.totalPurchases !== 1 ? "s" : ""} · Total spent ${purchaseStats.totalSpent.toFixed(2)}</p>
                </div>
                <Link to="/pricing">
                  <Button variant="outline">Browse pricing</Button>
                </Link>
              </div>
              <div>
                <div className="mb-4">
                  <Eyebrow>INVOICES</Eyebrow>
                </div>
                <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase border-b border-[#ececec]">
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
                          <td className="px-6 py-4 text-[#18211f]">${pur.price}</td>
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
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{label}</span>
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
