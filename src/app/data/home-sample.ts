import type { Photo } from "./photos";

/**
 * Choosing what the front page shows.
 *
 * The grid used to render every published photograph, newest first. That is
 * fine while uploads trickle in and ruinous the moment somebody arrives with a
 * back catalogue: three hundred photographs from one photographer took the
 * whole front page, and nobody else's work appeared until the reader had
 * scrolled past all of them.
 *
 * So it deals one photograph at a time from each photographer in turn, taking
 * their newest first. Everyone is represented before anyone is represented
 * twice, and the balance holds whether there are three photographers or fifty.
 * The rest of the library is one click away.
 */
export function sampleForHome(
  photos: Photo[],
  { limit = 48, maxPerPhotographer = 8 }: { limit?: number; maxPerPhotographer?: number } = {},
): Photo[] {
  if (photos.length === 0) return [];

  // Grouped in the order they arrived, so newest-first survives inside each
  // photographer and the first photographer dealt is the one with the newest
  // photograph overall.
  const byPhotographer = new Map<string, Photo[]>();
  for (const photo of photos) {
    const who = photo.photographerId || photo.photographer || `unknown-${photo.id}`;
    const run = byPhotographer.get(who);
    if (run) run.push(photo);
    else byPhotographer.set(who, [photo]);
  }

  const runs = [...byPhotographer.values()];
  const chosen: Photo[] = [];

  for (let round = 0; round < maxPerPhotographer; round++) {
    let dealtThisRound = false;

    for (const run of runs) {
      if (round >= run.length) continue;
      chosen.push(run[round]);
      dealtThisRound = true;
      if (chosen.length === limit) return chosen;
    }

    // Everyone is exhausted; another round would deal nothing.
    if (!dealtThisRound) break;
  }

  return chosen;
}
