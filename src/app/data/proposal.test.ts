import { describe, it, expect } from "vitest";
import { defaultProposalBody } from "./proposal-template";

describe("the proposal template", () => {
  const body = defaultProposalBody({
    name: "Junghoon Sung",
    location: "South Korea",
    occupation: "Freelance photographer",
  });

  it("addresses the photographer by name", () => {
    expect(body.startsWith("Dear Junghoon Sung,")).toBe(true);
  });

  it("falls back to a neutral greeting before a name is entered", () => {
    expect(defaultProposalBody({ name: "" }).startsWith("Dear Photographer,")).toBe(true);
  });

  it("carries the indicative acquisition categories from the brief", () => {
    expect(body).toContain("£150");
    expect(body).toContain("£300");
    expect(body).toContain("£450");
    expect(body).toContain("£650+");
  });

  it("covers every numbered section the brief sets out", () => {
    for (const heading of [
      "DIRECT PHOTOGRAPHIC ACQUISITION",
      "ACCEPTANCE BONUS",
      "EXPLORATION & DISCOVERY AWARD",
      "PERFORMANCE & COLLECTION BONUSES",
      "INTERNATIONAL PUBLICATION",
      "FEATURED CONTRIBUTOR",
      "INTERNATIONAL MARKETPLACE",
      "OWNERSHIP & RIGHTS",
      "CONTRIBUTOR RESPONSIBILITIES",
      "NO GUARANTEE OF ACQUISITION",
      "INVITATION",
    ]) {
      expect(body).toContain(heading);
    }
  });

  it("says plainly that it transfers no copyright", () => {
    // The brief is explicit that the proposal is an overview, not the document
    // that moves any rights. Losing this line would change what it is.
    expect(body).toContain("does not, by itself, transfer copyright");
  });

  it("does not promise an acquisition", () => {
    expect(body).toContain("do not constitute a guaranteed offer");
    expect(body).toContain("does not mean NS CAPTURES will purchase it");
  });

  it("is a document rather than a stub", () => {
    expect(body.length).toBeGreaterThan(2000);
  });
});
