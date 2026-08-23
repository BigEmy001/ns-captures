import { describe, it, expect } from "vitest";
import { submissionStatus, resolveUploadStatus } from "./contributor";
import { photoStateForAcquisition } from "./db";
import { availableForPayout, statusForStage, stageMeta } from "./payout-stages";
import { quoteConversion, formatConverted } from "./conversion";
import { resolvePayoutCurrency } from "../../lib/countries";
import { maskAccount } from "../../lib/mask";

/**
 * End-to-end checks over the rules a contributor's money and work pass
 * through, exercised as sequences rather than in isolation.
 */

describe("a submission's journey", () => {
  it("goes draft, then review, then approved", () => {
    expect(resolveUploadStatus("draft", true)).toBe("draft");
    expect(submissionStatus({ status: "draft" }).label).toBe("Draft");

    expect(resolveUploadStatus("published", true)).toBe("pending_review");
    expect(submissionStatus({ status: "pending_review" }).label).toBe("Under Review");

    expect(submissionStatus({ status: "published" }).label).toBe("Approved");
  });

  it("skips review entirely when moderation is off", () => {
    expect(resolveUploadStatus("published", false)).toBe("published");
    expect(submissionStatus({ status: "published" }).label).toBe("Approved");
  });

  it("shows acquisition state over publication once acquired", () => {
    const photo = { status: "published", acquisitionState: "acquired" };
    expect(submissionStatus(photo).label).toBe("Acquired");
  });

  it("marks the photograph acquired only when the acquisition is paid", () => {
    expect(photoStateForAcquisition("offer_made")).toBe("review");
    expect(photoStateForAcquisition("agreement_signed")).toBe("review");
    expect(photoStateForAcquisition("paid")).toBe("acquired");
    expect(submissionStatus({ status: "published", acquisitionState: "review" }).label).toBe(
      "Acquisition Review",
    );
  });
});

describe("a payout's journey", () => {
  const balance = 23870;

  it("holds requested money back, then releases it on rejection", () => {
    const requests = [{ amount: 10000, status: "PENDING" }];
    expect(availableForPayout(balance, requests)).toBe(13870);

    const rejected = [{ amount: 10000, status: "REJECTED" }];
    expect(availableForPayout(balance, rejected)).toBe(balance);
  });

  it("cannot be requested twice over", () => {
    const pending = [
      { amount: 10000, status: "PENDING" },
      { amount: 2970, status: "PENDING" },
    ];
    const available = availableForPayout(balance, pending);
    expect(available).toBe(10900);
    expect(available + 10000 + 2970).toBe(balance);
  });

  it("reads as pending, then approved, then paid as it advances", () => {
    expect(statusForStage("requested")).toBe("PENDING");
    expect(statusForStage("under_review")).toBe("PENDING");
    expect(statusForStage("approved")).toBe("APPROVED");
    expect(statusForStage("network_processing")).toBe("APPROVED");
    expect(statusForStage("delivered")).toBe("APPROVED");
    expect(statusForStage("completed")).toBe("PAID");
  });

  it("describes each stage to the contributor in their own terms", () => {
    expect(stageMeta("requested").body).toContain("submitted");
    expect(stageMeta("delivered").body).toContain("delivered");
    expect(stageMeta("completed").body).toContain("complete");
  });

  it("converts into the contributor's currency with the charge applied", () => {
    const currency = resolvePayoutCurrency(null, "South Korea");
    expect(currency).toBe("KRW");

    const quote = quoteConversion(10000, 1750, 3.7);
    expect(formatConverted(quote.netConverted, currency)).toBe("16,852,500 KRW");
  });
});

describe("what a contributor is shown about their own banking", () => {
  it("never reveals a complete account identifier", () => {
    const iban = "GB29NWBK60161331926819";
    const masked = maskAccount(iban);

    expect(masked).toBe("•••• 6819");
    expect(masked).not.toContain("NWBK");
    expect(masked.replace(/[^0-9]/g, "").length).toBeLessThanOrEqual(4);
  });
});
