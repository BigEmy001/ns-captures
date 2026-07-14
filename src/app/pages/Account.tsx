import { useState } from "react";
import { Link } from "react-router";
import { Download, Heart, FolderHeart, Receipt, Settings, CreditCard, LogOut, Bell, Shield, FileText, TrendingUp, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow, Button, Badge } from "../components/ui";
import { SideNav } from "../components/SideNav";
import { currentUser, userPurchases, userCollections, getPhoto, photos, mockLicenses, mockActivity } from "../data/photos";
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
  const { user, updateProfile, changePassword, isAuthenticated } = useAuth();
  const [active, setActive] = useState("overview");
  const [profileData, setProfileData] = useState({
    name: user?.name || currentUser.name,
    email: user?.email || currentUser.email,
    company: user?.company || currentUser.company,
    role: user?.role || currentUser.role,
  });
  const [passwordData, setPasswordData] = useState({ current: "", next: "", confirm: "" });
  const liked = photos.slice(0, 6);

  const handleProfileSave = () => {
    if (isAuthenticated) {
      updateProfile(profileData);
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
              <img src={user?.avatar || currentUser.avatar} alt="" className="size-10 rounded-full object-cover ring-2 ring-[#1e4a3f]/10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name || currentUser.name}</p>
                <p className="text-xs text-[#6b716d]">{user?.plan || currentUser.plan} plan</p>
              </div>
            </div>
          )}
          footer={(collapsed) => (
            <button
              onClick={() => toast("Signed out")}
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
              src="https://images.unsplash.com/photo-1559833064-6f4573ec1ac9?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200"
              alt="Marina Midday"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 flex items-center gap-4">
              <img src={user?.avatar || currentUser.avatar} alt="" className="size-16 rounded-full object-cover border-2 border-white shadow-md" />
              <div className="text-white">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight">{user?.name || currentUser.name}</h1>
                <p className="text-xs text-white/80 font-mono tracking-wider uppercase mt-1">
                  {user?.role || currentUser.role} · {user?.company || currentUser.company}
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
                  { label: "PLAN", value: user?.plan || currentUser.plan },
                  { label: "DOWNLOADS LEFT", value: user?.downloadsLeft || currentUser.downloadsLeft },
                  { label: "COLLECTIONS", value: String(userCollections.length) },
                  { label: "MEMBER SINCE", value: user?.memberSince || currentUser.memberSince },
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

              {/* Usage Meter */}
              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl text-[#18211f]">Plan Usage This Month</h3>
                  <Badge tone="green">Active</Badge>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-[#4a534e]">Downloads used</span>
                      <span className="font-semibold text-[#18211f]">47 / {user?.plan === "Studio" ? "Unlimited" : "50"}</span>
                    </div>
                    <div className="h-2 bg-[#ececec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e4a3f] rounded-full transition-all duration-500" style={{ width: user?.plan === "Studio" ? "40%" : "94%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-[#4a534e]">Storage used</span>
                      <span className="font-semibold text-[#18211f]">2.4 GB / 10 GB</span>
                    </div>
                    <div className="h-2 bg-[#ececec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e4a3f] rounded-full transition-all duration-500" style={{ width: "24%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-[#4a534e]">Collections</span>
                      <span className="font-semibold text-[#18211f]">3 / 20</span>
                    </div>
                    <div className="h-2 bg-[#ececec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e4a3f] rounded-full transition-all duration-500" style={{ width: "15%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                <h3 className="font-serif text-xl text-[#18211f] mb-6">Profile details</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Full name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                  <Field label="Email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                  <Field label="Company" value={profileData.company} onChange={(e) => setProfileData({ ...profileData, company: e.target.value })} />
                  <Field label="Role" value={profileData.role} onChange={(e) => setProfileData({ ...profileData, role: e.target.value })} />
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleProfileSave}>Save changes</Button>
                </div>
              </div>
            </div>
          )}

          {active === "collections" && (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pt-4">
              {userCollections.map((c) => (
                <div key={c.id} className="group cursor-pointer">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="absolute inset-0 translate-x-2 -translate-y-2 rotate-2 rounded-2xl bg-[#d7d8d2] shadow-sm transition-all duration-300 group-hover:translate-x-3 group-hover:-translate-y-3 group-hover:rotate-3 overflow-hidden opacity-60">
                      <img src={c.cover[2]} alt="" className="size-full object-cover" />
                    </div>
                    <div className="absolute inset-0 translate-x-1 -translate-y-1 -rotate-1 rounded-2xl bg-[#d7d8d2] shadow-md transition-all duration-300 group-hover:translate-x-1.5 group-hover:-translate-y-1.5 group-hover:-rotate-2 overflow-hidden opacity-85">
                      <img src={c.cover[1]} alt="" className="size-full object-cover" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-[#d7d8d2] shadow-lg transition-all duration-300 group-hover:scale-[1.01] overflow-hidden">
                      <img src={c.cover[0]} alt="" className="size-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 px-1">
                    <div>
                      <h3 className="font-serif text-base text-[#18211f] font-semibold leading-tight group-hover:text-[#1e4a3f] transition-colors duration-200">{c.name}</h3>
                      <p className="mt-0.5 font-mono text-[9px] tracking-wider text-[#758078] uppercase">Curated collection</p>
                    </div>
                    <span className="font-mono text-[10px] text-[#285746] bg-[#dce8df] px-2.5 py-0.5 rounded-full font-semibold">
                      {c.count} IMAGES
                    </span>
                  </div>
                </div>
              ))}
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
                  {userPurchases.map((pur) => {
                    const p = getPhoto(pur.photoId);
                    return (
                      <tr key={pur.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={p?.image} alt="" className="size-11 object-cover rounded-lg shadow-sm" />
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
                  {mockLicenses.map((lic) => {
                    const p = getPhoto(lic.photoId);
                    return (
                      <tr key={lic.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={p?.image} alt="" className="size-11 object-cover rounded-lg shadow-sm" />
                            <Link to={`/photo/${lic.photoId}`} className="font-semibold text-[#18211f] hover:text-[#1e4a3f] hover:underline">
                              {p?.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={lic.license === "EXTENDED" ? "green" : "muted"}>{lic.license}</Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#4a534e]">{lic.id}</td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{lic.date}</td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{lic.expires}</td>
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
              {mockActivity.map((a) => {
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
                    <time className="text-xs text-[#9aa09b] font-mono shrink-0" dateTime={a.date.toISOString()}>
                      {format(a.date, "MMM d, yyyy")}
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
                  <p className="mt-1 font-serif text-2xl text-[#18211f] font-semibold">{user?.plan || currentUser.plan} · $49/mo</p>
                  <p className="mt-1 text-sm text-[#59645f]">Renews Aug 1, 2026 · Unlimited downloads</p>
                </div>
                <Link to="/pricing">
                  <Button variant="outline">Change plan</Button>
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
                      {userPurchases.map((pur) => (
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