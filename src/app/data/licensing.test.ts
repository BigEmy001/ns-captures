import { describe, it, expect } from "vitest";
import {
  automaticPrice,
  checkPricing,
  licensePriceFor,
  newPricingValue,
  offeredTiers,
  parseLicensePrices,
  pricingToSave,
  pricingValueFromPhoto,
  resolveLicensePrices,
  withPricingMode,
} from "./licensing";

const commercial = { license: "COMMERCIAL" as const, price: 1500 };

describe("licence prices", () => {
  it("works out the other licences from the Commercial price", () => {
    expect(resolveLicensePrices(commercial)).toEqual({
      COMMERCIAL: 1500,
      EDITORIAL: 1050,
      EXTENDED: 3600,
      EXCLUSIVE: 9000,
    });
    expect(automaticPrice(999, "EDITORIAL")).toBe(699);
  });

  it("uses the photographer's own prices where set, but Commercial is always the listed price", () => {
    const photo = { ...commercial, licensePrices: { EDITORIAL: 900, EXCLUSIVE: 12000 } };
    expect(resolveLicensePrices(photo)).toEqual({
      COMMERCIAL: 1500,
      EDITORIAL: 900,
      EXTENDED: 3600,
      EXCLUSIVE: 12000,
    });
  });

  it("sells editorial-only photos, and photos missing a release, under Editorial only", () => {
    expect(offeredTiers({ license: "EDITORIAL" })).toEqual(["EDITORIAL"]);
    expect(offeredTiers({ license: "COMMERCIAL", modelRelease: "none" })).toEqual(["EDITORIAL"]);
    expect(offeredTiers({ license: "COMMERCIAL", propertyRelease: "none" })).toEqual(["EDITORIAL"]);
    expect(resolveLicensePrices({ license: "EDITORIAL", price: 400 })).toEqual({ EDITORIAL: 400 });
  });

  it("sells exclusive photos outright only", () => {
    expect(resolveLicensePrices({ license: "EXCLUSIVE", price: 8000 })).toEqual({
      EXCLUSIVE: 8000,
    });
  });

  it("treats royalty-free and released photos like commercial ones", () => {
    expect(offeredTiers({ license: "ROYALTY FREE", modelRelease: "held" })).toHaveLength(4);
  });

  it("refuses a licence the photo isn't offered under", () => {
    expect(licensePriceFor({ license: "EDITORIAL", price: 400 }, "COMMERCIAL")).toBeNull();
    expect(licensePriceFor(commercial, "ROYALTY FREE")).toBeNull();
    expect(licensePriceFor(commercial, "EXTENDED")).toBe(3600);
  });

  it("keeps only valid stored prices", () => {
    expect(parseLicensePrices(null)).toBeUndefined();
    expect(parseLicensePrices({ EDITORIAL: "800", EXTENDED: -5, COMMERCIAL: 99, junk: 1 })).toEqual(
      {
        EDITORIAL: 800,
      },
    );
    expect(parseLicensePrices({})).toBeUndefined();
  });
});

describe("pricing form", () => {
  it("saves only the Commercial price when NS CAPTURES sets the rest", () => {
    expect(pricingToSave(newPricingValue("1500"), commercial)).toEqual({
      price: 1500,
      licensePrices: null,
    });
  });

  it("starts 'Set my own' from the automatic prices", () => {
    const custom = withPricingMode(newPricingValue("1500"), "custom");
    expect(custom.custom).toEqual({ EDITORIAL: "1050", EXTENDED: "3600", EXCLUSIVE: "9000" });
  });

  it("saves every price the photographer sets", () => {
    const value = {
      mode: "custom" as const,
      base: "1500",
      custom: { EDITORIAL: "1000", EXTENDED: "4000", EXCLUSIVE: "10000" },
    };
    expect(pricingToSave(value, commercial)).toEqual({
      price: 1500,
      licensePrices: { EDITORIAL: 1000, EXTENDED: 4000, EXCLUSIVE: 10000 },
    });
  });

  it("uses the single price for an editorial-only photo", () => {
    const value = withPricingMode(newPricingValue("450"), "custom");
    expect(pricingToSave(value, { license: "EDITORIAL" })).toEqual({
      price: 450,
      licensePrices: null,
    });
  });

  it("blocks empty or zero prices and flags unusual orders", () => {
    const value = {
      mode: "custom" as const,
      base: "1500",
      custom: { EDITORIAL: "", EXTENDED: "4000", EXCLUSIVE: "10000" },
    };
    expect(checkPricing(value, commercial).errors.EDITORIAL).toBeTruthy();
    expect(pricingToSave(value, commercial)).toBeNull();
    expect(checkPricing({ ...newPricingValue("0") }, commercial).errors.COMMERCIAL).toBeTruthy();

    const odd = { ...value, custom: { EDITORIAL: "2000", EXTENDED: "4000", EXCLUSIVE: "10000" } };
    expect(checkPricing(odd, commercial).warning).toMatch(/Editorial/);
    expect(pricingToSave(odd, commercial)).not.toBeNull();
  });

  it("reopens a photo with its own prices in 'Set my own'", () => {
    const value = pricingValueFromPhoto({ ...commercial, licensePrices: { EXTENDED: 5000 } });
    expect(value.mode).toBe("custom");
    expect(value.custom).toEqual({ EDITORIAL: "1050", EXTENDED: "5000", EXCLUSIVE: "9000" });
    expect(pricingValueFromPhoto(commercial).mode).toBe("auto");
  });
});
