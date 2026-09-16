import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, ArrowUpRight, ChevronRight } from "lucide-react";
import { Eyebrow } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { EDITIONS_CHANGED_EVENT, editionReviewStatus } from "../../data/editions";
import { creatorHref } from "../../components/editions/editionsFormat";
import { formatGbpWhole, formatShortDate } from "../../components/editions/studioFormat";
import { loadStudioData } from "../studio/studioData";

const statLabel = "font-mono text-[9px] uppercase tracking-[0.12em] text-[#758078]";

/**
 * Account summary for NFT editions. Collecting, creating and managing happen in the
 * Editions studio; this keeps the numbers in view and links across.
 */
export function NftEditionsTab({ canCreate }: { canCreate: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState(() => loadStudioData(user));
  if (data.userId !== (user?.id ?? null)) setData(loadStudioData(user));

  useEffect(() => {
    const sync = () => setData(loadStudioData(user));
    window.addEventListener(EDITIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user]);

  if (!user) return null;

  const { activation, editions, owned, sales } = data;
  const creatorStudio = activation?.role === "creator" && canCreate;
  const countStatus = (status: ReturnType<typeof editionReviewStatus>) =>
    editions.filter((e) => editionReviewStatus(e) === status).length;
  const needsChanges = countStatus("rejected");
  const spent = owned.reduce((sum, o) => sum + o.purchasePriceGbp, 0);

  const stats = creatorStudio
    ? [
        { label: "Live editions", value: String(countStatus("published")) },
        { label: "In review", value: String(countStatus("pending_review")) },
        { label: "Copies sold", value: String(sales.salesCount) },
        { label: "Royalties", value: formatGbpWhole(sales.royaltiesGbp) },
      ]
    : [
        { label: "Collected", value: String(owned.length) },
        { label: "Spent", value: formatGbpWhole(spent) },
      ];

  const staysHere = [
    { label: "Web3 vault and deposits", to: "/account?tab=web3" },
    ...(canCreate
      ? [
          { label: "Photo uploads and approvals", to: "/account?tab=submissions" },
          { label: "Payouts", to: "/account?tab=payouts" },
        ]
      : []),
    { label: "Verification and security", to: "/account?tab=security" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>DIGITAL EDITIONS</Eyebrow>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#18211f] sm:text-4xl">
          NFT editions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#59645f]">
          Collecting, creating and managing NFT editions happens in your Editions studio, with the
          same NS CAPTURES account.
        </p>
      </div>

      <section
        aria-labelledby="nft-studio-card"
        className="rounded-2xl bg-[#101011] p-6 text-white ns-shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-1.5 font-mono text-xs uppercase text-[#acadae]">
              NS CAPTURES Web3
            </p>
            <h2 id="nft-studio-card" className="mt-3 text-2xl font-medium text-white">
              {activation
                ? creatorStudio
                  ? "Your creator studio"
                  : "Your collector studio"
                : "Switch on Web3"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#acadae]">
              {activation
                ? `Web3 has been on since ${formatShortDate(activation.activatedAt)}. Open your studio to ${creatorStudio ? "create, manage and collect" : "see what you’ve collected"}.`
                : canCreate
                  ? "Mint photos or artwork as editions, build collections and earn royalties. It takes a minute and you keep this account."
                  : "Collect numbered editions with certificates. It takes a minute and you keep this account."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/editions/studio"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0786ff] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0070e0]"
            >
              {activation ? "Open studio" : "Switch on Web3"}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
            {activation && (
              <Link
                to={creatorHref(user.slug || user.id)}
                className="inline-flex h-10 items-center rounded-full border border-[#3a3b42] px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Public page
              </Link>
            )}
          </div>
        </div>
      </section>

      {activation && (
        <div
          className={`grid grid-cols-2 gap-3 sm:gap-4 ${stats.length === 4 ? "lg:grid-cols-4" : ""}`}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#ececec]/80 bg-white p-5 ns-shadow-sm"
            >
              <p className={statLabel}>{stat.label}</p>
              <p className="mt-2 font-serif text-2xl font-medium text-[#18211f] sm:text-3xl">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {creatorStudio && needsChanges > 0 && (
        <Link
          to="/editions/studio?section=editions"
          className="flex items-center gap-3 rounded-2xl border border-[#f3d6db] bg-[#fcf1f3] p-4 text-sm text-[#8a2336] transition-colors hover:bg-[#f9e6ea]"
        >
          <AlertCircle aria-hidden className="size-5 shrink-0" />
          <span className="flex-1">
            {needsChanges} edition{needsChanges === 1 ? " needs" : "s need"} changes before it can
            go live.
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0" />
        </Link>
      )}

      <section
        aria-labelledby="nft-stays-here"
        className="rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm"
      >
        <h2 id="nft-stays-here" className="font-serif text-lg text-[#18211f]">
          Still managed in your account
        </h2>
        <ul className="mt-3 divide-y divide-[#ececec]">
          {staysHere.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center justify-between gap-3 py-3 text-sm text-[#18211f] transition-colors hover:text-[#1e4a3f]"
              >
                {item.label}
                <ChevronRight aria-hidden className="size-4 text-[#8a8f89]" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
