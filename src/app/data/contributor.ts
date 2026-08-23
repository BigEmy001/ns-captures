/** Recognition status shown on the dashboard and the public profile. */
export const CONTRIBUTOR_LEVELS: Record<string, string> = {
  international: "International Contributor",
  featured: "Featured Contributor",
  collection: "Collection Photographer",
};

export function contributorLevelLabel(level: string | undefined): string {
  return CONTRIBUTOR_LEVELS[level || "international"] || CONTRIBUTOR_LEVELS.international;
}

/**
 * Photography specialties offered at contributor registration, from the
 * NS CAPTURES International Contributor Programme brief.
 */
export const SPECIALTIES = [
  "Street",
  "Travel",
  "Documentary",
  "Architecture",
  "Portrait",
  "Nature",
  "Wildlife",
  "Fashion",
  "Lifestyle",
  "Fine Art",
  "Events",
  "Other",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/**
 * The submission statuses the contributor programme uses, derived from the
 * photo's review status and its acquisition state. Acquisition is tracked
 * separately from publication, so an acquired photograph can still be live on
 * the marketplace.
 */
export type SubmissionStatusKey =
  "draft" | "under_review" | "approved" | "declined" | "acquisition_review" | "acquired";

export interface SubmissionStatus {
  key: SubmissionStatusKey;
  label: string;
  description: string;
  tone: "green" | "muted" | "red";
}

const STATUSES: Record<SubmissionStatusKey, SubmissionStatus> = {
  draft: {
    key: "draft",
    label: "Draft",
    description: "This photograph has not been submitted for review yet.",
    tone: "muted",
  },
  under_review: {
    key: "under_review",
    label: "Under Review",
    description: "Your photograph is currently being reviewed by NS CAPTURES.",
    tone: "muted",
  },
  approved: {
    key: "approved",
    label: "Approved",
    description: "Your photograph has been approved for marketplace licensing.",
    tone: "green",
  },
  declined: {
    key: "declined",
    label: "Declined",
    description: "This photograph was not selected for marketplace publication.",
    tone: "red",
  },
  acquisition_review: {
    key: "acquisition_review",
    label: "Acquisition Review",
    description: "This photograph has been forwarded for direct acquisition consideration.",
    tone: "green",
  },
  acquired: {
    key: "acquired",
    label: "Acquired",
    description: "This photograph has been acquired under the applicable acquisition agreement.",
    tone: "green",
  },
};

export function submissionStatus(photo: {
  status?: string | null;
  acquisitionState?: string | null;
}): SubmissionStatus {
  if (photo.acquisitionState === "acquired") return STATUSES.acquired;
  if (photo.acquisitionState === "review") return STATUSES.acquisition_review;

  switch (photo.status) {
    case "draft":
      return STATUSES.draft;
    case "pending_review":
      return STATUSES.under_review;
    case "rejected":
      return STATUSES.declined;
    default:
      return STATUSES.approved;
  }
}

export const SUBMISSION_FILTERS = [
  { id: "all", label: "All" },
  { id: "under_review", label: "Under Review" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
  { id: "acquired", label: "Acquired" },
] as const;

export type SubmissionFilterId = (typeof SUBMISSION_FILTERS)[number]["id"];

/**
 * Where a photograph lands when the contributor finishes the upload wizard.
 * A draft stays private. Otherwise the site's Moderation Required setting
 * decides between the review queue and going straight to the marketplace.
 */
export function resolveUploadStatus(
  intent: "published" | "draft",
  moderationRequired: boolean,
): "draft" | "pending_review" | "published" {
  if (intent === "draft") return "draft";
  return moderationRequired ? "pending_review" : "published";
}
