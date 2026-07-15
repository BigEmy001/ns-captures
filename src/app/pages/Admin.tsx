import { useState, useCallback } from "react";
import { Link } from "react-router";
import {
  LayoutDashboard, Users, Image as ImageIcon, ShieldAlert, DollarSign, FileBarChart,
  Check, X, MoreHorizontal, Search, Filter, Trash2, Settings, Logs, Building2, UserCheck, UserX,
  Download, Eye, Edit, ChevronDown, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { Eyebrow, Badge, Button } from "../components/ui";
import { SideNav } from "../components/SideNav";
import { adminUsers, moderationQueue, getPhoto, photos, AdminUser, ModerationItem } from "../data/photos";

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

const siteSettings = {
  siteName: "NS CAPTURES",
  siteUrl: "https://ns-captures.com",
  supportEmail: "support@ns-captures.com",
  platformFee: 20,
  defaultCommission: 70,
  minPrice: 100,
  maxFileSize: 100,
  allowedLicenses: ["COMMERCIAL", "EDITORIAL", "ROYALTY FREE", "EXCLUSIVE"],
  maintenanceMode: false,
  signupEnabled: true,
  moderationRequired: true,
};

export function Admin() {
  const [active, setActive] = useState("dashboard");
  const [queue, setQueue] = useState(moderationQueue);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [logFilter, setLogFilter] = useState<string>("all");
  const [siteSettingsState, setSiteSettingsState] = useState(siteSettings);

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

  const [adminUsersList, setAdminUsersList] = useState(adminUsers);
  const [assetsList, setAssetsList] = useState(photos);

  const changeUserRole = useCallback((userId: string, newRole: AdminUser["role"]) => {
    setAdminUsersList((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    toast.success(`Role updated to ${newRole}`);
  }, []);

  const changeUserStatus = useCallback((userId: string, newStatus: AdminUser["status"]) => {
    setAdminUsersList((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    toast.success(`Status updated to ${newStatus}`);
  }, []);

  const deleteAsset = (photoId: string) => {
    if (confirm("Delete this asset permanently?")) {
      setAssetsList((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Asset deleted");
    }
  };

  const handleSettingsSave = () => {
    toast.success("Settings saved");
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
                  { label: "TOTAL USERS", value: "12,410", delta: "+3.2%" },
                  { label: "PHOTOGRAPHERS", value: "1,204", delta: "+1.8%" },
                  { label: "ASSETS", value: "84.2k", delta: "+4.1%" },
                  { label: "REVENUE (MTD)", value: "$142,000", delta: "+8.5%" },
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
                        <td className="px-6 py-4">
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
                          <button onClick={() => toast(`Managing ${u.name}`)} className="text-[#6b716d] hover:text-[#1e4a3f] p-1.5 hover:bg-[#eef1ec] rounded-full transition-all duration-200">
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
                  { label: "GROSS SALES (MTD)", value: "$142,300" },
                  { label: "PAYOUTS DUE", value: "$61,840" },
                  { label: "PLATFORM FEE", value: "$28,460" },
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
                      {[
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
                        {siteSettings.allowedLicenses.map((l) => (
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
