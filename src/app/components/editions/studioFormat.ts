import type { EditionReviewStatus } from "../../data/editions";
import { primaryButtonClass, secondaryButtonClass } from "./editionsFormat";

// Studio screens (/editions/studio, onboarding) use the editions tokens so both themes work
export const surfaceCardClass = "rounded-lg border border-(--ed-border) bg-(--ed-surface)";
export const fieldLabelClass = "mb-2 block text-sm font-medium text-(--ed-text)";
export const textareaClass =
  "w-full rounded-lg border border-(--ed-border) bg-(--ed-bg) p-3 text-sm leading-6 text-(--ed-text) outline-none transition-colors placeholder:text-(--ed-muted) focus:border-(--ed-primary)";

export const smallPrimaryButton = `${primaryButtonClass} h-8 px-3 text-xs`;
export const smallSecondaryButton = `${secondaryButtonClass} h-8 px-3 text-xs`;
export const mediumPrimaryButton = `${primaryButtonClass} h-10 px-5 text-sm`;
export const mediumSecondaryButton = `${secondaryButtonClass} h-10 px-5 text-sm`;

export const chipBaseClass =
  "inline-flex h-6 shrink-0 items-center rounded px-2 font-mono text-xs uppercase leading-none";

export const REVIEW_CHIP_TONES: Record<EditionReviewStatus, string> = {
  draft: "bg-(--ed-raised) text-(--ed-muted)",
  pending_review: "bg-(--ed-warning)/15 text-(--ed-warning)",
  published: "bg-(--ed-positive)/15 text-(--ed-positive)",
  rejected: "bg-(--ed-negative)/15 text-(--ed-negative)",
};

export const formatShortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export const formatGbpWhole = (value: number) => `£${Math.round(value).toLocaleString("en-GB")}`;
