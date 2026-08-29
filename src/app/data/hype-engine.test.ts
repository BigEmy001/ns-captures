import { describe, it, expect } from "vitest";

/**
 * The shape of the scheduled activity, mirrored from automate_hype_engine().
 *
 * Two properties matter. The distribution must be long-tailed — a flat spread
 * averages half the ceiling on every photograph every hour, which is the shape
 * that reads as a script rather than as browsing. And likes must never outrun
 * the views they arrived with.
 */
const INTENSITY = {
  subtle: { lo: 0.08, hi: 0.12, ceiling: 6 },
  active: { lo: 0.15, hi: 0.25, ceiling: 15 },
  aggressive: { lo: 0.3, hi: 0.4, ceiling: 28 },
};

const addedViews = (r: number, ceiling: number) => Math.floor(Math.pow(r, 2.6) * ceiling);
const addedLikes = (views: number, r1: number, r2: number) =>
  views === 0 || r1 > 0.35 ? 0 : Math.min(views, Math.floor(Math.pow(r2, 3.0) * 3));

describe("scheduled activity", () => {
  it("is long-tailed rather than flat", () => {
    const draws = Array.from({ length: 20000 }, (_, i) => addedViews((i + 0.5) / 20000, 15));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const flatMean = 15 / 2;
    expect(mean).toBeLessThan(flatMean * 0.65);
    const quiet = draws.filter((v) => v <= 1).length / draws.length;
    expect(quiet).toBeGreaterThan(0.3);
  });

  it("never exceeds the ceiling for its intensity", () => {
    for (const [, cfg] of Object.entries(INTENSITY)) {
      const draws = Array.from({ length: 5000 }, (_, i) =>
        addedViews((i + 0.5) / 5000, cfg.ceiling),
      );
      expect(Math.max(...draws)).toBeLessThan(cfg.ceiling);
      expect(Math.min(...draws)).toBe(0);
    }
  });

  it("never adds more likes than views", () => {
    for (let i = 0; i < 5000; i++) {
      const views = addedViews(Math.random(), 15);
      const likes = addedLikes(views, Math.random(), Math.random());
      expect(likes).toBeLessThanOrEqual(views);
      expect(likes).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves most photographs in a pass with no likes at all", () => {
    let withLikes = 0;
    for (let i = 0; i < 5000; i++) {
      const views = addedViews(Math.random(), 15);
      if (addedLikes(views, Math.random(), Math.random()) > 0) withLikes++;
    }
    expect(withLikes / 5000).toBeLessThan(0.3);
  });

  it("touches a minority of the library on each pass", () => {
    for (const [, cfg] of Object.entries(INTENSITY)) {
      expect(cfg.hi).toBeLessThanOrEqual(0.4);
      expect(cfg.lo).toBeGreaterThan(0);
    }
  });
});
