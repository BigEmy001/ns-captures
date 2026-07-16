import { useState, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
  LayoutDashboard, Users, Image as ImageIcon, ShieldAlert, DollarSign, FileBarChart,
  Check, X, MoreHorizontal, Search, Filter, Trash2, Settings, Logs, Building2, UserCheck, UserX,
  Download, Eye, Edit, ChevronDown, ArrowUpRight, Mail, Key, FolderHeart, Heart, LogOut,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { Eyebrow, Badge, Button } from "../components/ui";
import { SideNav } from "../components/SideNav";
import { useAuth } from "../context/AuthContext";
import { adminUsers as fallbackAdminUsers, moderationQueue as fallbackModerationQueue, getPhoto, photos as fallbackPhotos, type AdminUser, type ModerationItem } from "../data/photos";
import { fetchAdminUsers, fetchModerationQueue, fetchPhotos, fetchSiteSettings, updateSiteSettings, fetchAllPayouts, fetchAllPurchases, fetchPlatformStats, type SiteSettingsRow, type Payout, type Purchase } from "../data/db";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "moderation", label: "Moderation", icon: ShieldAlert },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "logs", label: "System Logs", icon: Logs },
  { id: "settings", label: "Settings", icon: Settings },
];

const growth = [
  { m: "Jan", v: 4200 }, { m: "Feb", v: 5100 }, { m: "Mar", v: 6400 },
  { m: "Apr", v: 7200 }, { m: "May", v: 9100 }, { m: "Jun", v: 10800 }, { m: "Jul", v: 12400 },
];

const revenueGrowth = [
  { m: "Jan", v: 42000 }, { m: "Feb", v: 58000 }, { m: "Mar", v: 72000 },
  { m: "Apr", v: 89000 }, { m: "May", v: 112000 }, { m: "Jun", v: 138000 }, { m: "Jul", v: 142000 },
];

const statusTone = (s: AdminUser["status"]) =>
  s === "Active" ? "green" : s === "Suspended" ? "red" : "muted";

const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#12231f]/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="font-mono text-[9px] tracking-wider text-white/50">{label}</p>
        <p className="mt-1 font-serif text-sm font-semibold">
          {prefix}{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const mockLogs = [
  { id: "LOG-001", time: "2026-07-13 08:23", level: "INFO", source: "Auth", message: "User login: amara@mainlandstudio.co" },
  { id: "LOG-002", time: "2026-07-13 08:15", level: "INFO", source: "Payments", message: "Stripe webhook: payment_intent.succeeded for INV-2041" },
  { id: "LOG-003", time: "2026-07-13 07:45", level: "WARN", source: "Moderation", message: "Asset M-302 flagged for keyword review" },
  { id: "LOG-004", time: "2026-07-13 07:30", level: "ERROR", source: "Storage", message: "CDN cache purge failed for asset generated-1506744038136-46273834b3fb" },
  { id: "LOG-005", time: "2026-07-13 06:55", level: "INFO", source: "Auth", message: "Password reset requested: divine@studio.ng" },
  { id: "LOG-006", time: "2026-07-13 06:12", level: "INFO", source: "Upload", message: "New asset uploaded: bloom-study-no-12 by Namnso Ukpanah" },
  { id: "LOG-007", time: "2026-07-13 05:40", level: "INFO", source: "Payments", message: "Payout processed: PAY-9041 to Namnso Ukpanah Studios ($3,600)" },
  { id: "LOG-008", time: "2026-07-13 04:20", level: "WARN", source: "RateLimit", message: "IP 192.168.1.45 exceeded API rate limit" },
  { id: "LOG-009", time: "2026-07-13 03:55", level: "INFO", source: "Auth", message: "New signup: user@agency.com (Buyer)" },
  { id: "LOG-010", time: "2026-07-13 02:10", level: "INFO", source: "Cron", message: "Daily analytics aggregation completed" },
];

const logLevelColor = (level: string) =>
  level === "ERROR" ? "text-[#d4183d] bg-[#fcf1f3]" : level === "WARN" ? "text-[#e67e22] bg-[#fef3e2]" : "text-[#1e7a4f] bg-[#eef7f0]";

const defaultSiteSettings: SiteSettingsRow = {
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

export function Admin() {
  const { logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const active = nav.some((item) => item.id === requestedTab) ? requestedTab! : "dashboard";
  const setActive = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "dashboard") next.delete("tab");
    else next.set("tab", id);
    setParams(next);
  };

  // Supabase data
  const [queue, setQueue] = useState(fallbackModerationQueue);
  const [adminUsersList, setAdminUsersList] = useState(fallbackAdminUsers);
  const [assetsList, setAssetsList] = useState(fallbackPhotos);
  const [siteSettingsState, setSiteSettingsState] = useState<SiteSettingsRow>(defaultSiteSettings);
  const [adminPayouts, setAdminPayouts] = useState<Payout[]>([]);
  const [adminPurchases, setAdminPurchases] = useState<Purchase[]>([]);
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [platformStats, setPlatformStats] = useState({ totalUsers: 0, photographers: 0, assets: 0, revenue: 0 });

  useEffect(() => {
    fetchModerationQueue().then(setQueue);
    fetchAdminUsers().then(setAdminUsersList);
    fetchPhotos().then(setAssetsList);
    fetchSiteSettings().then(setSiteSettingsState);
    fetchAllPayouts().then(setAdminPayouts);
    fetchAllPurchases().then(setAdminPurchases);
    fetchPlatformStats().then((s) => { setPlatformRevenue(s.revenue); setPlatformStats(s); });
  }, []);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [logFilter, setLogFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const changeUserRole = useCallback((userId: string, newRole: AdminUser["role"]) => {
    setAdminUsersList((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    toast.success(`Role updated to ${newRole}`);
  }, []);

  const changeUserStatus = useCallback((userId: string, newStatus: AdminUser["status"]) => {
    setAdminUsersList((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    toast.success(`Status updated to ${newStatus}`);
  }, []);

  const deleteAsset = useCallback((photoId: string) => {
    if (confirm("Delete this asset permanently?")) {
      setAssetsList((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Asset deleted");
    }
  }, []);

  const handleRoleChange = useCallback((userId: string, newRole: AdminUser["role"]) => {
    changeUserRole(userId, newRole);
    setSelectedUser((prev) => prev && prev.id === userId ? { ...prev, role: newRole } : prev);
  }, [changeUserRole]);

  const handleStatusChange = useCallback((userId: string, newStatus: AdminUser["status"]) => {
    changeUserStatus(userId, newStatus);
    setSelectedUser((prev) => prev && prev.id === userId ? { ...prev, status: newStatus } : prev);
  }, [changeUserStatus]);

  const handleDeleteUserAsset = useCallback((photoId: string) => {
    deleteAsset(photoId);
  }, [deleteAsset]);

  const resolve = (id: string, approve: boolean) => {
    setQueue((q) => q.filter((m) => m.id !== id));
    toast[approve ? "success" : "error"](approve ? "Asset approved" : "Asset rejected");
  };

  const filteredUsers = adminUsersList.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === "all" || u.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredAssets = assetsList.filter((p) =>
    p.title.toLowerCase().includes(assetSearch.toLowerCase()) ||
    p.photographer.toLowerCase().includes(assetSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const filteredLogs = logFilter === "all"
    ? mockLogs
    : mockLogs.filter((l) => l.level === logFilter);

  const handleSettingsSave = async () => {
    const ok = await updateSiteSettings(siteSettingsState);
    if (ok) {
      toast.success("Settings saved to database");
    } else {
      toast.success("Settings saved");
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
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center bg-[#1e4a3f] font-mono text-xs text-white rounded-full">NS</span>
              <div>
                <p className="text-sm font-semibold">Admin</p>
                <p className="text-xs text-[#6b716d]">Operations</p>
              </div>
            </div>
          )}
          footer={(collapsed) => (
            <button
              onClick={logout}
              className={`flex w-full items-center rounded-lg py-2.5 text-sm transition text-[#d4183d] hover:bg-[#fcf1f3] ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className="size-[18px] shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          )}
        />

        <div className="min-w-0 flex-1">
          <Eyebrow>ADMIN CONSOLE</Eyebrow>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">Platform operations</h1>

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

          {/* Dashboard */}
          {active === "dashboard" && (
            <div className="mt-8 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "TOTAL USERS", value: platformStats.totalUsers.toLocaleString(), delta: "+3.2%" },
                  { label: "PHOTOGRAPHERS", value: platformStats.photographers.toLocaleString(), delta: "+1.8%" },
                  { label: "ASSETS", value: platformStats.assets.toLocaleString(), delta: "+4.1%" },
                  { label: "REVENUE (MTD)", value: `$${platformRevenue.toLocaleString()}`, delta: "+8.5%" },
                ].map((s) => (
                  <div key={s.label} className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm ns-lift hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300">
                    <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{s.label}</p>
                    <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">{s.value}</p>
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#dce8df] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1e7a4f]">
                        <ArrowUpRight className="size-3" /> {s.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="font-serif text-lg text-[#18211f]">User growth</h3>
                    <Badge>2026</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={growth}>
                      <defs>
                        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1e4a3f" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#1e4a3f" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1e4a3f", strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="v" stroke="#1e4a3f" strokeWidth={2.5} fill="url(#ag)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                  <h3 className="mb-4 font-serif text-lg text-[#18211f]">Revenue MTD</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={revenueGrowth}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1e4a3f" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#1e4a3f" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip prefix="$" />} cursor={{ stroke: "#1e4a3f" }} />
                      <Area type="monotone" dataKey="v" stroke="#1e4a3f" strokeWidth={2.5} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                  <h3 className="mb-4 font-serif text-lg text-[#18211f]">Top categories by downloads</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={[
                      { name: "Portrait", downloads: 4200 },
                      { name: "Architecture", downloads: 3100 },
                      { name: "Fashion", downloads: 2400 },
                      { name: "Lifestyle", downloads: 1800 },
                      { name: "Documentary", downloads: 1200 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="downloads" fill="#1e4a3f" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                  <h3 className="mb-4 font-serif text-lg text-[#18211f]">Pending moderation</h3>
                  {queue.length === 0 ? (
                    <p className="text-sm text-[#6b716d]">Queue is clear.</p>
                  ) : (
                    <p className="text-sm text-[#6b716d]">
                      {queue.length} items awaiting review —{" "}
                      <button onClick={() => setActive("moderation")} className="font-semibold text-[#1e4a3f] hover:underline">
                        go to queue
                      </button>
                    </p>
                  )}
                  <div className="mt-4 space-y-2">
                    {queue.slice(0, 3).map((m) => {
                      const p = getPhoto(m.photoId);
                      return (
                        <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                          <div className="flex items-center gap-3">
                            <img src={p?.image} alt="" className="size-10 object-cover rounded-lg" />
                            <div>
                              <p className="font-medium text-sm text-[#18211f] truncate max-w-[200px]">{p?.title}</p>
                              <p className="text-xs text-[#6b716d]">By {m.photographer}</p>
                            </div>
                          </div>
                          <Badge tone="muted" size="sm">{m.reason}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {active === "users" && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6b716d]" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10 pr-4 py-2 border border-[#ececec] rounded-xl bg-white text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 w-64"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="border border-[#ececec] rounded-xl bg-white px-4 py-2 text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
                  >
                    <option value="all">All Roles</option>
                    <option value="Buyer">Buyer</option>
                    <option value="Photographer">Photographer</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="border border-[#ececec] rounded-xl bg-white px-4 py-2 text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <span className="text-sm text-[#6b716d] font-mono">{filteredUsers.length} users</span>
              </div>
              <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]/60">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4 cursor-pointer hover:underline" onClick={() => setSelectedUser(u)}>
                          <p className="font-semibold text-[#18211f]">{u.name}</p>
                          <p className="text-xs text-[#6b716d]">{u.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => changeUserRole(u.id, e.target.value as AdminUser["role"])}
                            className="border border-[#ececec] rounded-lg bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1e4a3f] font-mono text-xs"
                          >
                            <option value="Buyer">Buyer</option>
                            <option value="Photographer">Photographer</option>
                            <option value="Enterprise">Enterprise</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={u.status}
                            onChange={(e) => changeUserStatus(u.id, e.target.value as AdminUser["status"])}
                            className="border border-[#ececec] rounded-lg bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1e4a3f]"
                          >
                            <option value="Active">Active</option>
                            <option value="Pending">Pending</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-[#6b716d] text-xs">{u.joined}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedUser(u)} className="text-[#6b716d] hover:text-[#1e4a3f] p-1.5 hover:bg-[#eef1ec] rounded-full transition-all duration-200" title="Manage user">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Moderation */}
          {active === "moderation" && (
            <div className="mt-8 space-y-4">
              {queue.length === 0 ? (
                <div className="border border-dashed border-[#ececec] rounded-2xl py-20 text-center bg-white">
                  <p className="font-serif text-2xl text-[#18211f]">Queue is clear.</p>
                  <p className="mt-2 text-sm text-[#6b716d]">All submissions have been reviewed.</p>
                </div>
              ) : (
                queue.map((m) => {
                  const p = getPhoto(m.photoId);
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col md:flex-row items-start md:items-center gap-6 border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/20 transition-all duration-300"
                    >
                      <div className="relative group shrink-0 overflow-hidden rounded-xl shadow-sm">
                        <img src={p?.image} alt="" className="size-20 md:size-24 object-cover group-hover:scale-105 transition-all duration-300" />
                        <div className="absolute top-1.5 left-1.5">
                          <span className="bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {p?.license}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-serif text-lg text-[#18211f] font-medium leading-snug">{p?.title}</h3>
                          <span className="font-mono text-[9px] text-[#1e4a3f] bg-[#dce8df] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                            {p?.category}
                          </span>
                        </div>
                        <p className="text-sm text-[#4a534e]">By <span className="font-semibold text-[#18211f]">{m.photographer}</span></p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6d746e]">
                          <span>Reason: <span className="text-[#18211f] font-medium">{m.reason}</span></span>
                          <span className="hidden sm:inline text-[#d6d4cc]">•</span>
                          <span>Submitted {m.submitted}</span>
                        </div>
                        {p && (
                          <div className="flex gap-2 pt-1 font-mono text-[9px] text-[#758078]">
                            <span>{p.camera}</span>
                            <span>•</span>
                            <span>{p.lens}</span>
                            <span>•</span>
                            <span>ISO {p.iso}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 w-full md:w-auto pt-4 md:pt-0 border-t border-[#f2f2f2] md:border-t-0 justify-end">
                        <button
                          onClick={() => resolve(m.id, true)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#1e4a3f] hover:bg-[#123b31] px-5 py-2.5 text-sm font-semibold text-white rounded-full transition-all duration-200 hover:-translate-y-0.5 ns-shadow-sm"
                        >
                          <Check className="size-4" /> Approve
                        </button>
                        <button
                          onClick={() => resolve(m.id, false)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 border border-[#ececec] bg-white hover:border-[#1e4a3f] hover:text-[#1e4a3f] px-5 py-2.5 text-sm font-semibold text-[#4a534e] rounded-full transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <X className="size-4" /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Assets */}
          {active === "assets" && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6b716d]" />
                  <input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search assets..."
                    className="pl-10 pr-4 py-2 border border-[#ececec] rounded-xl bg-white text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 w-full"
                  />
                </div>
                <span className="text-sm text-[#6b716d] font-mono">{filteredAssets.length} assets</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredAssets.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden bg-[#d7d8d2] rounded-xl shadow-sm ns-lift">
                    <Link to={`/photo/${p.id}`}>
                      <img src={p.image} alt="" className="aspect-square w-full object-cover group-hover:scale-105 transition-all duration-300" />
                    </Link>
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                      <span className="text-xs text-white font-serif">{p.title}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast("Viewing asset details"); }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-[#18211f] rounded-full hover:bg-white transition shadow"
                        title="View"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteAsset(p.id); }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-[#d4183d] rounded-full hover:bg-white transition shadow"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-black/55 backdrop-blur-sm text-[8px] font-mono font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {p.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          {active === "payments" && (
            <div className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { label: "GROSS SALES (MTD)", value: `$${platformRevenue.toLocaleString()}` },
                  { label: "PAYOUTS DUE", value: `$${adminPayouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0).toLocaleString()}` },
                  { label: "PLATFORM FEE", value: `$${Math.round(platformRevenue * (siteSettingsState.platformFee / 100)).toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm ns-lift hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300">
                    <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{s.label}</p>
                    <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                <h3 className="mb-4 font-serif text-lg text-[#18211f]">Recent payouts</h3>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-wider text-[#8a8f89] uppercase border-b border-[#ececec]">
                      <tr>
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Photographer</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec]/60 font-mono text-xs">
                      {adminPayouts.length > 0 ? adminPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF9F5] transition duration-150">
                          <td className="px-6 py-4 font-semibold text-[#18211f]">{p.id}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.date}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.photographerId}</td>
                          <td className="px-6 py-4 text-[#18211f] font-semibold">${p.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className="bg-[#dce8df] text-[#1e7a4f] px-2 py-0.5 rounded-full font-bold text-[9px]">{p.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-[#6b716d]">{p.method}</td>
                        </tr>
                      )) : [
                        { id: "PAY-9043", date: "Jul 16, 2026", photographer: "Lexmond Dennis", amount: "$240", status: "PENDING", method: "Zenith Bank" },
                        { id: "PAY-9042", date: "Jul 16, 2026", photographer: "Patrick Watson Quine", amount: "$150", status: "PENDING", method: "Zenith Bank" },
                        { id: "PAY-9041", date: "Jul 01, 2026", photographer: "Namnso Ukpanah", amount: "$3,600", status: "SUCCESSFUL", method: "Zenith Bank" },
                        { id: "PAY-8038", date: "Jun 01, 2026", photographer: "Divine Effiong", amount: "$2,850", status: "SUCCESSFUL", method: "Zenith Bank" },
                        { id: "PAY-7033", date: "May 01, 2026", photographer: "Prince Akachi", amount: "$3,120", status: "SUCCESSFUL", method: "Access Bank" },
                        { id: "PAY-6021", date: "Apr 01, 2026", photographer: "Godfred Kwakye", amount: "$1,950", status: "SUCCESSFUL", method: "GTBank" },
                      ].map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF9F5] transition duration-150">
                          <td className="px-6 py-4 font-semibold text-[#18211f]">{p.id}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.date}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.photographer}</td>
                          <td className="px-6 py-4 text-[#18211f] font-semibold">{p.amount}</td>
                          <td className="px-6 py-4">
                            <span className="bg-[#dce8df] text-[#1e7a4f] px-2 py-0.5 rounded-full font-bold text-[9px]">{p.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-[#6b716d]">{p.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reports */}
          {active === "reports" && (
            <div className="mt-8 space-y-3">
              {[
                { name: "Monthly revenue report", desc: "Complete revenue breakdown by license type, photographer, and region" },
                { name: "Contributor payout summary", desc: "All photographer payouts with tax documentation" },
                { name: "License usage audit", desc: "Track how licensed assets are being used across platforms" },
                { name: "Content moderation log", desc: "Full audit trail of all moderation decisions" },
              ].map((r) => (
                <div key={r.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-[#ececec]/80 bg-white rounded-xl p-5 ns-shadow-sm hover:border-[#1e4a3f]/20 transition-all duration-200">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#18211f] mb-3 sm:mb-0">
                    <FileBarChart className="size-5 text-[#1e4a3f]" />
                    <div>
                      <p>{r.name}</p>
                      <p className="text-xs text-[#6b716d] font-normal">{r.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => toast.success("Report exported")} className="text-sm font-semibold text-[#1e4a3f] hover:underline">
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* System Logs */}
          {active === "logs" && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-3">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="border border-[#ececec] rounded-xl bg-white px-4 py-2 text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
                  >
                    <option value="all">All Levels</option>
                    <option value="INFO">Info</option>
                    <option value="WARN">Warning</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
                <span className="text-sm text-[#6b716d] font-mono">{filteredLogs.length} entries</span>
              </div>
              <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase border-b border-[#ececec]">
                    <tr>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Level</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]/60 font-mono text-xs">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF9F5] transition-all duration-150">
                        <td className="px-6 py-4 text-[#6b716d]">{log.time}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${logLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#4a534e]">{log.source}</td>
                        <td className="px-6 py-4 text-[#18211f]">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings */}
          {active === "settings" && (
            <div className="mt-8 space-y-6 max-w-3xl">
              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                <h3 className="font-serif text-lg text-[#18211f] mb-6">General</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Site Name" value={siteSettingsState.siteName} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, siteName: e.target.value })} />
                  <Field label="Site URL" value={siteSettingsState.siteUrl} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, siteUrl: e.target.value })} />
                  <Field label="Support Email" value={siteSettingsState.supportEmail} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, supportEmail: e.target.value })} />
                  <Field label="Platform Fee (%)" type="number" value={String(siteSettingsState.platformFee)} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, platformFee: Number(e.target.value) })} />
                </div>
              </div>

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                <h3 className="font-serif text-lg text-[#18211f] mb-6">Licensing & Pricing</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Default Commission (%)" type="number" value={String(siteSettingsState.defaultCommission)} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, defaultCommission: Number(e.target.value) })} />
                  <Field label="Minimum Price ($)" type="number" value={String(siteSettingsState.minPrice)} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, minPrice: Number(e.target.value) })} />
                  <Field label="Max File Size (MB)" type="number" value={String(siteSettingsState.maxFileSize)} onChange={(e) => setSiteSettingsState({ ...siteSettingsState, maxFileSize: Number(e.target.value) })} />
                  <div className="space-y-2">
                    <label className="block">
                      <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">Allowed Licenses</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["COMMERCIAL", "EDITORIAL", "ROYALTY FREE", "EXCLUSIVE"].map((l) => (
                          <Badge key={l} tone="muted" className="cursor-pointer hover:tone-green transition-colors">{l}</Badge>
                        ))}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                <h3 className="font-serif text-lg text-[#18211f] mb-6">Feature Toggles</h3>
                <div className="space-y-4">
                  <Toggle label="Maintenance Mode" description="Disable public access (admins only)" checked={siteSettingsState.maintenanceMode} onChange={(v) => setSiteSettingsState({ ...siteSettingsState, maintenanceMode: v })} />
                  <Toggle label="User Signup Enabled" description="Allow new user registrations" checked={siteSettingsState.signupEnabled} onChange={(v) => setSiteSettingsState({ ...siteSettingsState, signupEnabled: v })} />
                  <Toggle label="Moderation Required" description="All new assets require approval" checked={siteSettingsState.moderationRequired} onChange={(v) => setSiteSettingsState({ ...siteSettingsState, moderationRequired: v })} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSettingsSave}>Save Settings</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {selectedUser && (
        <AdminUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
          assets={assetsList}
          onDeleteAsset={handleDeleteUserAsset}
        />
      )}
    </div>
  );
}

function Field({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
      />
    </label>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="font-semibold text-[#18211f]">{label}</p>
        <p className="text-xs text-[#6b716d]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-[#1e4a3f]" : "bg-[#ececec]"}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

interface AdminUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onRoleChange: (userId: string, newRole: AdminUser["role"]) => void;
  onStatusChange: (userId: string, newStatus: AdminUser["status"]) => void;
  assets: Photo[];
  onDeleteAsset: (photoId: string) => void;
}

function AdminUserModal({ user, onClose, onRoleChange, onStatusChange, assets, onDeleteAsset }: AdminUserModalProps) {
  const isPhotographer = user.role === "Photographer";
  
  // Robustly query photographer photos using ID, name, or slug match
  const userPhotos = assets.filter((p) =>
    p.photographerId === user.id ||
    p.photographer.toLowerCase() === user.name.toLowerCase() ||
    p.photographerId === user.name.toLowerCase().replace(/\s+/g, "-") ||
    p.photographerId === user.name.toLowerCase().split(" ")[0]
  );

  const totalDownloads = userPhotos.reduce((sum, p) => sum + p.downloads, 0);
  const totalViews = userPhotos.reduce((sum, p) => sum + p.views, 0);
  const totalLikes = userPhotos.reduce((sum, p) => sum + p.likes, 0);

  const planName = user.role === "Enterprise" ? "Enterprise" : user.role === "Buyer" ? "Pro" : "Contributor";
  const isBuyerOrEnterprise = user.role === "Buyer" || user.role === "Enterprise";

  const userPurchasesMock = user.id === "U-1042" ? [
    { id: "INV-2041", title: "Light on Lagos", photoId: "lagos-skyline", license: "COMMERCIAL", price: 190, date: "Jul 09, 2026" },
    { id: "INV-2038", title: "The in-between", photoId: "smiling-black-top", license: "EXTENDED", price: 768, date: "Jul 02, 2026" },
    { id: "INV-2033", title: "Ceremony", photoId: "orange-headdress", license: "EDITORIAL", price: 476, date: "Jun 21, 2026" },
  ] : [
    { id: "INV-1092", title: "Sands of Time", photoId: "desert-road", license: "ROYALTY FREE", price: 210, date: "Jun 12, 2026" },
    { id: "INV-1087", title: "Grid, monochrome", photoId: "lagos-bw-skyline", license: "EDITORIAL", price: 250, date: "May 28, 2026" },
  ];

  const userCollectionsMock = [
    { id: "c1", name: "Modern Minimalist", count: 8 },
    { id: "c2", name: "Warm Portraits", count: 14 },
  ];

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-end bg-[#16231f]/55 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="h-full w-full max-w-2xl bg-[#FAF9F5] p-6 shadow-2xl overflow-y-auto flex flex-col md:p-8 border-l border-[#ececec]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#ececec] pb-6">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-[#dce8df] text-lg font-semibold text-[#1e4a3f]">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-2xl font-semibold text-[#18211f]">{user.name}</h2>
                <Badge tone={user.status === "Active" ? "green" : user.status === "Suspended" ? "red" : "muted"}>
                  {user.status}
                </Badge>
              </div>
              <p className="text-sm text-[#6b716d]">{user.email}</p>
              <p className="mt-1 font-mono text-[9px] tracking-wider text-[#9aa09b] uppercase">
                Member Since {user.joined} · ID: {user.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#ececec] p-1.5 text-[#55605b] hover:bg-[#eef1ec] transition-colors cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        {/* Quick Settings */}
        <div className="mt-6 border-b border-[#ececec] pb-6">
          <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase mb-3">Management Settings</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[#4a534e]">Platform Role</span>
              <select
                value={user.role}
                onChange={(e) => onRoleChange(user.id, e.target.value as AdminUser["role"])}
                className="mt-1.5 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1e4a3f] font-mono text-xs shadow-sm"
              >
                <option value="Buyer">Buyer</option>
                <option value="Photographer">Photographer</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#4a534e]">Account Status</span>
              <select
                value={user.status}
                onChange={(e) => onStatusChange(user.id, e.target.value as AdminUser["status"])}
                className="mt-1.5 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1e4a3f] shadow-sm"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button 
              onClick={() => toast.success(`Password reset link sent to ${user.email}`)}
              className="flex items-center gap-1.5 rounded-full border border-[#ececec] bg-white px-4 py-2 text-xs font-semibold text-[#4a534e] hover:border-[#1e4a3f] transition-all shadow-sm cursor-pointer"
            >
              <Key className="size-3.5" /> Reset Password
            </button>
            <button 
              onClick={() => toast.success(`Contact panel opened for ${user.name}`)}
              className="flex items-center gap-1.5 rounded-full border border-[#ececec] bg-white px-4 py-2 text-xs font-semibold text-[#4a534e] hover:border-[#1e4a3f] transition-all shadow-sm cursor-pointer"
            >
              <Mail className="size-3.5" /> Email User
            </button>
          </div>
        </div>

        {/* Tab content settings */}
        <div className="mt-6 flex-1 flex flex-col">
          {isPhotographer && (
            <div className="flex-1 flex flex-col">
              {/* Stats */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 bg-white border border-[#ececec] rounded-2xl p-4 shadow-sm mb-6">
                <div>
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Uploads</p>
                  <p className="mt-1.5 font-serif text-xl font-semibold text-[#18211f]">{userPhotos.length}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Total Views</p>
                  <p className="mt-1.5 font-serif text-xl font-semibold text-[#18211f]">{totalViews.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Downloads</p>
                  <p className="mt-1.5 font-serif text-xl font-semibold text-[#18211f]">{totalDownloads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Likes</p>
                  <p className="mt-1.5 font-serif text-xl font-semibold text-[#18211f]">{totalLikes.toLocaleString()}</p>
                </div>
              </div>

              {/* Photos Portfolio Grid */}
              <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase mb-3">Portfolio ({userPhotos.length} Images)</p>
              {userPhotos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#ececec] rounded-2xl p-8 bg-white text-center">
                  <ImageIcon className="size-8 text-[#9aa09b] mb-2" />
                  <p className="text-sm font-semibold text-[#18211f]">No uploads yet</p>
                  <p className="text-xs text-[#6b716d] mt-1">This contributor has not uploaded any assets to the library.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {userPhotos.map((photo) => (
                    <div key={photo.id} className="group relative overflow-hidden bg-[#d7d8d2] rounded-xl aspect-square shadow-sm">
                      <img src={photo.image} alt={photo.title} className="size-full object-cover group-hover:scale-105 transition-all duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                        <p className="text-[10px] font-serif text-white truncate font-medium">{photo.title}</p>
                        <p className="text-[8px] font-mono text-white/70 mt-0.5 uppercase tracking-wide truncate">
                          {photo.category} · {photo.license}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[8px] font-mono text-white/80">
                          <span className="flex items-center gap-0.5"><Eye className="size-2" /> {photo.views}</span>
                          <span className="flex items-center gap-0.5"><Download className="size-2" /> {photo.downloads}</span>
                        </div>
                      </div>
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteAsset(photo.id); }}
                          className="p-1 rounded-full bg-white/95 text-[#d4183d] hover:bg-white shadow cursor-pointer"
                          title="Delete photo"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isBuyerOrEnterprise && (
            <div className="flex-1 flex flex-col space-y-6">
              {/* Billing tier */}
              <div className="bg-white border border-[#ececec] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Active Plan</p>
                    <h4 className="font-serif text-lg font-semibold text-[#18211f] mt-1">{planName} Tier</h4>
                    <p className="text-xs text-[#6b716d] mt-0.5">Billing renews automatically each month</p>
                  </div>
                  <Badge tone="green">Active</Badge>
                </div>
              </div>

              {/* Purchase history */}
              <div>
                <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase mb-2">Invoice Purchase History</p>
                <div className="overflow-hidden border border-[#ececec] bg-white rounded-2xl shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f7f7f7] font-mono text-[9px] tracking-wider text-[#8a8f89] uppercase border-b border-[#ececec]">
                      <tr>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">License</th>
                        <th className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec]/60">
                      {userPurchasesMock.map((pur) => (
                        <tr key={pur.id} className="hover:bg-[#FAF9F5] transition duration-150">
                          <td className="px-4 py-3 font-semibold text-[#18211f]">{pur.id}</td>
                          <td className="px-4 py-3 text-[#6b716d] max-w-[120px] truncate" title={pur.title}>{pur.title}</td>
                          <td className="px-4 py-3"><Badge tone="muted" size="sm">{pur.license}</Badge></td>
                          <td className="px-4 py-3 text-right font-semibold text-[#18211f]">${pur.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collections */}
              <div>
                <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase mb-2">Active Collections ({userCollectionsMock.length})</p>
                <div className="grid gap-3 grid-cols-2">
                  {userCollectionsMock.map((c) => (
                    <div key={c.id} className="border border-[#ececec] bg-white p-4 rounded-xl shadow-sm hover:border-[#1e4a3f]/20 transition-all">
                      <div className="flex items-center gap-2">
                        <FolderHeart className="size-4 text-[#1e4a3f]" />
                        <h5 className="font-serif font-semibold text-sm text-[#18211f] truncate" title={c.name}>{c.name}</h5>
                      </div>
                      <p className="mt-1 font-mono text-[9px] text-[#758078] uppercase">{c.count} items curated</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isPhotographer && !isBuyerOrEnterprise && (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#ececec] rounded-2xl p-8 bg-white text-center">
              <ShieldAlert className="size-8 text-[#1e4a3f] mb-2" />
              <p className="text-sm font-semibold text-[#18211f]">{user.role} Dashboard</p>
              <p className="text-xs text-[#6b716d] mt-1">This user has the administrative role and does not have shopper or photographer metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
