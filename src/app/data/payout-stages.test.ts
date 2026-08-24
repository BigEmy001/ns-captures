import { describe, it, expect } from "vitest";
import { withdrawableFrom } from "./db";
import {
  PAYOUT_STAGES,
  TERMINAL_STAGES,
  isTerminal,
  stageIndex,
  stageMeta,
  stageNotifiesByDefault,
  statusForStage,
  availableForPayout,
  stagesForMethod,
  stageMetaFor,
  chargeBlocksStage,
  type PayoutStage,
} from "./payout-stages";

describe("payout stages", () => {
  it("covers the ten stages of a payout in order", () => {
    expect(PAYOUT_STAGES.map((s) => s.id)).toEqual([
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
    ]);
  });

  it("marks only the two optional steps as conditional", () => {
    const conditional = PAYOUT_STAGES.filter((s) => s.conditional).map((s) => s.id);
    expect(conditional).toEqual(["currency_conversion", "intermediary_processing"]);
  });

  it("treats rejection and cancellation as endings, not progress", () => {
    expect(isTerminal("rejected")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("delivered")).toBe(false);
    expect(stageIndex("rejected")).toBe(-1);
  });
});

describe("statusForStage", () => {
  it("keeps the coarse status the rest of the platform reads in step", () => {
    expect(statusForStage("requested")).toBe("PENDING");
    expect(statusForStage("under_review")).toBe("PENDING");
    expect(statusForStage("approved")).toBe("APPROVED");
    expect(statusForStage("completed")).toBe("PAID");
    expect(statusForStage("rejected")).toBe("REJECTED");
    expect(statusForStage("cancelled")).toBe("REJECTED");
  });

  it("counts every in-flight banking stage as approved, not paid", () => {
    const inFlight: PayoutStage[] = [
      "processing",
      "currency_conversion",
      "network_processing",
      "intermediary_processing",
      "recipient_bank_processing",
      "delivered",
    ];
    for (const stage of inFlight) {
      expect(statusForStage(stage)).toBe("APPROVED");
    }
  });
});

describe("stageNotifiesByDefault", () => {
  it("emails the stages a contributor would want to hear about", () => {
    expect(stageNotifiesByDefault("approved")).toBe(true);
    expect(stageNotifiesByDefault("delivered")).toBe(true);
    expect(stageNotifiesByDefault("completed")).toBe(true);
    expect(stageNotifiesByDefault("rejected")).toBe(true);
  });

  it("stays quiet through the intermediate banking steps", () => {
    expect(stageNotifiesByDefault("under_review")).toBe(false);
    expect(stageNotifiesByDefault("processing")).toBe(false);
    expect(stageNotifiesByDefault("currency_conversion")).toBe(false);
    expect(stageNotifiesByDefault("network_processing")).toBe(false);
    expect(stageNotifiesByDefault("intermediary_processing")).toBe(false);
    expect(stageNotifiesByDefault("recipient_bank_processing")).toBe(false);
  });
});

describe("stageMeta", () => {
  it("describes every stage, including the terminal ones", () => {
    for (const stage of [...PAYOUT_STAGES, ...TERMINAL_STAGES]) {
      const meta = stageMeta(stage.id as PayoutStage);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.body.length).toBeGreaterThan(0);
      expect(meta.adminBody.length).toBeGreaterThan(0);
    }
  });
});

describe("availableForPayout", () => {
  const pending = (amount: number) => ({ amount, status: "PENDING" });

  it("holds back money already awaiting a decision", () => {
    expect(availableForPayout(23870, [pending(10000), pending(2970)])).toBe(10900);
  });

  it("ignores requests that have been decided", () => {
    expect(
      availableForPayout(1000, [
        { amount: 500, status: "REJECTED" },
        { amount: 200, status: "PAID" },
        { amount: 300, status: "APPROVED" },
      ]),
    ).toBe(1000);
  });

  it("never reports a negative amount available", () => {
    expect(availableForPayout(100, [pending(500)])).toBe(0);
  });

  it("is the full balance when nothing is pending", () => {
    expect(availableForPayout(23870, [])).toBe(23870);
  });
});

describe("stagesForMethod", () => {
  it("gives a bank transfer the full correspondent-bank journey", () => {
    const ids = stagesForMethod("card").map((s) => s.id);
    expect(ids).toContain("intermediary_processing");
    expect(ids).toContain("recipient_bank_processing");
    expect(ids).toHaveLength(10);
  });

  it("drops the intermediary step for a local transfer", () => {
    const ids = stagesForMethod("local_bank").map((s) => s.id);
    expect(ids).not.toContain("intermediary_processing");
    expect(ids).toContain("recipient_bank_processing");
  });

  it("gives crypto a short journey — no banks are involved", () => {
    const ids = stagesForMethod("crypto").map((s) => s.id);
    expect(ids).toEqual([
      "requested",
      "under_review",
      "approved",
      "network_processing",
      "completed",
    ]);
    expect(ids).not.toContain("currency_conversion");
    expect(ids).not.toContain("recipient_bank_processing");
  });

  it("keeps PayPal short too", () => {
    expect(stagesForMethod("paypal")).toHaveLength(5);
  });

  it("falls back to the bank journey for an unknown method", () => {
    expect(stagesForMethod(undefined)).toHaveLength(10);
    expect(stagesForMethod("something-new")).toHaveLength(10);
  });

  it("every stage it offers is one the platform knows", () => {
    for (const method of ["card", "local_bank", "crypto", "paypal"]) {
      for (const step of stagesForMethod(method)) {
        expect(statusForStage(step.id as PayoutStage)).toBeTruthy();
      }
    }
  });
});

describe("stageMetaFor", () => {
  it("calls the network step a transaction for crypto, not bank processing", () => {
    expect(stageMetaFor("crypto", "network_processing").label).toBe("Transaction Sent");
    expect(stageMetaFor("card", "network_processing").label).toBe(
      "Bank / Payment Network Processing",
    );
  });

  it("tells a crypto contributor the funds are in their wallet", () => {
    expect(stageMetaFor("crypto", "completed").label).toBe("Confirmed");
    expect(stageMetaFor("crypto", "completed").body).toContain("wallet");
  });

  it("leaves stages without an override alone", () => {
    expect(stageMetaFor("crypto", "approved").label).toBe("Payout Approved");
  });
});

describe("an outstanding conversion charge holds the payout", () => {
  it("blocks every step that carries the payout forward", () => {
    for (const stage of [
      "network_processing",
      "intermediary_processing",
      "recipient_bank_processing",
      "delivered",
      "completed",
    ]) {
      expect(chargeBlocksStage(stage as PayoutStage, "outstanding")).toBe(true);
    }
  });

  it("still lets the payout be rejected or cancelled", () => {
    // Ending it must always be possible, or a disputed charge traps the payout.
    expect(chargeBlocksStage("rejected", "outstanding")).toBe(false);
    expect(chargeBlocksStage("cancelled", "outstanding")).toBe(false);
  });

  it("does not block the steps before the charge exists", () => {
    expect(chargeBlocksStage("under_review", "outstanding")).toBe(false);
    expect(chargeBlocksStage("approved", "outstanding")).toBe(false);
    expect(chargeBlocksStage("currency_conversion", "outstanding")).toBe(false);
  });

  it("blocks nothing once it is settled or was never owed", () => {
    for (const status of ["paid", "waived", null, undefined]) {
      expect(chargeBlocksStage("completed", status)).toBe(false);
    }
  });
});

describe("withdrawableFrom", () => {
  it("is the balance, less anything awaiting a decision", () => {
    expect(withdrawableFrom(13870, [{ amount: 1000, status: "PENDING" }])).toBe(12870);
  });

  it("ignores decided requests", () => {
    expect(withdrawableFrom(13870, [{ amount: 1000, status: "PAID" }])).toBe(13870);
  });

  it("never goes negative", () => {
    expect(withdrawableFrom(100, [{ amount: 500, status: "PENDING" }])).toBe(0);
  });

  it("does not depend on the ledger, which may not reconcile exactly", () => {
    // The ledger cannot always split an entry across a part-settled payout, so
    // the balance is what a contributor is shown.
    expect(withdrawableFrom(13870, [])).toBe(13870);
  });
});
