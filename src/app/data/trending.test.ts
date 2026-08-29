import { describe, it, expect } from "vitest";
import type { Photo } from "./photos";

/**
 * The trending row on the landing page.
 *
 * It orders on real views alone. Ordering by custom_views would just list
 * whatever an admin last boosted, which needs no query — and the point of this
 * row is that it is the one ranking on the site that is not set by hand.
 *
 * It also stays off the page until the numbers say something. Ranking a dozen
 * photographs that have had one view each is noise dressed as signal, and a
 * thin section reads worse than no section.
 */
const TRENDING_MIN_VIEWS = 10;
const show = (t: Photo[]) => t.length >= 8 && (t[0]?.views ?? 0) >= TRENDING_MIN_VIEWS;

const photo = (id: string, views: number): Photo => ({ id, views }) as Photo;

describe("trending row", () => {
  it("stays hidden while real traffic is thin", () => {
    // The live state today: 33 photographs, none above two views.
    const thin = Array.from({ length: 33 }, (_, i) => photo(`p${i}`, i < 3 ? 2 : 1));
    expect(show(thin)).toBe(false);
  });

  it("stays hidden when only a couple of photographs have been seen", () => {
    expect(show([photo("a", 900), photo("b", 400)])).toBe(false);
  });

  it("appears once there is enough behind it", () => {
    const real = Array.from({ length: 12 }, (_, i) => photo(`p${i}`, 200 - i * 5));
    expect(show(real)).toBe(true);
  });

  it("is empty rather than wrong when nothing has been viewed", () => {
    expect(show([])).toBe(false);
  });
});
