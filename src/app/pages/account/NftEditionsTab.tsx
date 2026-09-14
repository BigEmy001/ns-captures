import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Eye,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { Eyebrow } from "../../components/ui";
import { MintEditionModal } from "../../components/MintEditionModal";
import { useEditionVault } from "../../components/editions/useEditionVault";
import { submissionStatus } from "../../data/contributor";
import { fetchPhotosByPhotographer, getOptimizedImageUrl, type Photo } from "../../data/db";
import {
  EDITIONS_CHANGED_EVENT,
  EDITION_REVIEW_LABELS,
  deleteEditionDraft,
  editionReviewStatus,
  getEditionsByCreator,
  submitEditionForReview,
  withdrawEditionFromReview,
  type DigitalEdition,
  type EditionReviewStatus,
} from "../../data/editions";

type EditionFilter = "all" | EditionReviewStatus;

const FILTERS: { id: EditionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "pending_review", label: "In review" },
  { id: "published", label: "Published" },
  { id: "rejected", label: "Changes requested" },
];

const STATUS_PILL: Record<EditionReviewStatus, string> = {
  draft: "bg-[#ece9df] text-[#6d746e]",
  pending_review: "bg-[#fdf3e1] text-[#8a5a00]",
  published: "bg-[#dce8df] text-[#285746]",
  rejected: "bg-[#fcf1f3] text-[#b0213c]",
};

const PHOTO_PREVIEW_LIMIT = 8;

const outlineButton =
  "inline-flex items-center gap-1.5 rounded-full border border-[#ececec] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]";
const solidButton =
  "inline-flex items-center gap-1.5 rounded-full bg-[#1e4a3f] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#123b31]";

const formatShortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const tierSummary = (edition: DigitalEdition) =>
  edition.tier === "genesis_1_of_1" ? "Genesis 1 of 1" : `${edition.totalEditions} editions`;

function statusLine(edition: DigitalEdition, status: EditionReviewStatus) {
  if (status === "pending_review") {
    return `Submitted ${formatShortDate(edition.submittedAt)} · waiting for the review team`;
  }
  if (status === "published")
    return `Published ${formatShortDate(edition.reviewedAt ?? edition.mintedAt)}`;
  if (status === "rejected") return `Reviewed ${formatShortDate(edition.reviewedAt)}`;
  return `Draft created ${formatShortDate(edition.mintedAt)}`;
}

function StatusPill({ status }: { status: EditionReviewStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] ${STATUS_PILL[status]}`}
    >
      {EDITION_REVIEW_LABELS[status]}
    </span>
  );
}

/**
 * Everything a creator does to take a photograph to a public NFT edition:
 * the prerequisites, creating an edition from an approved photo, and
 * submitting it to the NS CAPTURES review team.
 */
export function NftEditionsTab() {
  const { user, wallets, depositConfig, checkPurchaseGate } = useEditionVault();
  const [editions, setEditions] = useState<DigitalEdition[]>(() =>
    user ? getEditionsByCreator(user) : [],
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [filter, setFilter] = useState<EditionFilter>("all");
  const [mintPhoto, setMintPhoto] = useState<Photo | null>(null);

  const photographerId = user?.slug || user?.id || "";

  // Stay in step with review decisions made in the admin console or another tab
  useEffect(() => {
    if (!user) return;
    const sync = () => setEditions(getEditionsByCreator(user));
    window.addEventListener(EDITIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user]);

  // Editions are made from photographs already live in the creator's portfolio
  useEffect(() => {
    if (!photographerId) return;
    let active = true;
    fetchPhotosByPhotographer(photographerId)
      .then((rows) => {
        if (active) setPhotos(rows.filter((photo) => submissionStatus(photo).key === "approved"));
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });
    return () => {
      active = false;
    };
  }, [photographerId]);

  const refresh = () => {
    if (user) setEditions(getEditionsByCreator(user));
  };

  const isAdmin = user?.role === "Admin";
  const verified = isAdmin || user?.verificationStatus === "verified";
  const hasWallet = wallets.length > 0;
  const depositMet = checkPurchaseGate().eligible;
  const readyToSubmit = isAdmin || (hasWallet && depositMet);

  const steps = [
    {
      done: verified,
      title: "Verified creator account",
      body: "NS CAPTURES has verified your photographer profile.",
      action: verified ? undefined : { label: "Check verification", to: "/account?tab=security" },
    },
    {
      done: hasWallet,
      title: "Web3 vault wallet",
      body: "Create or connect a wallet in your Web3 vault. Sales and royalties settle there.",
      action: hasWallet ? undefined : { label: "Open Web3 vault", to: "/account?tab=web3" },
    },
    {
      done: depositMet,
      title: "Minimum vault deposit",
      body: `Hold at least ${depositConfig.ethThreshold} ETH, ${depositConfig.solThreshold} SOL, ${depositConfig.usdtThreshold} USDT or ${depositConfig.btcThreshold} BTC in your vault. The funds stay yours.`,
      action: depositMet ? undefined : { label: "Deposit", to: "/account?tab=web3" },
    },
    {
      done: editions.length > 0,
      title: "Create an edition from an approved photo",
      body: "Choose the edition type, number of copies, price and royalty.",
    },
    {
      done: editions.some((e) => editionReviewStatus(e) !== "draft"),
      title: "Submit it for review",
      body: "Our curators check the file, rights and pricing, then approve it or tell you what to change.",
    },
    {
      done: editions.some((e) => editionReviewStatus(e) === "published"),
      title: "Live on the marketplace",
      body: "Approved editions appear on /editions for collectors to buy.",
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  const counts = useMemo(() => {
    const totals: Record<EditionFilter, number> = {
      all: editions.length,
      draft: 0,
      pending_review: 0,
      published: 0,
      rejected: 0,
    };
    for (const edition of editions) totals[editionReviewStatus(edition)] += 1;
    return totals;
  }, [editions]);

  const visibleEditions =
    filter === "all" ? editions : editions.filter((e) => editionReviewStatus(e) === filter);
  const editionByPhoto = useMemo(() => new Map(editions.map((e) => [e.photoId, e])), [editions]);
  const shownPhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW_LIMIT);

  const handleSubmit = (edition: DigitalEdition) => {
    if (!readyToSubmit) {
      toast.error("Finish the vault steps above before submitting an edition.");
      return;
    }
    const result = submitEditionForReview(edition.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    refresh();
    toast.success(`“${edition.title}” sent to the review team`);
  };

  const handleWithdraw = (edition: DigitalEdition) => {
    const result = withdrawEditionFromReview(edition.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    refresh();
    toast.success(`“${edition.title}” moved back to drafts`);
  };

  const handleDelete = (edition: DigitalEdition) => {
    if (!window.confirm(`Delete “${edition.title}”? This can't be undone.`)) return;
    const result = deleteEditionDraft(edition.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    refresh();
    toast.success("Edition deleted");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>DIGITAL EDITIONS</Eyebrow>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#18211f] sm:text-4xl">
            NFT editions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#59645f]">
            Turn approved photographs into numbered digital editions. NS CAPTURES reviews every
            edition before it goes public on the marketplace.
          </p>
        </div>
        <Link to="/editions" className={outlineButton}>
          Open marketplace
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {/* ================= How to go public ================= */}
      <section aria-labelledby="nft-steps" className="rounded-2xl bg-white p-6 ns-shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="nft-steps" className="font-serif text-lg text-[#18211f]">
            How to make an edition public
          </h2>
          <span className="font-mono text-[11px] tracking-[0.1em] text-[#758078]">
            {doneCount} OF {steps.length} DONE
          </span>
        </div>
        <ol className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-[#1e4a3f]" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-[#c5ccc7]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#18211f]">
                  <span className="mr-1.5 font-mono text-xs text-[#8a8f89]">{index + 1}.</span>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#6b716d]">{step.body}</p>
              </div>
              {step.action && (
                <Link
                  to={step.action.to}
                  className="shrink-0 self-center text-xs font-semibold text-[#1e4a3f] hover:underline"
                >
                  {step.action.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ================= Create from approved photos ================= */}
      <section aria-labelledby="nft-create">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <Eyebrow>CREATE</Eyebrow>
            <h2 id="nft-create" className="mt-1 font-serif text-lg text-[#18211f]">
              Your approved photos
            </h2>
          </div>
          {!loadingPhotos && photos.length > 0 && (
            <p className="text-xs text-[#758078]">
              {photos.length} approved photo{photos.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {loadingPhotos && photographerId ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#ece9df]" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dce8df] bg-white p-8 text-center">
            <p className="font-serif text-base text-[#18211f]">No approved photos yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#6b716d]">
              Editions are made from photos that are already live in your portfolio. Once a
              submission is approved it will show up here.
            </p>
            <Link to="/account?tab=submissions" className={`${outlineButton} mt-4`}>
              View my submissions
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {shownPhotos.map((photo) => {
                const existing = editionByPhoto.get(photo.id);
                return (
                  <li key={photo.id} className="overflow-hidden rounded-2xl bg-white ns-shadow-sm">
                    <img
                      src={getOptimizedImageUrl(photo.image, 480)}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="space-y-2.5 p-3">
                      <p
                        className="truncate text-sm font-semibold text-[#18211f]"
                        title={photo.title}
                      >
                        {photo.title}
                      </p>
                      {existing ? (
                        <div className="flex items-center justify-between gap-2">
                          <StatusPill status={editionReviewStatus(existing)} />
                          <span className="text-[11px] text-[#758078]">Edition made</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMintPhoto(photo)}
                          className={`${solidButton} w-full justify-center`}
                        >
                          Create edition
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {photos.length > PHOTO_PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllPhotos((v) => !v)}
                className={`${outlineButton} mt-4`}
              >
                {showAllPhotos ? "Show fewer" : `Show all ${photos.length} photos`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ================= Your editions ================= */}
      <section aria-labelledby="nft-list">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>SUBMIT & TRACK</Eyebrow>
            <h2 id="nft-list" className="mt-1 font-serif text-lg text-[#18211f]">
              Your editions
            </h2>
          </div>
          <div role="tablist" aria-label="Filter editions" className="flex flex-wrap gap-1.5">
            {FILTERS.map((option) => {
              const selected = filter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(option.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? "bg-[#1e4a3f] text-white"
                      : "border border-[#ececec] bg-white text-[#59645f] hover:text-[#18211f]"
                  }`}
                >
                  {option.label}
                  <span className="ml-1.5 font-mono opacity-70">{counts[option.id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleEditions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dce8df] bg-white p-8 text-center">
            <p className="font-serif text-base text-[#18211f]">
              {editions.length === 0 ? "No editions yet" : "Nothing in this list"}
            </p>
            <p className="mt-1 text-sm text-[#6b716d]">
              {editions.length === 0
                ? "Create an edition from one of your approved photos above."
                : "Try another filter."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleEditions.map((edition) => {
              const status = editionReviewStatus(edition);
              const editable = status === "draft" || status === "rejected";
              return (
                <li
                  key={edition.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white p-4 ns-shadow-sm sm:flex-row sm:items-center"
                >
                  <img
                    src={edition.image}
                    alt=""
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate font-serif text-base text-[#18211f]">
                        {edition.title}
                      </p>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-xs text-[#6b716d]">
                      {tierSummary(edition)} · £{edition.priceGbp.toLocaleString("en-GB")} ·{" "}
                      {edition.royaltyPercent}% royalty ·{" "}
                      <span className="font-mono">{edition.tokenId}</span>
                    </p>
                    <p className="text-[11px] text-[#8a8f89]">{statusLine(edition, status)}</p>
                    {status === "rejected" && edition.reviewNote && (
                      <div className="mt-2 flex gap-2 rounded-xl border border-[#f3d6db] bg-[#fcf1f3] p-3 text-xs leading-5 text-[#8a2336]">
                        <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <p>
                          <span className="font-semibold">Changes requested:</span>{" "}
                          {edition.reviewNote}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Link to={`/editions/${edition.id}`} className={outlineButton}>
                      <Eye className="size-3.5" />
                      {status === "published" ? "View" : "Preview"}
                    </Link>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleSubmit(edition)}
                        className={solidButton}
                      >
                        <Send className="size-3.5" />
                        {status === "rejected" ? "Resubmit" : "Submit for review"}
                      </button>
                    )}
                    {status === "pending_review" && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(edition)}
                        className={outlineButton}
                      >
                        <Undo2 className="size-3.5" />
                        Withdraw
                      </button>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleDelete(edition)}
                        aria-label={`Delete ${edition.title}`}
                        title="Delete"
                        className="grid size-8 place-items-center rounded-full border border-[#ececec] bg-white text-[#8a8f89] transition hover:border-[#f3d6db] hover:text-[#b0213c]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {mintPhoto && (
        <MintEditionModal
          photo={mintPhoto}
          onClose={() => setMintPhoto(null)}
          onSuccess={() => {
            refresh();
            setFilter("all");
          }}
        />
      )}
    </div>
  );
}
