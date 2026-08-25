import { describe, it, expect } from "vitest";
import { submissionStatus, resolveUploadStatus, contributorLevelLabel } from "./contributor";
import { maskAccount } from "../../lib/mask";
import { summariseEarnings, photoStateForAcquisition, type ContributorEarning } from "./db";

function earning(partial: Partial<ContributorEarning>): ContributorEarning {
  return {
    id: Math.random().toString(36),
    type: "licensing",
    status: "available",
    photoId: null,
    reference: null,
    description: null,
    grossAmount: 0,
    platformFee: 0,
    netAmount: 0,
    currency: "GBP",
    createdAt: "2026-08-01T00:00:00Z",
    availableAt: null,
    paidAt: null,
    ...partial,
  };
}

describe("submissionStatus", () => {
  it("maps the review lifecycle to programme labels", () => {
    expect(submissionStatus({ status: "draft" }).label).toBe("Draft");
    expect(submissionStatus({ status: "pending_review" }).label).toBe("Under Review");
    expect(submissionStatus({ status: "published" }).label).toBe("Approved");
    expect(submissionStatus({ status: "rejected" }).label).toBe("Declined");
  });

  it("lets acquisition state take precedence over publication", () => {
    expect(submissionStatus({ status: "published", acquisitionState: "review" }).label).toBe(
      "Acquisition Review",
    );
    expect(submissionStatus({ status: "published", acquisitionState: "acquired" }).label).toBe(
      "Acquired",
    );
  });

  it("treats an unknown or missing status as approved", () => {
    expect(submissionStatus({}).label).toBe("Approved");
  });
});

describe("summariseEarnings", () => {
  it("separates available, pending and lifetime", () => {
    const summary = summariseEarnings([
      earning({ status: "available", netAmount: 100 }),
      earning({ status: "pending", netAmount: 50 }),
      earning({ status: "paid", netAmount: 400 }),
    ]);

    expect(summary.available).toBe(100);
    expect(summary.pending).toBe(50);
    // Lifetime counts money earned — cleared and already paid out — but not
    // money still pending on an unapproved sale.
    expect(summary.lifetime).toBe(500);
  });

  it("breaks lifetime down by earning type", () => {
    const summary = summariseEarnings([
      earning({ type: "licensing", status: "paid", netAmount: 430 }),
      earning({ type: "acquisition", status: "available", netAmount: 1200 }),
      earning({ type: "bonus", status: "available", netAmount: 150 }),
      earning({ type: "award", status: "pending", netAmount: 999 }),
    ]);

    expect(summary.byType.licensing).toBe(430);
    expect(summary.byType.acquisition).toBe(1200);
    expect(summary.byType.bonus).toBe(150);
    // Still pending, so it has not been earned yet.
    expect(summary.byType.award).toBe(0);
  });

  it("returns zeroes for a contributor with no ledger entries", () => {
    const summary = summariseEarnings([]);
    expect(summary).toEqual({
      available: 0,
      pending: 0,
      lifetime: 0,
      byType: { licensing: 0, acquisition: 0, bonus: 0, award: 0, adjustment: 0 },
    });
  });
});

describe("resolveUploadStatus", () => {
  it("keeps a draft private whether or not review is on", () => {
    expect(resolveUploadStatus("draft", true)).toBe("draft");
    expect(resolveUploadStatus("draft", false)).toBe("draft");
  });

  it("sends submissions to review when moderation is required", () => {
    expect(resolveUploadStatus("published", true)).toBe("pending_review");
  });

  it("publishes straight away when moderation is off", () => {
    expect(resolveUploadStatus("published", false)).toBe("published");
  });
});

describe("maskAccount", () => {
  it("shows only the last four characters", () => {
    expect(maskAccount("GB29NWBK60161331926819")).toBe("•••• 6819");
  });

  it("ignores spacing in the stored value", () => {
    expect(maskAccount("GB29 NWBK 6016 1331 9268 19")).toBe("•••• 6819");
  });

  it("does not pretend a short value is longer than it is", () => {
    expect(maskAccount("42")).toBe("•••• 42");
  });

  it("says so when nothing is stored", () => {
    expect(maskAccount("")).toBe("Not set");
    expect(maskAccount(undefined)).toBe("Not set");
    expect(maskAccount(null)).toBe("Not set");
  });
});

describe("contributorLevelLabel", () => {
  it("names each recognition level", () => {
    expect(contributorLevelLabel("international")).toBe("International Contributor");
    expect(contributorLevelLabel("featured")).toBe("Featured Contributor");
    expect(contributorLevelLabel("collection")).toBe("Collection Photographer");
  });

  it("calls someone with no programme standing a photographer", () => {
    // This used to fall back to the entry contributor tier, which badged
    // thirteen photographers as International Contributors on their public
    // pages. An absent level means they are not in the programme.
    expect(contributorLevelLabel(undefined)).toBe("Photographer");
    expect(contributorLevelLabel("")).toBe("Photographer");
  });

  it("still names an unrecognised level rather than inventing one", () => {
    expect(contributorLevelLabel("something-else")).toBe("International Contributor");
  });
});

describe("photoStateForAcquisition", () => {
  it("only marks a photograph acquired once the acquisition is paid", () => {
    expect(photoStateForAcquisition("paid")).toBe("acquired");
    expect(photoStateForAcquisition("agreement_signed")).toBe("review");
    expect(photoStateForAcquisition("payment_pending")).toBe("review");
    expect(photoStateForAcquisition("offer_made")).toBe("review");
  });

  it("leaves no mark when an offer is withdrawn or refused", () => {
    expect(photoStateForAcquisition("declined")).toBeNull();
    expect(photoStateForAcquisition("cancelled")).toBeNull();
  });
});
