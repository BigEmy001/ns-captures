import { describe, it, expect } from "vitest";
import { getDisplayViews, getDisplayLikes, getDisplayDownloads } from "./photos";

describe("displayed photo metrics", () => {
  it("adds real traffic on top of the Hype Engine baseline", () => {
    expect(getDisplayViews({ customViews: 410892, views: 17 })).toBe(410909);
    expect(getDisplayLikes({ customLikes: 67342, likes: 3 })).toBe(67345);
    expect(getDisplayDownloads({ customDownloads: 29, downloads: 2 })).toBe(31);
  });

  it("shows real traffic untouched when no baseline is set", () => {
    expect(getDisplayViews({ views: 42 })).toBe(42);
    expect(getDisplayLikes({ likes: 7 })).toBe(7);
    expect(getDisplayDownloads({ downloads: 1 })).toBe(1);
  });

  it("shows the baseline alone before anyone has visited", () => {
    expect(getDisplayViews({ customViews: 500000, views: 0 })).toBe(500000);
    expect(getDisplayLikes({ customLikes: 1200, likes: 0 })).toBe(1200);
    expect(getDisplayDownloads({ customDownloads: 40, downloads: 0 })).toBe(40);
  });

  it("returns zero for a photograph with neither", () => {
    expect(getDisplayViews({})).toBe(0);
    expect(getDisplayLikes({})).toBe(0);
    expect(getDisplayDownloads({})).toBe(0);
  });

  it("moves by exactly one when a single visitor arrives", () => {
    const before = getDisplayViews({ customViews: 1135515, views: 0 });
    const after = getDisplayViews({ customViews: 1135515, views: 1 });
    expect(before).toBe(1135515);
    expect(after).toBe(1135516);
    expect(after - before).toBe(1);
  });

  it("never hides real traffic behind a larger baseline, as Math.max did", () => {
    // The old behaviour showed max(real, custom): a photograph carrying a
    // 400,000 baseline displayed nothing for its first 400,000 real visitors.
    const photo = { customViews: 400000, views: 5 };
    expect(Math.max(photo.views, photo.customViews)).toBe(400000);
    expect(getDisplayViews(photo)).toBe(400005);
  });

  it("treats undefined and zero the same way", () => {
    expect(getDisplayViews({ customViews: undefined, views: 9 })).toBe(9);
    expect(getDisplayViews({ customViews: 0, views: 9 })).toBe(9);
    expect(getDisplayDownloads({ customDownloads: 3, downloads: undefined })).toBe(3);
  });
});
