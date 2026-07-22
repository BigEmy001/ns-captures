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
      { to: "/pricing", label: "Licensing" },
      { to: "/enterprise", label: "For teams" },
      { to: "/contribute", label: "Become a contributor" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact & Support" },
      { to: "/dashboard", label: "Photographer Portal" },
      { to: "/enterprise", label: "Enterprise Portal" },
      { to: "/legal", label: "Legal & Terms" },
    ],
  },
];

const buyerGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/account", label: "My Account" },
      { to: "/account?tab=downloads", label: "Downloads" },
      { to: "/account?tab=licenses", label: "Licenses" },
      { to: "/account?tab=billing", label: "Billing" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact & Support" },
      { to: "/contribute", label: "Become a contributor" },
      { to: "/legal", label: "Legal & Terms" },
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
      { to: "/account?tab=dashboard", label: "Dashboard" },
      { to: "/account?tab=portfolio", label: "My Portfolio" },
      { to: "/account?tab=analytics", label: "Analytics" },
      { to: "/account?tab=payouts", label: "Payouts" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact & Support" },
      { to: "/pricing", label: "Licensing Rates" },
      { to: "/contribute", label: "Contributor Guide" },
      { to: "/legal", label: "Legal & Terms" },
    ],
  },
];

const enterpriseGroups = [
  {
    title: "Explore",
    links: [
      { to: "/search", label: "Library" },
      { to: "/collections", label: "Collections" },
    ],
  },
  {
    title: "Enterprise",
    links: [
      { to: "/enterprise", label: "Workspace" },
      { to: "/enterprise?tab=portal", label: "Team Management" },
      { to: "/enterprise?tab=portal", label: "Usage Reports" },
      { to: "/enterprise?tab=portal", label: "Billing" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact & Support" },
      { to: "/pricing", label: "Licensing" },
      { to: "/legal", label: "Legal & Terms" },
    ],
  },
];

const adminGroups = [
  {
    title: "Admin",
    links: [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin?tab=users", label: "Users" },
      { to: "/admin?tab=moderation", label: "Moderation" },
      { to: "/admin?tab=assets", label: "Assets" },
      { to: "/admin?tab=settings", label: "Settings" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact & Support" },
      { to: "/admin?tab=reports", label: "Reports" },
      { to: "/admin?tab=logs", label: "System Logs" },
      { to: "/legal", label: "Legal & Terms" },
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
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/45">
                {g.title.toUpperCase()}
              </p>
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

        {/* Legal Compliance Notice */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-[11px] leading-relaxed text-white/40 max-w-5xl">
            <strong>Regulatory Compliance Notice:</strong> NS CAPTURES operates under strict
            compliance with international copyright frameworks, digital asset monetization
            standards, and cross-border commercial trade regulations. All submitted portfolios
            undergo mandatory authorship tracing and metadata tracking to protect legal licensees.
            Vendor profile setup, secure asset encryption, and final payment disbursements are
            processed exclusively in tandem with certified legal counsel and corporate compliance
            clearing houses.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.14em]">© 2026 NS CAPTURES</p>
          <p className="text-xs">Photography licensed via global contributors.</p>
        </div>
      </div>
    </footer>
  );
}
