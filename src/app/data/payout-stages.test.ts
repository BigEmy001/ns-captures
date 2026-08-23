import { describe, it, expect } from "vitest";
import {
  PAYOUT_STAGES,
  TERMINAL_STAGES,
  isTerminal,
  stageIndex,
  stageMeta,
  stageNotifiesByDefault,
  statusForStage,
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
