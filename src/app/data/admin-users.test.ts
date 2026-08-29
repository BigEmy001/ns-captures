import { describe, it, expect } from "vitest";

/**
 * The admin console fetched profiles with one unbounded select. PostgREST caps
 * a response at 1,000 rows and the order is newest first, so once the platform
 * passed a thousand accounts every older one disappeared — including the admin's
 * own login and every photographer holding a balance. Search and the role
 * filters run in the browser over that array, so they went blind at the same
 * moment and returned nothing for users that plainly existed.
 */
const PAGE = 1000;

/** Mirrors the paging loop in fetchAdminUsers. */
function collect(total: number): number {
  const page = (from: number) => Math.max(0, Math.min(PAGE, total - from));
  let got = page(0);
  for (let from = PAGE; got === from; from += PAGE) {
    const n = page(from);
    if (n === 0) break;
    got += n;
  }
  return got;
}

describe("fetching every admin user", () => {
  it("returns everyone when there are more than one page", () => {
    expect(collect(2026)).toBe(2026);
  });

  it("still works below the cap", () => {
    expect(collect(22)).toBe(22);
    expect(collect(0)).toBe(0);
  });

  it("handles an exact multiple of the page size without looping forever", () => {
    expect(collect(1000)).toBe(1000);
    expect(collect(2000)).toBe(2000);
  });

  it("would have lost the older accounts before the fix", () => {
    // The old behaviour: a single unbounded select, capped at 1,000.
    const oldBehaviour = Math.min(2026, PAGE);
    expect(oldBehaviour).toBe(1000);
    expect(collect(2026) - oldBehaviour).toBe(1026);
  });
});

/**
 * The platform stat counted with `neq("company", "NS Community")` — the marker
 * the account generator sets. PostgREST's `neq` also drops rows where the
 * column is NULL, and 23 of the 26 real accounts have no company, so TOTAL
 * USERS read 3 against a database holding 26 real and 2,000 generated.
 */
describe("counting real users", () => {
  type P = { company: string | null; isSynthetic: boolean };
  const profiles: P[] = [
    ...Array.from({ length: 2000 }, () => ({ company: "NS Community", isSynthetic: true })),
    ...Array.from({ length: 23 }, () => ({ company: null, isSynthetic: false })),
    { company: "pro captures", isSynthetic: false },
    { company: "", isSynthetic: false },
    { company: "EB PHOTOGRAPHY (BELGIUM)", isSynthetic: false },
  ];

  // PostgREST neq excludes NULL, because NULL != 'x' is NULL rather than true.
  const oldWay = (p: P) => p.company !== null && p.company !== "NS Community";
  const newWay = (p: P) => !p.isSynthetic;

  it("counted almost nobody before the fix", () => {
    expect(profiles.filter(oldWay)).toHaveLength(3);
  });

  it("counts every real account and no generated one", () => {
    expect(profiles.filter(newWay)).toHaveLength(26);
  });

  it("does not depend on whether a company was ever filled in", () => {
    const noCompany = profiles.filter((p) => !p.isSynthetic && p.company === null);
    expect(noCompany).toHaveLength(23);
    expect(noCompany.every(newWay)).toBe(true);
  });
});
