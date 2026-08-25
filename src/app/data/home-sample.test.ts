import { describe, it, expect } from "vitest";
import { sampleForHome } from "./home-sample";
import type { Photo } from "./photos";

const photo = (id: string, photographerId: string): Photo =>
  ({ id, photographerId, photographer: photographerId, title: id }) as Photo;

/** n photographs from one photographer, as a back catalogue arrives. */
const run = (photographerId: string, n: number) =>
  Array.from({ length: n }, (_, i) => photo(`${photographerId}-${i}`, photographerId));

describe("sampleForHome", () => {
  it("stops one photographer taking the whole front page", () => {
    // The real case: 313 arrive at once and everyone else is buried.
    const photos = [...run("ian", 313), ...run("elena", 20), ...run("junghoon", 20)];
    const shown = sampleForHome(photos);

    // Everyone gets the same eight, so 313 buys no more of the page than 20.
    expect(shown.filter((p) => p.photographerId === "ian")).toHaveLength(8);
    expect(shown.filter((p) => p.photographerId === "elena")).toHaveLength(8);
    expect(shown.filter((p) => p.photographerId === "junghoon")).toHaveLength(8);
    expect(shown).toHaveLength(24);
  });

  it("represents everyone before anyone appears twice", () => {
    const photos = [...run("ian", 10), ...run("elena", 10), ...run("junghoon", 10)];
    const shown = sampleForHome(photos, { limit: 6 });
    expect(shown.map((p) => p.id)).toEqual([
      "ian-0",
      "elena-0",
      "junghoon-0",
      "ian-1",
      "elena-1",
      "junghoon-1",
    ]);
  });

  it("takes each photographer's newest first", () => {
    const photos = [...run("ian", 10), ...run("elena", 10)];
    const shown = sampleForHome(photos, { limit: 4 });
    expect(shown.map((p) => p.id)).toEqual(["ian-0", "elena-0", "ian-1", "elena-1"]);
  });

  it("never returns more than the limit", () => {
    const photos = Array.from({ length: 40 }, (_, i) => photo(`p${i}`, `who-${i}`));
    expect(sampleForHome(photos, { limit: 12 })).toHaveLength(12);
  });

  it("does not deal the same photographer past their ceiling", () => {
    const photos = run("ian", 100);
    expect(sampleForHome(photos, { limit: 48, maxPerPhotographer: 8 })).toHaveLength(8);
  });

  it("shows everything when there is barely anything", () => {
    const photos = run("ian", 3);
    expect(sampleForHome(photos)).toHaveLength(3);
  });

  it("copes with an empty library", () => {
    expect(sampleForHome([])).toEqual([]);
  });

  it("does not lose a photograph with no photographer recorded", () => {
    const photos = [photo("orphan", ""), ...run("ian", 10)];
    const shown = sampleForHome(photos, { limit: 6 });
    expect(shown.map((p) => p.id)).toContain("orphan");
  });
});
