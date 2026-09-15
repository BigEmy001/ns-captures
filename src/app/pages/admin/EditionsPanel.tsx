import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Search } from "lucide-react";
import { Badge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { copyToClipboard } from "../../../lib/clipboard";
import {
  approveEdition,
  ARTWORK_SOURCE_LABELS,
  editionReviewStatus,
  EDITION_REVIEW_LABELS,
  EDITIONS_CHANGED_EVENT,
  getCollectedMintingFees,
  getDepositConfig,
  getStoredEditions,
  getStoredOwnerships,
  isEditionPublished,
  isEditionsPublic,
  PLATFORM_TREASURY_WALLETS,
  rejectEdition,
  saveDepositConfig,
  saveStoredEditions,
  setEditionsPublic,
  type DepositGateConfig,
  type DigitalEdition,
  type EditionReviewStatus,
} from "../../data/editions";

type PanelTab = "review" | "catalogue" | "rules" | "certificates";
type NoteTarget = { editionId: string; from: "queue" | "decisions" | "catalogue" } | null;

// Shared admin console styling (Users, Moderation, Collections)
const card = "rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm";
const labelClass = "font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#ececec] bg-white px-4 py-2 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 disabled:bg-[#FAF9F5] disabled:text-[#8a8f89]";
const primaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#1e4a3f] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#ececec] bg-white px-5 py-2.5 text-sm font-semibold text-[#4a534e] transition-all duration-200 hover:border-[#1e4a3f] hover:text-[#1e4a3f]";
const linkButton = "text-xs font-semibold text-[#1e4a3f] transition hover:underline";
const tableWrap = "overflow-x-auto rounded-2xl border border-[#ececec]/80 bg-white ns-shadow-sm";
const tableHead =
  "border-b border-[#ececec] bg-[#f7f7f7] font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "review", label: "Review queue" },
  { id: "catalogue", label: "Catalogue" },
  { id: "rules", label: "Minting fees & rules" },
  { id: "certificates", label: "Certificates" },
];

const REVIEW_TONE: Record<EditionReviewStatus, "green" | "muted" | "red"> = {
  published: "green",
  pending_review: "muted",
  draft: "muted",
  rejected: "red",
};

type ThresholdKey = keyof Pick<
  DepositGateConfig,
  "ethThreshold" | "solThreshold" | "usdtThreshold" | "usdcThreshold" | "btcThreshold"
>;

const DEPOSIT_FIELDS: { key: ThresholdKey; label: string; step: string; hint: string }[] = [
  { key: "ethThreshold", label: "Ethereum (ETH)", step: "0.001", hint: "Default 0.006 ETH" },
  { key: "solThreshold", label: "Solana (SOL)", step: "0.05", hint: "Default 0.15 SOL" },
  { key: "usdtThreshold", label: "Tether (USDT)", step: "5", hint: "Default 20 USDT" },
  { key: "usdcThreshold", label: "USD Coin (USDC)", step: "5", hint: "Default 20 USDC" },
  { key: "btcThreshold", label: "Bitcoin (BTC)", step: "0.0001", hint: "Default 0.0003 BTC" },
];

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const formatGbp = (value: number) => `£${Math.round(value).toLocaleString("en-GB")}`;

const tierLabel = (edition: DigitalEdition) =>
  edition.tier === "genesis_1_of_1"
    ? "Genesis 1/1"
    : edition.tier === "physical_twin"
      ? "Physical twin"
      : `${edition.totalEditions} editions`;

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#ececec]/80 bg-white p-5 ns-shadow-sm transition-all duration-300 hover:border-[#1e4a3f]/20 sm:p-6">
      <p className={labelClass}>{label}</p>
      <p className="mt-2 font-serif text-2xl font-medium text-[#18211f] sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#6b716d]">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4a3f]/30 ${
        checked ? "bg-[#1e4a3f]" : "bg-[#d6d4cc]"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function EditionCell({ edition }: { edition: DigitalEdition }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={edition.image}
        alt=""
        loading="lazy"
        className="size-10 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0">
        <p className="max-w-[220px] truncate font-semibold text-[#18211f]">{edition.title}</p>
        <p className="font-mono text-[10px] text-[#8a8f89]">{edition.tokenId}</p>
      </div>
    </div>
  );
}

function NoteForm({
  id,
  value,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block">
        <span className={labelClass}>Note to the creator</span>
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. The master file is below print resolution — please use the full-size original."
          className={`${fieldClass} resize-none`}
        />
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={outlineButton}>
          Cancel
        </button>
        <button type="button" onClick={onSubmit} disabled={!value.trim()} className={primaryButton}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export function EditionsPanel() {
  const { user } = useAuth();
  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [ownerships] = useState(() => getStoredOwnerships());
  const [depositConfig, setDepositConfig] = useState<DepositGateConfig>(() => getDepositConfig());
  const [savingConfig, setSavingConfig] = useState(false);
  const [isPublicVisible, setIsPublicVisible] = useState(() => isEditionsPublic());
  // Open on the review queue whenever creators are waiting for a decision
  const [activeTab, setActiveTab] = useState<PanelTab>(() =>
    getStoredEditions().some((e) => editionReviewStatus(e) === "pending_review")
      ? "review"
      : "catalogue",
  );
  const [noteTarget, setNoteTarget] = useState<NoteTarget>(null);
  const [note, setNote] = useState("");
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueFilter, setCatalogueFilter] = useState<"all" | EditionReviewStatus>("all");
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const mintingRevenue = getCollectedMintingFees();

  const handleCopyWallet = async (addr: string, label: string) => {
    const ok = await copyToClipboard(addr);
    if (ok) {
      setCopiedWallet(addr);
      toast.success(`${label} copied`);
      setTimeout(() => setCopiedWallet(null), 2000);
    }
  };

  // Stay in step with creators submitting from their account in another tab
  useEffect(() => {
    const sync = () => setEditions(getStoredEditions());
    window.addEventListener(EDITIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const reviewerName = user?.name || "NS CAPTURES Admin";

  const pendingEditions = useMemo(
    () =>
      editions
        .filter((e) => editionReviewStatus(e) === "pending_review")
        .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")),
    [editions],
  );

  const recentDecisions = useMemo(
    () =>
      editions
        .filter((e) => e.reviewedAt)
        .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
        .slice(0, 8),
    [editions],
  );

  const stats = useMemo(() => {
    const live = editions.filter(isEditionPublished);
    return {
      live: live.length,
      inventoryValue: live.reduce((sum, e) => sum + e.priceGbp * e.totalEditions, 0),
      salesVolume: ownerships.reduce((sum, o) => sum + o.purchasePriceGbp, 0),
    };
  }, [editions, ownerships]);

  const catalogue = useMemo(() => {
    const query = catalogueSearch.trim().toLowerCase();
    return editions.filter(
      (e) =>
        (catalogueFilter === "all" || editionReviewStatus(e) === catalogueFilter) &&
        (!query ||
          [e.title, e.photographerName, e.tokenId].some((v) => v.toLowerCase().includes(query))),
    );
  }, [editions, catalogueSearch, catalogueFilter]);

  const editionsById = useMemo(() => new Map(editions.map((e) => [e.id, e])), [editions]);

  const refresh = () => setEditions(getStoredEditions());

  const openNote = (editionId: string, from: NonNullable<NoteTarget>["from"]) => {
    setNoteTarget({ editionId, from });
    setNote("");
  };

  const closeNote = () => {
    setNoteTarget(null);
    setNote("");
  };

  const handleApprove = (edition: DigitalEdition) => {
    const result = approveEdition(edition.id, reviewerName);
    if (!result.success) {
      toast.error(result.error ?? "Could not approve this edition");
      return;
    }
    refresh();
    toast.success(`“${edition.title}” is now live on /editions`);
  };

  const handleSendNote = (edition: DigitalEdition) => {
    const wasPublished = isEditionPublished(edition);
    const result = rejectEdition(edition.id, note, reviewerName);
    if (!result.success) {
      toast.error(result.error ?? "Could not send the note");
      return;
    }
    refresh();
    closeNote();
    toast.success(
      wasPublished
        ? `“${edition.title}” was unpublished and the creator notified`
        : `Changes requested for “${edition.title}”`,
    );
  };

  // One spotlight at a time: it leads the featured carousel on /editions
  const handleToggleSpotlight = (editionId: string) => {
    const updated = editions.map((e) => ({
      ...e,
      featured: e.id === editionId ? !e.featured : false,
    }));
    setEditions(updated);
    saveStoredEditions(updated);
    toast.success("Spotlight updated on /editions");
  };

  const handleTogglePublicVisibility = () => {
    const next = !isPublicVisible;
    setIsPublicVisible(next);
    setEditionsPublic(next);
    toast.success(
      next ? "The editions marketplace is now public" : "The editions marketplace is now hidden",
    );
  };

  const handleSaveConfig = () => {
    setSavingConfig(true);
    saveDepositConfig(depositConfig);
    setTimeout(() => {
      setSavingConfig(false);
      toast.success("Deposit rules saved");
    }, 300);
  };

  const noteFormFor = (edition: DigitalEdition, from: NonNullable<NoteTarget>["from"]) =>
    noteTarget?.editionId === edition.id && noteTarget.from === from;

  return (
    <div className="space-y-6">
      {/* Marketplace visibility */}
      <div className={`${card} flex flex-col gap-5 md:flex-row md:items-center md:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-serif text-lg text-[#18211f]">Editions marketplace</h3>
            <Badge tone={isPublicVisible ? "green" : "muted"}>
              {isPublicVisible ? "LIVE TO PUBLIC" : "ADMIN PREVIEW ONLY"}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[#6b716d]">
            {isPublicVisible
              ? "Everyone can browse and buy editions on /editions."
              : "The editions room is hidden. Visitors see a private salon page and only admins can browse it."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/editions"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e4a3f] hover:underline"
          >
            Open /editions
            <ExternalLink className="size-3.5" />
          </Link>
          <Toggle
            checked={isPublicVisible}
            onChange={handleTogglePublicVisibility}
            label="Show the editions marketplace to the public"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Live editions" value={stats.live.toLocaleString()} />
        <StatCard
          label="Awaiting review"
          value={pendingEditions.length.toLocaleString()}
          hint={pendingEditions.length === 0 ? "Queue is clear" : undefined}
        />
        <StatCard label="Inventory value" value={formatGbp(stats.inventoryValue)} />
        <StatCard
          label="Sales volume"
          value={formatGbp(stats.salesVolume)}
          hint={`${ownerships.length} certificate${ownerships.length === 1 ? "" : "s"} issued`}
        />
      </div>

      {/* Sections */}
      <div
        role="tablist"
        aria-label="Editions sections"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActiveTab(tab.id);
                closeNote();
              }}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selected
                  ? "border-[#1e4a3f] bg-[#1e4a3f] text-white"
                  : "border-[#ececec] bg-white text-[#6b716d] hover:border-[#1e4a3f]/40 hover:text-[#18211f]"
              }`}
            >
              {tab.label}
              {tab.id === "review" && pendingEditions.length > 0 && (
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[9px] ${
                    selected ? "bg-white text-[#1e4a3f]" : "bg-[#d4183d] text-white"
                  }`}
                >
                  {pendingEditions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= Review queue ================= */}
      {activeTab === "review" && (
        <div className="space-y-8">
          {pendingEditions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#ececec] bg-white py-16 text-center">
              <p className="font-serif text-2xl text-[#18211f]">No editions to review.</p>
              <p className="mt-2 text-sm text-[#6b716d]">
                Creators submit editions from their Editions studio.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEditions.map((edition) => (
                <div
                  key={edition.id}
                  className={`${card} transition-all duration-300 hover:border-[#1e4a3f]/20`}
                >
                  <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                    <img
                      src={edition.image}
                      alt=""
                      loading="lazy"
                      className="size-20 shrink-0 rounded-xl object-cover shadow-sm md:size-24"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-serif text-lg font-medium leading-snug text-[#18211f]">
                          {edition.title}
                        </h3>
                        <span className="rounded-full bg-[#dce8df] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#1e4a3f]">
                          {tierLabel(edition)}
                        </span>
                        {edition.artworkSource && edition.artworkSource !== "portfolio" && (
                          <span className="rounded-full bg-[#fdf3e1] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#8a5a00]">
                            {ARTWORK_SOURCE_LABELS[edition.artworkSource]} · check rights
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#4a534e]">
                        By{" "}
                        <span className="font-semibold text-[#18211f]">
                          {edition.photographerName}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6d746e]">
                        <span>
                          {formatGbp(edition.priceGbp)} · ≈ {edition.priceEth} ETH
                        </span>
                        <span>{edition.royaltyPercent}% royalty</span>
                        <span>
                          {edition.collectionName
                            ? `Collection: ${edition.collectionName}`
                            : "No collection"}
                        </span>
                        {edition.hasPhysicalTwin && <span>Includes print twin</span>}
                        <span>Submitted {formatDate(edition.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-[auto_1fr] gap-3 border-t border-[#f2f2f2] pt-4 md:flex md:w-auto md:border-t-0 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleApprove(edition)}
                        className={`${primaryButton} col-span-2 md:order-last`}
                      >
                        <Check className="size-4" />
                        Approve
                      </button>
                      <a
                        href={`/editions/${edition.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={outlineButton}
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => openNote(edition.id, "queue")}
                        className={outlineButton}
                      >
                        Request changes
                      </button>
                    </div>
                  </div>
                  {noteFormFor(edition, "queue") && (
                    <div className="mt-6 border-t border-[#ececec] pt-5">
                      <NoteForm
                        id={`queue-note-${edition.id}`}
                        value={note}
                        onChange={setNote}
                        onCancel={closeNote}
                        onSubmit={() => handleSendNote(edition)}
                        submitLabel="Send to creator"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {recentDecisions.length > 0 && (
            <div>
              <h3 className="mb-3 font-serif text-lg text-[#18211f]">Recent decisions</h3>
              <div className={tableWrap}>
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className="px-6 py-4">Edition</th>
                      <th className="px-6 py-4">Creator</th>
                      <th className="px-6 py-4">Decision</th>
                      <th className="px-6 py-4">Reviewed</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]/60">
                    {recentDecisions.map((edition) => {
                      const status = editionReviewStatus(edition);
                      return (
                        <Fragment key={edition.id}>
                          <tr className="transition-all duration-150 hover:bg-[#FAF9F5]">
                            <td className="px-6 py-4">
                              <EditionCell edition={edition} />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-[#18211f]">
                              {edition.photographerName}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                tone={REVIEW_TONE[status]}
                                size="sm"
                                className="whitespace-nowrap"
                              >
                                {EDITION_REVIEW_LABELS[status].toUpperCase()}
                              </Badge>
                              {status === "rejected" && edition.reviewNote && (
                                <p className="mt-1.5 max-w-[260px] text-xs text-[#6b716d]">
                                  {edition.reviewNote}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-xs text-[#6b716d]">
                              {formatDate(edition.reviewedAt)}
                              {edition.reviewedBy && (
                                <span className="block">by {edition.reviewedBy}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {status === "rejected" ? (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(edition)}
                                  className={linkButton}
                                >
                                  Approve
                                </button>
                              ) : status === "published" ? (
                                <button
                                  type="button"
                                  onClick={() => openNote(edition.id, "decisions")}
                                  className={linkButton}
                                >
                                  Unpublish
                                </button>
                              ) : (
                                <span className="text-xs text-[#8a8f89]">—</span>
                              )}
                            </td>
                          </tr>
                          {noteFormFor(edition, "decisions") && (
                            <tr>
                              <td colSpan={5} className="bg-[#FAF9F5] px-6 py-5">
                                <NoteForm
                                  id={`decision-note-${edition.id}`}
                                  value={note}
                                  onChange={setNote}
                                  onCancel={closeNote}
                                  onSubmit={() => handleSendNote(edition)}
                                  submitLabel="Unpublish & notify"
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= Catalogue ================= */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b716d]" />
              <input
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                placeholder="Search editions..."
                aria-label="Search editions"
                className="w-full rounded-xl border border-[#ececec] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 sm:w-64"
              />
            </div>
            <select
              value={catalogueFilter}
              onChange={(e) => setCatalogueFilter(e.target.value as "all" | EditionReviewStatus)}
              aria-label="Filter by status"
              className="rounded-xl border border-[#ececec] bg-white px-4 py-2 text-sm outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="pending_review">In review</option>
              <option value="rejected">Changes requested</option>
              <option value="draft">Draft</option>
            </select>
            <span className="whitespace-nowrap font-mono text-[11px] text-[#6b716d]">
              {catalogue.length} of {editions.length}
            </span>
          </div>

          <div className={tableWrap}>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-4">Edition</th>
                  <th className="px-4 py-4">Artist</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Inventory</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Spotlight</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]/60">
                {catalogue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#6b716d]">
                      No editions match these filters.
                    </td>
                  </tr>
                ) : (
                  catalogue.map((edition) => {
                    const status = editionReviewStatus(edition);
                    const published = status === "published";
                    return (
                      <Fragment key={edition.id}>
                        <tr className="transition-all duration-150 hover:bg-[#FAF9F5]">
                          <td className="px-6 py-4">
                            <EditionCell edition={edition} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-[#18211f]">
                            {edition.photographerName}
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              tone={REVIEW_TONE[status]}
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              {EDITION_REVIEW_LABELS[status].toUpperCase()}
                            </Badge>
                            {published && edition.salesPaused && (
                              <Badge tone="muted" size="sm" className="ml-1.5 whitespace-nowrap">
                                SALES PAUSED
                              </Badge>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#6b716d]">
                            {edition.availableEditions} of {edition.totalEditions} left
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-[#18211f]">{formatGbp(edition.priceGbp)}</p>
                            <p className="font-mono text-[10px] text-[#8a8f89]">
                              ≈ {edition.priceEth} ETH
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            {!published ? (
                              <span className="text-xs text-[#8a8f89]">—</span>
                            ) : edition.featured ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSpotlight(edition.id)}
                                title="Remove from spotlight"
                              >
                                <Badge size="sm">SPOTLIGHT</Badge>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleSpotlight(edition.id)}
                                className={linkButton}
                              >
                                Set as spotlight
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                              <a
                                href={`/editions/${edition.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className={linkButton}
                              >
                                View
                              </a>
                              {published && (
                                <button
                                  type="button"
                                  onClick={() => openNote(edition.id, "catalogue")}
                                  className={linkButton}
                                >
                                  Unpublish
                                </button>
                              )}
                              {status === "pending_review" && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("review")}
                                  className={linkButton}
                                >
                                  Review
                                </button>
                              )}
                              {status === "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(edition)}
                                  className={linkButton}
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {noteFormFor(edition, "catalogue") && (
                          <tr>
                            <td colSpan={7} className="bg-[#FAF9F5] px-6 py-5">
                              <NoteForm
                                id={`catalogue-note-${edition.id}`}
                                value={note}
                                onChange={setNote}
                                onCancel={closeNote}
                                onSubmit={() => handleSendNote(edition)}
                                submitLabel="Unpublish & notify"
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= Minting fees & rules ================= */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Section 1: Rules & Fee Configuration */}
          <div className={`${card} max-w-3xl space-y-6`}>
            <div>
              <h3 className="font-serif text-lg text-[#18211f]">
                Platform Minting Fees & Treasury Rules
              </h3>
              <p className="mt-1 text-sm text-[#6b716d]">
                Creators pay an archival certification & platform minting fee before editions can be
                minted or submitted for curatorial review. Collected fees are automatically
                transferred into the NS CAPTURES Platform Treasury.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#FAF9F5] p-4">
              <div>
                <p className="text-sm font-semibold text-[#18211f]">Require platform minting fee</p>
                <p className="mt-0.5 text-xs text-[#6b716d]">
                  When active, creators must hold enough balance in their Web3 vault to pay the fee
                  upon certification.
                </p>
              </div>
              <Toggle
                checked={depositConfig.enforceDepositGate}
                onChange={() =>
                  setDepositConfig((prev) => ({
                    ...prev,
                    enforceDepositGate: !prev.enforceDepositGate,
                  }))
                }
                label="Require a platform minting fee to mint"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#18211f]">Fee per Cryptocurrency</p>
              <p className="mt-0.5 text-xs text-[#6b716d]">
                Creators can pay the minting fee with any one of these supported coins.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {DEPOSIT_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className={labelClass}>{field.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={field.step}
                      value={depositConfig[field.key]}
                      disabled={!depositConfig.enforceDepositGate}
                      onChange={(e) =>
                        setDepositConfig((prev) => ({
                          ...prev,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={`${fieldClass} font-mono`}
                    />
                    <span className="mt-1 block text-[11px] text-[#8a8f89]">{field.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#ececec] pt-5">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className={primaryButton}
              >
                {savingConfig ? "Saving…" : "Save rules & fees"}
              </button>
            </div>
          </div>

          {/* Section 2: Platform Treasury Receiving Wallets */}
          <div className={`${card} max-w-3xl space-y-4`}>
            <div>
              <h3 className="font-serif text-lg text-[#18211f]">Platform Treasury Wallets</h3>
              <p className="mt-1 text-sm text-[#6b716d]">
                Official receiving addresses where creator minting fees are collected and stored.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "EVM Treasury (ETH, Base, Polygon, USDC)",
                  network: "ERC20 / Base / Polygon",
                  address: PLATFORM_TREASURY_WALLETS.evm,
                },
                {
                  label: "TRON Treasury (USDT TRC20)",
                  network: "TRC20",
                  address: PLATFORM_TREASURY_WALLETS.usdtTrc20,
                },
                {
                  label: "Bitcoin Treasury (Native SegWit)",
                  network: "Native SegWit",
                  address: PLATFORM_TREASURY_WALLETS.btc,
                },
                {
                  label: "Solana Treasury (SPL)",
                  network: "Solana",
                  address: PLATFORM_TREASURY_WALLETS.sol,
                },
              ].map((tw) => {
                const isCopied = copiedWallet === tw.address;
                return (
                  <div
                    key={tw.label}
                    className="flex flex-col justify-between rounded-xl border border-[#ececec] bg-[#FAF9F5] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#18211f]">{tw.label}</span>
                        <span className="rounded bg-[#1e4a3f]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#1e4a3f]">
                          {tw.network}
                        </span>
                      </div>
                      <p className="mt-2 select-all break-all rounded border border-[#ececec] bg-white p-2 font-mono text-xs text-[#18211f]">
                        {tw.address}
                      </p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyWallet(tw.address, tw.label)}
                        className={`${outlineButton} h-8 px-3 text-xs`}
                      >
                        {isCopied ? (
                          <Check className="size-3.5 text-[#1e4a3f]" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {isCopied ? "Copied" : "Copy address"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Treasury Revenue Summary & Audit Trail */}
          <div className={`${card} max-w-3xl space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg text-[#18211f]">Collected Minting Fee Revenue</h3>
                <p className="mt-1 text-sm text-[#6b716d]">
                  Audit log of all minting certification fees collected from creators.
                </p>
              </div>
              <div className="rounded-xl border border-[#ececec] bg-[#FAF9F5] px-4 py-2 text-right">
                <p className="font-mono text-[10px] tracking-[0.12em] text-[#758078] uppercase">
                  Total Collected
                </p>
                <p className="font-serif text-lg font-medium text-[#18211f]">
                  $
                  {mintingRevenue.totalUsdEquivalent.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USD
                </p>
                <p className="text-[11px] text-[#6b716d]">
                  {mintingRevenue.totalCount} minting transaction
                  {mintingRevenue.totalCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {mintingRevenue.activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ececec] py-10 text-center text-sm text-[#6b716d]">
                No minting fees recorded yet. Fees collected will appear here with cryptographic
                transaction receipts.
              </div>
            ) : (
              <div className={tableWrap}>
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className={tableHead}>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Creator</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Treasury Recipient</th>
                      <th className="px-4 py-3">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]">
                    {mintingRevenue.activities.map((act) => (
                      <tr key={act.id} className="hover:bg-[#faf9f5]">
                        <td className="px-4 py-3 text-xs text-[#6b716d]">
                          {formatDate(act.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#18211f]">
                          {act.fromUser || "Creator"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-[#1e4a3f]">
                          {act.price} {act.currency}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6b716d]">
                          {act.toUser || "NS CAPTURES Treasury"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#8a8f89]">
                          <span className="inline-block max-w-[140px] truncate">{act.txHash}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= Certificates ================= */}
      {activeTab === "certificates" && (
        <div className="space-y-3">
          <p className="text-sm text-[#6b716d]">
            Certificates of authenticity issued to collectors, with the creator royalty on each
            sale.
          </p>
          {ownerships.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#ececec] bg-white py-16 text-center">
              <p className="font-serif text-2xl text-[#18211f]">No certificates yet.</p>
              <p className="mt-2 text-sm text-[#6b716d]">They appear here when an edition sells.</p>
            </div>
          ) : (
            <div className={tableWrap}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className="px-6 py-4">Certificate</th>
                    <th className="px-6 py-4">Collector</th>
                    <th className="px-6 py-4">Edition</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Creator royalty</th>
                    <th className="px-6 py-4">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececec]/60">
                  {ownerships.map((ownership) => {
                    const edition = editionsById.get(ownership.editionId);
                    const royaltyPercent = edition?.royaltyPercent ?? 10;
                    return (
                      <tr
                        key={ownership.id}
                        className="transition-all duration-150 hover:bg-[#FAF9F5]"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-[#18211f]">
                          {ownership.certificateNumber}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#18211f]">{ownership.ownerName}</p>
                          {ownership.ownerEmail && (
                            <p className="text-xs text-[#6b716d]">{ownership.ownerEmail}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="max-w-[220px] truncate text-[#18211f]">
                            {edition?.title ?? "Removed edition"}
                          </p>
                          <p className="font-mono text-[10px] text-[#8a8f89]">
                            {ownership.serialDisplay}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-[#18211f]">
                          {formatGbp(ownership.purchasePriceGbp)}
                          <span className="ml-1.5 font-mono text-[10px] text-[#8a8f89]">
                            {ownership.purchaseCurrency}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#18211f]">
                          {formatGbp((ownership.purchasePriceGbp * royaltyPercent) / 100)}
                          <span className="ml-1.5 text-xs text-[#6b716d]">{royaltyPercent}%</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-[#6b716d]">
                          {formatDate(ownership.acquiredAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
