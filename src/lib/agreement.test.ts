import { describe, it, expect } from "vitest";
import { fillAgreement, unfilledPlaceholders, splitSections } from "./agreement";

const HEADER = `INTERNATIONAL CONTRIBUTOR AGREEMENT

Agreement Reference: NSC-CA-[YEAR]-[NUMBER]
Version: [VERSION]
Effective Date: [DATE]

Contributor:
Name: [FULL LEGAL NAME]
Contributor ID: [CONTRIBUTOR ID]
Email: [EMAIL ADDRESS]
Country: [COUNTRY]`;

const ctx = {
  reference: "NSC-CA-2026-A4F1",
  version: "1.0",
  effectiveDate: "2026-08-24",
  name: "Ernie Blarinckx",
  contributorId: "NSC-000184",
  email: "ernie@example.com",
  country: "Belgium",
};

describe("fillAgreement", () => {
  it("fills in the person the agreement is about", () => {
    const out = fillAgreement(HEADER, ctx);
    expect(out).toContain("Name: Ernie Blarinckx");
    expect(out).toContain("Contributor ID: NSC-000184");
    expect(out).toContain("Email: ernie@example.com");
    expect(out).toContain("Country: Belgium");
  });

  it("splits the reference across the two halves it was written as", () => {
    const out = fillAgreement(HEADER, ctx);
    expect(out).toContain("Agreement Reference: NSC-CA-2026-A4F1");
  });

  it("writes the date the way a contract reads", () => {
    expect(fillAgreement("Effective Date: [DATE]", ctx)).toBe("Effective Date: 24 August 2026");
  });

  it("fills the abbreviated id in the signature block too", () => {
    expect(fillAgreement("Contributor ID: [ID]", ctx)).toBe("Contributor ID: NSC-000184");
  });

  it("leaves nothing bracketed once everything is known", () => {
    expect(unfilledPlaceholders(HEADER, ctx)).toEqual([]);
  });

  it("leaves a placeholder visible rather than blanking it", () => {
    // A missing country must be obvious before signing, not an empty line.
    const out = fillAgreement(HEADER, { ...ctx, country: null });
    expect(out).toContain("Country: [COUNTRY]");
    expect(unfilledPlaceholders(HEADER, { ...ctx, country: null })).toEqual(["[COUNTRY]"]);
  });

  it("treats an empty string as missing, not as an answer", () => {
    expect(fillAgreement("Name: [FULL LEGAL NAME]", { name: "   " })).toBe(
      "Name: [FULL LEGAL NAME]",
    );
  });

  it("does not touch ordinary bracketed prose", () => {
    const line = "the Contributor [as defined above] agrees";
    expect(fillAgreement(line, ctx)).toBe(line);
  });

  it("falls back to this year when there is no reference to read one from", () => {
    const out = fillAgreement("Year: [YEAR]", { reference: null });
    expect(out).toMatch(/^Year: \d{4}$/);
  });

  it("copes with an empty body", () => {
    expect(fillAgreement("", ctx)).toBe("");
  });
});

describe("splitSections", () => {
  const doc = `Preamble text.

───

1. PURPOSE OF THIS AGREEMENT

This establishes the terms.

───

23. PAYMENT AND CONTRIBUTOR EARNINGS

Payments shall be determined.

───

45. GOVERNING LAW

The laws of England and Wales.`;

  it("breaks the document at its numbered headings", () => {
    const s = splitSections(doc);
    expect(s.map((x) => x.heading)).toEqual([
      "",
      "1. PURPOSE OF THIS AGREEMENT",
      "23. PAYMENT AND CONTRIBUTOR EARNINGS",
      "45. GOVERNING LAW",
    ]);
  });

  it("keeps the preamble that comes before any heading", () => {
    expect(splitSections(doc)[0].content).toBe("Preamble text.");
  });

  it("drops the rules that only divided the sections", () => {
    expect(splitSections(doc).every((s) => !s.content.includes("─"))).toBe(true);
  });

  it("does not mistake a numbered list item for a section", () => {
    const listy = `20. CONTRIBUTOR WARRANTIES

1. They are the creator of submitted Photographs.
2. They have authority to grant the rights being offered.`;
    const s = splitSections(listy);
    expect(s).toHaveLength(1);
    expect(s[0].content).toContain("2. They have authority");
  });

  it("returns nothing for an empty body", () => {
    expect(splitSections("")).toEqual([]);
  });
});
