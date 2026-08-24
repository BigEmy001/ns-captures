import { describe, it, expect } from "vitest";
import { COUNTRIES, currencyForCountry, resolvePayoutCurrency } from "./countries";

describe("currencyForCountry", () => {
  it("maps a country to the money its people are actually paid in", () => {
    expect(currencyForCountry("Belgium")).toBe("EUR");
    expect(currencyForCountry("South Korea")).toBe("KRW");
    expect(currencyForCountry("Japan")).toBe("JPY");
    expect(currencyForCountry("United Kingdom")).toBe("GBP");
  });

  it("knows nothing about a country it has never heard of", () => {
    expect(currencyForCountry("Atlantis")).toBeUndefined();
    expect(currencyForCountry("")).toBeUndefined();
    expect(currencyForCountry(null)).toBeUndefined();
  });
});

describe("resolvePayoutCurrency", () => {
  it("honours an explicit choice over the country", () => {
    // Someone living in Belgium may still bank in dollars.
    expect(resolvePayoutCurrency("USD", "Belgium")).toBe("USD");
  });

  it("falls back to the country when nothing was chosen", () => {
    expect(resolvePayoutCurrency(null, "Belgium")).toBe("EUR");
    expect(resolvePayoutCurrency("", "South Korea")).toBe("KRW");
  });

  it("lands on GBP only when there is nothing to go on", () => {
    // This is the case the signup requirement exists to prevent: with no
    // country, everyone silently becomes a sterling payout.
    expect(resolvePayoutCurrency(null, null)).toBe("GBP");
    expect(resolvePayoutCurrency(null, "")).toBe("GBP");
    expect(resolvePayoutCurrency(null, "Atlantis")).toBe("GBP");
  });
});

describe("the country list", () => {
  it("offers a real choice", () => {
    expect(COUNTRIES.length).toBeGreaterThan(90);
  });

  it("gives every country a currency, so no choice can dead-end", () => {
    const missing = COUNTRIES.filter((c) => !currencyForCountry(c.name));
    expect(missing.map((c) => c.name)).toEqual([]);
  });

  it("has no duplicate entries", () => {
    const names = COUNTRIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
