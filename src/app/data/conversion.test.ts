import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONVERSION_FEE_PERCENT,
  quoteConversion,
  formatConverted,
  conversionSummary,
} from "./conversion";
import { currencyForCountry, resolvePayoutCurrency } from "../../lib/countries";

describe("quoteConversion", () => {
  it("converts, then takes the charge off the converted amount", () => {
    const q = quoteConversion(10000, 1750, 3.7);
    expect(q.grossConverted).toBe(17_500_000);
    expect(q.feeAmount).toBeCloseTo(647_500, 2);
    expect(q.netConverted).toBeCloseTo(16_852_500, 2);
  });

  it("defaults to a 3.7% charge", () => {
    expect(DEFAULT_CONVERSION_FEE_PERCENT).toBe(3.7);
  });

  it("pays out the full converted amount when the charge is waived", () => {
    const q = quoteConversion(500, 1.27, 0);
    expect(q.feeAmount).toBe(0);
    expect(q.netConverted).toBeCloseTo(635, 6);
  });

  it("refuses a negative charge, which would pay out more than was converted", () => {
    const q = quoteConversion(1000, 2, -10);
    expect(q.feePercent).toBe(0);
    expect(q.netConverted).toBe(2000);
  });

  it("caps the charge at the whole amount", () => {
    const q = quoteConversion(1000, 2, 250);
    expect(q.feePercent).toBe(100);
    expect(q.netConverted).toBe(0);
  });

  it("treats a missing rate as nothing converted rather than NaN", () => {
    const q = quoteConversion(1000, Number.NaN, 3.7);
    expect(q.netConverted).toBe(0);
    expect(Number.isNaN(q.netConverted)).toBe(false);
  });
});

describe("formatConverted", () => {
  it("writes zero-decimal currencies without decimals", () => {
    expect(formatConverted(16852500, "KRW")).toBe("16,852,500 KRW");
    expect(formatConverted(1250000, "JPY")).toBe("1,250,000 JPY");
  });

  it("keeps decimals for currencies that use them", () => {
    expect(formatConverted(635, "EUR")).toBe("635.00 EUR");
  });
});

describe("conversionSummary", () => {
  it("states the rate, the charge and what will be delivered", () => {
    const summary = conversionSummary(quoteConversion(10000, 1750, 3.7), "KRW");
    expect(summary).toContain("£10,000");
    expect(summary).toContain("1,750 KRW/£");
    expect(summary).toContain("3.7% conversion charge");
    expect(summary).toContain("16,852,500 KRW to be delivered");
  });
});

describe("country to payout currency", () => {
  it("maps a contributor's country to the currency used there", () => {
    expect(currencyForCountry("South Korea")).toBe("KRW");
    expect(currencyForCountry("Germany")).toBe("EUR");
    expect(currencyForCountry("United Kingdom")).toBe("GBP");
  });

  it("is forgiving about spacing and case", () => {
    expect(currencyForCountry("  south korea ")).toBe("KRW");
  });

  it("returns nothing for a country we don't cover", () => {
    expect(currencyForCountry("Atlantis")).toBeUndefined();
    expect(currencyForCountry("")).toBeUndefined();
  });

  it("prefers an explicit choice over the country default", () => {
    expect(resolvePayoutCurrency("USD", "South Korea")).toBe("USD");
  });

  it("falls back to the country, then to GBP", () => {
    expect(resolvePayoutCurrency(null, "Japan")).toBe("JPY");
    expect(resolvePayoutCurrency(null, "Atlantis")).toBe("GBP");
    expect(resolvePayoutCurrency(null, null)).toBe("GBP");
  });
});
