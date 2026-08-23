import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONVERSION_FEE_PERCENT,
  quoteConversion,
  formatConverted,
  conversionSummary,
} from "./conversion";
import { currencyForCountry, resolvePayoutCurrency } from "../../lib/countries";

describe("quoteConversion", () => {
  it("never takes the charge out of the payout", () => {
    const q = quoteConversion(10000, 1750, 3.7);
    expect(q.grossConverted).toBe(17_500_000);
    expect(q.feeAmount).toBeCloseTo(647_500, 2);
    // The contributor receives the whole converted amount either way.
    expect(q.netConverted).toBe(17_500_000);
  });

  it("defaults to a 3.7% charge", () => {
    expect(DEFAULT_CONVERSION_FEE_PERCENT).toBe(3.7);
  });

  it("owes nothing when the charge is waived", () => {
    const q = quoteConversion(500, 1.27, 0);
    expect(q.feeAmount).toBe(0);
    expect(q.outstandingGbp).toBe(0);
    expect(q.netConverted).toBeCloseTo(635, 6);
  });

  it("refuses a negative charge, which would be a credit rather than a fee", () => {
    const q = quoteConversion(1000, 2, -10);
    expect(q.feePercent).toBe(0);
    expect(q.outstandingGbp).toBe(0);
  });

  it("caps the charge at the whole amount", () => {
    const q = quoteConversion(1000, 2, 250);
    expect(q.feePercent).toBe(100);
    expect(q.outstandingGbp).toBe(1000);
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
    expect(summary).toContain("payable by the contributor separately");
    expect(summary).toContain("17,500,000 KRW to be delivered");
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

describe("who pays the conversion charge", () => {
  const amount = 10000;
  const rate = 1750;
  const fee = 3.7;

  it("bills the contributor separately rather than reducing their payout", () => {
    const q = quoteConversion(amount, rate, fee, "contributor");
    expect(q.netConverted).toBe(17_500_000);
    expect(q.outstandingGbp).toBeCloseTo(370, 2);
    expect(q.companyCostGbp).toBe(10_000);
  });

  it("leaves nothing owing when NS CAPTURES pays", () => {
    const q = quoteConversion(amount, rate, fee, "company");
    expect(q.netConverted).toBe(17_500_000);
    expect(q.outstandingGbp).toBe(0);
    expect(q.companyCostGbp).toBeCloseTo(10_370, 2);
  });

  it("delivers the same payout either way — only who owes the charge changes", () => {
    const byContributor = quoteConversion(amount, rate, fee, "contributor");
    const byCompany = quoteConversion(amount, rate, fee, "company");

    expect(byContributor.netConverted).toBe(byCompany.netConverted);
    expect(byContributor.feeAmount).toBeCloseTo(byCompany.feeAmount, 6);
    expect(byContributor.outstandingGbp).toBeGreaterThan(0);
    expect(byCompany.outstandingGbp).toBe(0);
  });

  it("defaults to the contributor paying", () => {
    expect(quoteConversion(amount, rate, fee).bearer).toBe("contributor");
  });

  it("says who paid in the summary", () => {
    expect(conversionSummary(quoteConversion(amount, rate, fee, "contributor"), "KRW")).toContain(
      "payable by the contributor separately",
    );
    expect(conversionSummary(quoteConversion(amount, rate, fee, "company"), "KRW")).toContain(
      "is paid by NS CAPTURES",
    );
  });

  it("costs the company nothing extra when the charge is waived", () => {
    const q = quoteConversion(amount, rate, 0, "company");
    expect(q.companyCostGbp).toBe(10_000);
    expect(q.netConverted).toBe(17_500_000);
    expect(q.outstandingGbp).toBe(0);
  });
});

describe("what the admin is shown before confirming", () => {
  // The figures the modal renders, so a change to the arithmetic cannot
  // silently contradict the wording next to it.
  const q = (bearer) => quoteConversion(10000, 1750, 3.7, bearer);

  it("shows the same payout figure whoever bears the charge", () => {
    expect(q("contributor").netConverted).toBe(17_500_000);
    expect(q("company").netConverted).toBe(17_500_000);
  });

  it("shows an amount owed only when the recipient bears it", () => {
    expect(q("contributor").outstandingGbp).toBeCloseTo(370, 2);
    expect(q("company").outstandingGbp).toBe(0);
  });

  it("shows the company paying more only when it absorbs the charge", () => {
    expect(q("contributor").companyCostGbp).toBe(10_000);
    expect(q("company").companyCostGbp).toBeCloseTo(10_370, 2);
  });

  it("never shows a payout reduced by the charge", () => {
    for (const bearer of ["contributor", "company"]) {
      const quote = q(bearer);
      expect(quote.netConverted).toBe(quote.grossConverted);
    }
  });
});
