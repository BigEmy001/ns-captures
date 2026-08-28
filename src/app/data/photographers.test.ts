import { describe, it, expect } from "vitest";
import type { Photographer } from "./photos";

/**
 * The contributors listing on the landing page.
 *
 * fetchPhotographers returned a hardcoded `images: 0`, so every card read
 * "0 images" regardless of portfolio size, and accounts with nothing published
 * — abandoned signups and test rows — sat on the landing page alongside
 * photographers with hundreds of photographs.
 */
type Row = { id: string; name: string };

/** What fetchPhotographers returns: everyone, counted, largest first. */
function listing(rows: Row[], counts: Record<string, number>): Photographer[] {
  return rows
    .map((p) => ({ ...p, images: counts[p.id] || 0 }) as Photographer)
    .sort((a, b) => b.images - a.images);
}

/** What the landing page shows from it. */
const MIN_PORTFOLIO = 50;
const MAX_CONTRIBUTORS = 4;
const featured = (all: Photographer[]) =>
  all.filter((p) => p.images >= MIN_PORTFOLIO).slice(0, MAX_CONTRIBUTORS);

const rows: Row[] = [
  { id: "ian-dandribe-2cf5f251", name: "Ian Dandribe" },
  { id: "clive-varley-8725169f", name: "Clive Varley" },
  { id: "haru-tanaka", name: "Haru Tanaka" },
  { id: "test-photographer-4aa21389", name: "Test Photographer" },
  { id: "email-change-probe-254b910f", name: "Email Change Probe" },
];
const counts = {
  "ian-dandribe-2cf5f251": 313,
  "clive-varley-8725169f": 12,
  "haru-tanaka": 187,
};

describe("contributors listing", () => {
  it("shows the real portfolio size rather than zero", () => {
    const out = listing(rows, counts);
    expect(out.find((p) => p.name === "Ian Dandribe")!.images).toBe(313);
    expect(out.find((p) => p.name === "Clive Varley")!.images).toBe(12);
    expect(out.find((p) => p.name === "Test Photographer")!.images).toBe(0);
  });

  it("puts the largest portfolios first", () => {
    expect(listing(rows, counts).map((p) => p.images)).toEqual([313, 187, 12, 0, 0]);
  });

  it("keeps everyone in the list, so a creator can find their own profile", () => {
    // CreatorTabs looks itself up here by slug. Dropping photographers with
    // nothing published would hide a new creator from their own dashboard.
    const names = listing(rows, counts).map((p) => p.name);
    expect(names).toContain("Test Photographer");
    expect(names).toHaveLength(5);
  });
});

describe("what the landing page shows", () => {
  it("takes only established photographers", () => {
    const names = featured(listing(rows, counts)).map((p) => p.name);
    expect(names).toEqual(["Ian Dandribe", "Haru Tanaka"]);
    expect(names).not.toContain("Clive Varley");
    expect(names).not.toContain("Test Photographer");
  });

  it("shows a handful rather than the whole roster", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      images: 100 + i,
    })) as Photographer[];
    expect(featured(many)).toHaveLength(MAX_CONTRIBUTORS);
  });

  it("shows nothing rather than a row of thin portfolios", () => {
    const small = [{ id: "a", name: "A", images: 12 }] as Photographer[];
    expect(featured(small)).toEqual([]);
  });
});
