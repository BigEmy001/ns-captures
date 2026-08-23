import { useState } from "react";
import { X, Eye } from "lucide-react";
import { ViewAsProvider, type AuthUser } from "../../context/AuthContext";
import { CreatorTabs } from "../account/CreatorTabs";
import { EarningsTab } from "../account/EarningsTab";
import { AcquisitionsTab } from "../account/contributor/AcquisitionsTab";
import { AgreementsTab } from "../account/contributor/AgreementsTab";
import { LicensedWorkTab } from "../account/contributor/LicensedWorkTab";
import { BonusesTab, PublicationsTab, FeaturedInTab } from "../account/contributor/OpportunityTabs";
import type { AdminUser } from "../../data/db";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "portfolio", label: "Portfolio" },
  { id: "submissions", label: "Submissions" },
  { id: "licensed", label: "Licensed" },
  { id: "acquisitions", label: "Acquisitions" },
  { id: "earnings", label: "Earnings" },
  { id: "payouts", label: "Payouts" },
  { id: "bonuses", label: "Bonuses" },
  { id: "publications", label: "Publications" },
  { id: "featured", label: "Collections" },
  { id: "agreements", label: "Agreements" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** An admin record carries most of what the portal reads from the session. */
function toAuthUser(admin: AdminUser): AuthUser {
  return {
    id: admin.id,
    slug: admin.slug,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatar: admin.avatar,
    memberSince: admin.joined,
    phone: admin.phone,
    occupation: admin.occupation,
    dob: admin.dob,
    location: admin.location,
    bio: admin.bio,
    socialLinks: admin.socialLinks,
    verificationStatus: admin.verificationStatus,
    status: admin.status,
    payoutBalance: admin.payoutBalance,
    contributorId: admin.contributorId,
    contributorLevel: admin.contributorLevel,
    country: admin.country,
    city: admin.city,
    specialties: admin.specialties,
    payoutCurrency: admin.payoutCurrency,
  };
}

/**
 * Shows a contributor's own screens as they see them. The admin stays signed
 * in as themselves throughout — nothing here can act on the contributor's
 * behalf.
 */
export function ViewAsPanel({ admin, onClose }: { admin: AdminUser; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const viewed = toAuthUser(admin);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#FAF9F5]">
      <header className="shrink-0 border-b border-[#e0ddd2] bg-[#12231f] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-5 py-3 sm:px-8">
          <Eye className="size-4 shrink-0 text-[#8ec8a9]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] tracking-[0.14em] text-[#8ec8a9] uppercase">
              Read-only view
            </p>
            <p className="truncate text-sm">
              Viewing <span className="font-semibold">{admin.name}</span>&rsquo;s account
              {admin.contributorId && (
                <span className="ml-2 font-mono text-xs text-white/60">{admin.contributorId}</span>
              )}
            </p>
          </div>
          <p className="hidden text-xs text-white/60 lg:block">
            You are still signed in as yourself. Nothing here can act as them.
          </p>
          <button
            onClick={onClose}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            <X className="size-3.5" /> Exit view
          </button>
        </div>
      </header>

      <nav className="shrink-0 overflow-x-auto border-b border-[#e0ddd2] bg-white">
        <div className="mx-auto flex max-w-[1440px] gap-1 px-5 sm:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-[#1e4a3f] text-[#1e4a3f]"
                  : "border-transparent text-[#6b716d] hover:text-[#18211f]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <ViewAsProvider user={viewed}>
          {["dashboard", "portfolio", "submissions", "payouts"].includes(tab) && (
            <CreatorTabs active={tab} onTabChange={(next) => setTab(next as TabId)} />
          )}
          {tab === "earnings" && <EarningsTab />}
          {tab === "licensed" && <LicensedWorkTab />}
          {tab === "acquisitions" && <AcquisitionsTab />}
          {tab === "agreements" && <AgreementsTab />}
          {tab === "bonuses" && <BonusesTab />}
          {tab === "publications" && <PublicationsTab />}
          {tab === "featured" && <FeaturedInTab />}
        </ViewAsProvider>
      </div>
    </div>
  );
}
