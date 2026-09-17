import { describe, it, expect } from "vitest";
import { formatOtherPrices, formatPrice, PRICE_CURRENCY_OPTIONS } from "./editionsFormat";

const edition = { priceGbp: 1850, priceEth: 0.72 };

describe("edition price formatting", () => {
  it("offers NSC first, then GBP, then ETH", () => {
    expect(PRICE_CURRENCY_OPTIONS.map((option) => option.id)).toEqual(["nsc", "gbp", "eth"]);
  });

  it("formats a price in each currency from the list price", () => {
    expect(formatPrice(edition, "nsc")).toBe("1,850 NSC");
    expect(formatPrice(edition, "gbp")).toBe("£1,850");
    expect(formatPrice(edition, "eth")).toBe("0.72 ETH");
  });

  it("shows the other two currencies, in order, under the main price", () => {
    expect(formatOtherPrices(edition, "nsc")).toBe("≈ £1,850 · 0.72 ETH");
    expect(formatOtherPrices(edition, "gbp")).toBe("≈ 1,850 NSC · 0.72 ETH");
    expect(formatOtherPrices(edition, "eth")).toBe("≈ 1,850 NSC · £1,850");
  });
});
