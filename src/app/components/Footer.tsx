import { Link } from "react-router";
import { Monogram } from "./ui";
import { useAuth } from "../context/AuthContext";

const publicGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
      { to: "/search?cat=Documentary", label: "Documentary" },
      { to: "/search?cat=Architecture", label: "Architecture" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/requests", label: "Curated requests" },
      { to: "/pricing", label: "Pricing" },
      { to: "/enterprise", label: "For teams" },
      { to: "/contribute", label: "Become a contributor" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/dashboard", label: "Photographer dashboard" },
      { to: "/enterprise", label: "Enterprise portal" },
      { to: "/account", label: "My account" },
      { to: "/admin", label: "Admin console" },
    ],
  },
];

const buyerGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
      { to: "/requests", label: "Curated requests" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/account", label: "My Account" },
      { to: "/account", label: "Downloads" },
      { to: "/account", label: "Licenses" },
      { to: "/account", label: "Billing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/pricing", label: "Pricing" },
      { to: "/enterprise", label: "Upgrade to Enterprise" },
      { to: "/contribute", label: "Become a contributor" },
    ],
  },
];

const photographerGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
    ],
  },
  {
    title: "Photographer",
    links: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/dashboard", label: "Portfolio" },
      { to: "/dashboard", label: "Analytics" },
      { to: "/dashboard", label: "Payouts" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/requests", label: "Creative Briefs" },
      { to: "/pricing", label: "Licensing Rates" },
      { to: "/contribute", label: "Contributor Guide" },
    ],
  },
];

const enterpriseGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
      { to: "/requests", label: "Curated requests" },
    ],
  },
  {
    title: "Enterprise",
    links: [
      { to: "/enterprise", label: "Workspace" },
      { to: "/enterprise", label: "Team Management" },
      { to: "/enterprise", label: "Usage Reports" },
      { to: "/enterprise", label: "Billing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/pricing", label: "Pricing" },
      { to: "/contribute", label: "Become a contributor" },
    ],
  },
];

const adminGroups = [
  {
    title: "Admin",
    links: [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin", label: "Users" },
      { to: "/admin", label: "Moderation" },
      { to: "/admin", label: "Assets" },
      { to: "/admin", label: "Settings" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/search", label: "Library" },
      { to: "/admin", label: "Reports" },
      { to: "/admin", label: "System Logs" },
    ],
  },
];

function getGroupsForRole(role: string) {
  switch (role) {
    case "Buyer":
      return buyerGroups;
    case "Photographer":
      return photographerGroups;
    case "Enterprise":
      return enterpriseGroups;
    case "Admin":
      return adminGroups;
    default:
      return publicGroups;
  }
}

export function Footer() {
  const { user } = useAuth();
  const groups = getGroupsForRole(user?.role || "Guest");

  return (
    <footer className="bg-[#182e27] px-5 py-14 text-[#f4f1e9] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Monogram light />
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/60">
              A better visual commons for the ideas moving culture forward.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/45">{g.title.toUpperCase()}</p>
              <ul className="mt-4 grid gap-2.5 text-sm text-white/75">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.14em]">© 2026 NS CAPTURES</p>
          <p className="text-xs">Photography licensed via Unsplash contributors.</p>
        </div>
      </div>
    </footer>
  );
}