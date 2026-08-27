import { describe, it, expect } from "vitest";
import { ledgerLabel } from "./ledger";

describe("ledgerLabel", () => {
  it("never shows the contributor the tool's name or the upload id", () => {
    const raw = "Hype Engine: +24 custom downloads on photo upload-1784616302951";
    const shown = ledgerLabel(raw);
    expect(shown).toBe("24 downloads");
    expect(shown).not.toMatch(/hype/i);
    expect(shown).not.toMatch(/upload-/);
  });

  it("reads naturally for a single download", () => {
    expect(ledgerLabel("Hype Engine: +1 custom downloads on photo upload-1786878972574")).toBe(
      "1 download",
    );
  });

  it("groups the thousands", () => {
    expect(ledgerLabel("Hype Engine: +1200 custom downloads on photo upload-x")).toBe(
      "1,200 downloads",
    );
  });

  it("copes with the wording drifting a little", () => {
    expect(ledgerLabel("hype engine: 3 custom download on photo upload-x")).toBe("3 downloads");
    expect(ledgerLabel("Hype Engine - 5 downloads on photo upload-y")).toBe("5 downloads");
    expect(ledgerLabel("Hype Engine: +10 downloads")).toBe("10 downloads");
    expect(ledgerLabel("Hype Engine adjustment")).toBe("Adjustment");
    expect(ledgerLabel("Hype Engine")).toBe("Custom downloads");
  });

  it("leaves an ordinary description alone", () => {
    expect(ledgerLabel("Licence sale — Autumn in Kyoto")).toBe("Licence sale — Autumn in Kyoto");
    expect(ledgerLabel("Payout for request 8f21")).toBe("Payout for request 8f21");
  });

  it("gives the caller an empty string to fall back from", () => {
    expect(ledgerLabel(null)).toBe("");
    expect(ledgerLabel(undefined)).toBe("");
    expect(ledgerLabel("   ")).toBe("");
  });

  it("does not mangle a description that merely mentions the words", () => {
    const raw = "Refund of a hype engine correction";
    expect(ledgerLabel(raw)).toBe(raw);
  });
});
