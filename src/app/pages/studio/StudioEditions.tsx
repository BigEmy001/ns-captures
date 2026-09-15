import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AlertCircle, Eye, Pause, PencilLine, Play, Send, Trash2, Undo2 } from "lucide-react";
import type { AuthUser } from "../../context/AuthContext";
import {
  ARTWORK_SOURCE_LABELS,
  deleteEditionDraft,
  editionReviewStatus,
  setEditionSalesPaused,
  submitEditionForReview,
  withdrawEditionFromReview,
  type DigitalEdition,
  type EditionReviewStatus,
} from "../../data/editions";
import { EmptyState } from "../../components/editions/editionsUi";
import { iconButtonClass } from "../../components/editions/editionsFormat";
import { ReviewChip, StudioSectionHeader } from "../../components/editions/StudioUi";
import {
  chipBaseClass,
  formatGbpWhole,
  formatShortDate,
  smallPrimaryButton,
  smallSecondaryButton,
  surfaceCardClass,
} from "../../components/editions/studioFormat";
import type { StudioSection } from "./studioData";

type EditionFilter = "all" | EditionReviewStatus;

const FILTERS: { id: EditionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "pending_review", label: "In review" },
  { id: "published", label: "Published" },
  { id: "rejected", label: "Changes requested" },
];

function statusLine(edition: DigitalEdition, status: EditionReviewStatus) {
  if (status === "pending_review") {
    return `Submitted ${formatShortDate(edition.submittedAt)} · waiting for the review team`;
  }
  if (status === "published") {
    const sold = edition.totalEditions - edition.availableEditions;
    return `Published ${formatShortDate(edition.reviewedAt ?? edition.mintedAt)} · ${sold} of ${edition.totalEditions} sold`;
  }
  if (status === "rejected") return `Reviewed ${formatShortDate(edition.reviewedAt)}`;
  return `Draft created ${formatShortDate(edition.mintedAt)}`;
}

export function StudioEditions({
  user,
  editions,
  readyToSubmit,
  onEdit,
  onNavigate,
}: {
  user: AuthUser;
  editions: DigitalEdition[];
  readyToSubmit: boolean;
  onEdit: (edition: DigitalEdition) => void;
  onNavigate: (section: StudioSection) => void;
}) {
  const [filter, setFilter] = useState<EditionFilter>("all");

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

  const visible =
    filter === "all" ? editions : editions.filter((e) => editionReviewStatus(e) === filter);

  const run = (result: { success: boolean; error?: string }, message: string) => {
    if (!result.success) {
      toast.error(result.error ?? "Something went wrong. Try again.");
      return;
    }
    toast.success(message);
  };

  const handleSubmit = (edition: DigitalEdition) => {
    if (!readyToSubmit) {
      toast.error("Finish the vault steps in Overview before submitting an edition.");
      return;
    }
    run(submitEditionForReview(edition.id), `“${edition.title}” sent to the review team`);
  };

  const handleDelete = (edition: DigitalEdition) => {
    if (!window.confirm(`Delete “${edition.title}”? This can't be undone.`)) return;
    run(deleteEditionDraft(edition.id), "Edition deleted");
  };

  const handleToggleSales = (edition: DigitalEdition) => {
    const pausing = !edition.salesPaused;
    run(
      setEditionSalesPaused(edition.id, pausing, user),
      pausing
        ? `Sales paused. Collectors can still see “${edition.title}” but can't buy it.`
        : `“${edition.title}” is back on sale`,
    );
  };

  return (
    <section aria-labelledby="studio-editions">
      <StudioSectionHeader
        id="studio-editions"
        title="Your editions"
        description="Edit drafts, submit them for review, and pause or resume sales once they’re live."
      />

      <div role="group" aria-label="Filter editions" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const selected = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(option.id)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                selected
                  ? "border-(--ed-text) bg-(--ed-text) text-(--ed-bg)"
                  : "border-(--ed-border) bg-(--ed-surface) text-(--ed-text) hover:bg-(--ed-raised)"
              }`}
            >
              {option.label}
              <span
                className={`font-mono text-xs ${selected ? "opacity-70" : "text-(--ed-muted)"}`}
              >
                {counts[option.id]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={editions.length === 0 ? "No editions yet" : "Nothing in this list"}
          description={
            editions.length === 0
              ? "Create one from an approved photo, uploaded artwork or your profile picture."
              : "Try another filter."
          }
          action={
            editions.length === 0 ? (
              <button
                type="button"
                onClick={() => onNavigate("create")}
                className={smallPrimaryButton}
              >
                Create an edition
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((edition) => {
            const status = editionReviewStatus(edition);
            const editable = status === "draft" || status === "rejected";
            const canPause = status === "published" && edition.availableEditions > 0;
            const source = edition.artworkSource ?? "portfolio";
            return (
              <li
                key={edition.id}
                className={`${surfaceCardClass} flex flex-col gap-4 p-4 lg:flex-row lg:items-center`}
              >
                <img
                  src={edition.image}
                  alt=""
                  className="size-20 shrink-0 rounded-md object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-base font-medium text-(--ed-text)">
                      {edition.title}
                    </p>
                    <ReviewChip status={status} />
                    {status === "published" && edition.salesPaused && (
                      <span className={`${chipBaseClass} bg-(--ed-raised) text-(--ed-muted)`}>
                        Sales paused
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-(--ed-muted)">
                    {edition.tier === "genesis_1_of_1"
                      ? "Genesis 1 of 1"
                      : `${edition.totalEditions} editions`}{" "}
                    · {formatGbpWhole(edition.priceGbp)} · {edition.royaltyPercent}% royalty ·{" "}
                    {edition.collectionName ?? "No collection"}
                    {source !== "portfolio" && ` · ${ARTWORK_SOURCE_LABELS[source]}`}
                  </p>
                  <p className="text-xs text-(--ed-muted)">
                    {statusLine(edition, status)} ·{" "}
                    <span className="font-mono">{edition.tokenId}</span>
                  </p>
                  {status === "rejected" && edition.reviewNote && (
                    <div className="mt-2 flex gap-2 rounded-lg border border-(--ed-negative)/40 bg-(--ed-negative)/10 p-3 text-sm text-(--ed-text)">
                      <AlertCircle
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-(--ed-negative)"
                      />
                      <p>
                        <span className="font-medium">Changes requested:</span> {edition.reviewNote}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <Link to={`/editions/${edition.id}`} className={smallSecondaryButton}>
                    <Eye aria-hidden className="size-3.5" />
                    {status === "published" ? "View" : "Preview"}
                  </Link>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => onEdit(edition)}
                      className={smallSecondaryButton}
                    >
                      <PencilLine aria-hidden className="size-3.5" />
                      Edit
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(edition)}
                      className={smallPrimaryButton}
                    >
                      <Send aria-hidden className="size-3.5" />
                      {status === "rejected" ? "Resubmit" : "Submit for review"}
                    </button>
                  )}
                  {status === "pending_review" && (
                    <button
                      type="button"
                      onClick={() =>
                        run(
                          withdrawEditionFromReview(edition.id),
                          `“${edition.title}” moved back to drafts`,
                        )
                      }
                      className={smallSecondaryButton}
                    >
                      <Undo2 aria-hidden className="size-3.5" />
                      Withdraw
                    </button>
                  )}
                  {canPause && (
                    <button
                      type="button"
                      onClick={() => handleToggleSales(edition)}
                      className={edition.salesPaused ? smallPrimaryButton : smallSecondaryButton}
                    >
                      {edition.salesPaused ? (
                        <Play aria-hidden className="size-3.5" />
                      ) : (
                        <Pause aria-hidden className="size-3.5" />
                      )}
                      {edition.salesPaused ? "Resume sales" : "Pause sales"}
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleDelete(edition)}
                      aria-label={`Delete ${edition.title}`}
                      title="Delete"
                      className={`${iconButtonClass} hover:text-(--ed-negative)`}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
