import { describe, it, expect } from "vitest";
import { stageIndex, isTerminal, canReinitiate, type PayoutStage } from "./payout-stages";

/**
 * The rules that decide when a payout takes money and when it gives it back.
 *
 * These were both wrong in ways that cost real money: the debit fired only on
 * the exact `approved` stage, so moving straight to Processing paid someone
 * without reducing their balance; and nothing ever credited the balance back,
 * so cancelling an approved payout destroyed the amount.
 */

const commitsMoney = (stage: PayoutStage) => {
  const approved = stageIndex("approved");
  const here = stageIndex(stage);
  return here >= approved && approved !== -1 && here !== -1;
};

const refundsMoney = (stage: PayoutStage, alreadyDebited: boolean) =>
  (stage === "cancelled" || stage === "rejected") && alreadyDebited;

describe("when a payout takes money", () => {
  it("commits at approval", () => {
    expect(commitsMoney("approved")).toBe(true);
  });

  it("still commits when an admin skips straight past approval", () => {
    // The bug: these all paid out without ever debiting the balance.
    for (const stage of [
      "processing",
      "currency_conversion",
      "network_processing",
      "intermediary_processing",
      "recipient_bank_processing",
      "delivered",
      "completed",
    ] as PayoutStage[]) {
      expect(commitsMoney(stage)).toBe(true);
    }
  });

  it("takes nothing before approval", () => {
    expect(commitsMoney("requested")).toBe(false);
    expect(commitsMoney("under_review")).toBe(false);
  });

  it("takes nothing on a stage that ends the payout", () => {
    for (const stage of ["rejected", "cancelled", "returned"] as PayoutStage[]) {
      expect(commitsMoney(stage)).toBe(false);
    }
  });
});

describe("when a payout gives money back", () => {
  it("refunds a cancelled or rejected payout that was debited", () => {
    expect(refundsMoney("cancelled", true)).toBe(true);
    expect(refundsMoney("rejected", true)).toBe(true);
  });

  it("refunds nothing when the payout never took anything", () => {
    expect(refundsMoney("cancelled", false)).toBe(false);
    expect(refundsMoney("rejected", false)).toBe(false);
  });

  it("holds a returned payout rather than refunding it", () => {
    // A returned transfer is expected to be re-initiated, and the replacement
    // carries the debit forward. Refunding here would let it debit twice.
    expect(refundsMoney("returned", true)).toBe(false);
    expect(canReinitiate("returned")).toBe(true);
  });

  it("refunds nothing while the payout is still running", () => {
    for (const stage of ["approved", "processing", "delivered", "completed"] as PayoutStage[]) {
      expect(refundsMoney(stage, true)).toBe(false);
    }
  });
});

describe("the two rules never overlap", () => {
  it("no stage both takes money and gives it back", () => {
    const stages: PayoutStage[] = [
      "requested",
      "under_review",
      "approved",
      "processing",
      "currency_conversion",
      "network_processing",
      "intermediary_processing",
      "recipient_bank_processing",
      "delivered",
      "completed",
      "rejected",
      "cancelled",
      "returned",
    ];
    for (const stage of stages) {
      expect(commitsMoney(stage) && refundsMoney(stage, true)).toBe(false);
    }
  });

  it("a returned payout ends the original but is not a dead end", () => {
    expect(isTerminal("returned")).toBe(true);
    expect(canReinitiate("returned")).toBe(true);
  });
});
