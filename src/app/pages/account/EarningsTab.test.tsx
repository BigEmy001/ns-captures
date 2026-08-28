import { describe, it, expect } from "vitest";
import { TYPE_LABELS } from "./EarningsTab";
import type { EarningType } from "../../data/db";

describe("earnings history labels", () => {
  it("names money earned against a photograph for what it is", () => {
    // These used to share the `adjustment` type, so a contributor saw earnings
    // from their own photographs filed under "Adjustments".
    expect(TYPE_LABELS.download).toBe("Photo Downloads");
    expect(TYPE_LABELS.adjustment).toBe("Adjustments");
    expect(TYPE_LABELS.download).not.toBe(TYPE_LABELS.adjustment);
  });

  it("has a label for every type the ledger can hold", () => {
    const types: EarningType[] = [
      "licensing",
      "acquisition",
      "bonus",
      "award",
      "download",
      "adjustment",
    ];
    for (const type of types) {
      expect(TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
