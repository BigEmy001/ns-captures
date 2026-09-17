import type { Photo } from "./photos";
import { supabase } from "../../lib/supabase";

/**
 * Licensing: which licences a photograph can be bought under, and what each costs.
 *
 * - `photos.price` is the Commercial price. For a photo that can only be sold under one licence
 *   (editorial-only or exclusive-only) it is that licence's price.
 * - `photos.license_prices` holds a photographer's own Editorial, Extended and Exclusive prices.
 *   When it is empty, NS CAPTURES works those out from the Commercial price.
 *
 * The photo page, the upload form and checkout all price through here, so they can't disagree.
 */

export type LicenseTier = "COMMERCIAL" | "EDITORIAL" | "EXTENDED" | "EXCLUSIVE";
export type LicensePrices = Partial<Record<LicenseTier, number>>;
/** Licences a photographer can price themselves; Commercial is always `photos.price` */
export type OverridableTier = Exclude<LicenseTier, "COMMERCIAL">;

export interface LicenseTierInfo {
  id: LicenseTier;
  label: string;
  /** Automatic price as a multiple of the Commercial price */
  multiplier: number;
  usage: string;
  restrictions: string;
  duration: string;
  coverage: string;
}

export const LICENSE_TIERS: readonly LicenseTierInfo[] = [
  {
    id: "COMMERCIAL",
    label: "Commercial",
    multiplier: 1,
    usage: "Ads, packaging, web & social for a business.",
    restrictions: "No resale as stock.",
    duration: "Perpetual",
    coverage: "Worldwide",
  },
  {
    id: "EDITORIAL",
    label: "Editorial",
    multiplier: 0.7,
    usage: "News, blogs, education & non-commercial.",
    restrictions: "No commercial promotion.",
    duration: "Perpetual",
    coverage: "Worldwide",
  },
  {
    id: "EXTENDED",
    label: "Extended",
    multiplier: 2.4,
    usage: "Merchandise for resale, unlimited prints.",
    restrictions: "None.",
    duration: "Perpetual",
    coverage: "Worldwide",
  },
  {
    id: "EXCLUSIVE",
    label: "Exclusive",
    multiplier: 6,
    usage: "Sole rights — removed from the library.",
    restrictions: "Buyer owns exclusive use.",
    duration: "Perpetual",
    coverage: "Worldwide",
  },
];

const TIER_IDS: LicenseTier[] = LICENSE_TIERS.map((tier) => tier.id);
export const OVERRIDABLE_TIERS: OverridableTier[] = ["EDITORIAL", "EXTENDED", "EXCLUSIVE"];

export const isLicenseTier = (value: string): value is LicenseTier =>
  (TIER_IDS as string[]).includes(value);

export const tierInfo = (tier: LicenseTier): LicenseTierInfo =>
  LICENSE_TIERS.find((info) => info.id === tier) ?? LICENSE_TIERS[0];

/** Human wording for how a multiplier relates to the Commercial price */
export const multiplierLabel = (tier: LicenseTier) => {
  const { multiplier } = tierInfo(tier);
  return multiplier < 1
    ? `${Math.round(multiplier * 100)}% of Commercial`
    : `${multiplier}× Commercial`;
};

type Rights = Pick<Photo, "license"> & Partial<Pick<Photo, "modelRelease" | "propertyRelease">>;
type Priced = Rights & Pick<Photo, "price"> & { licensePrices?: LicensePrices };

/**
 * Licences a photo can be sold under. A photo marked "Editorial only", or showing people or
 * property without a signed release, can't be licensed commercially. An "Exclusive" photo is only
 * sold outright.
 */
export function offeredTiers(photo: Rights): LicenseTier[] {
  if (
    photo.license === "EDITORIAL" ||
    photo.modelRelease === "none" ||
    photo.propertyRelease === "none"
  ) {
    return ["EDITORIAL"];
  }
  if (photo.license === "EXCLUSIVE") return ["EXCLUSIVE"];
  return [...TIER_IDS];
}

/** NS CAPTURES' price for a licence, worked out from the Commercial price, to the nearest pound */
export function automaticPrice(commercialPrice: number, tier: LicenseTier): number {
  return Math.max(Math.round(commercialPrice * tierInfo(tier).multiplier), 0);
}

function allTierPrices(base: number, overrides?: LicensePrices): Record<LicenseTier, number> {
  const prices = {} as Record<LicenseTier, number>;
  for (const tier of TIER_IDS) {
    prices[tier] = tier === "COMMERCIAL" ? base : (overrides?.[tier] ?? automaticPrice(base, tier));
  }
  return prices;
}

/** The price of every licence the photo is offered under */
export function resolveLicensePrices(photo: Priced): LicensePrices {
  const tiers = offeredTiers(photo);
  const base = Math.max(photo.price || 0, 0);
  if (tiers.length === 1) return { [tiers[0]]: base };
  const all = allTierPrices(base, photo.licensePrices);
  return Object.fromEntries(tiers.map((tier) => [tier, all[tier]])) as LicensePrices;
}

/** One licence's price, or null when the photo isn't sold under that licence */
export function licensePriceFor(photo: Priced, license: string): number | null {
  if (!isLicenseTier(license)) return null;
  return resolveLicensePrices(photo)[license] ?? null;
}

/** Whether the photographer has set any of their own licence prices */
export const hasCustomPrices = (photo: { licensePrices?: LicensePrices }) =>
  OVERRIDABLE_TIERS.some((tier) => typeof photo.licensePrices?.[tier] === "number");

/** Reads `photos.license_prices`, keeping only whole, positive prices for known licences */
export function parseLicensePrices(value: unknown): LicensePrices | undefined {
  if (!value || typeof value !== "object") return undefined;
  const prices: LicensePrices = {};
  for (const tier of OVERRIDABLE_TIERS) {
    const raw = Number((value as Record<string, unknown>)[tier]);
    if (Number.isFinite(raw) && raw > 0) prices[tier] = Math.round(raw);
  }
  return Object.keys(prices).length > 0 ? prices : undefined;
}

// ------------------------------------------------------------------
// Editing (upload form and portfolio)
// ------------------------------------------------------------------

export type PricingMode = "auto" | "custom";

/** What the pricing form holds while it is being edited; prices are strings as typed */
export interface LicensePricingValue {
  mode: PricingMode;
  /** The Commercial price, or the only licence's price */
  base: string;
  /** The photographer's own prices, used when mode is "custom" */
  custom: Record<OverridableTier, string>;
}

const automaticOverrides = (base: number): Record<OverridableTier, string> => ({
  EDITORIAL: String(automaticPrice(base, "EDITORIAL")),
  EXTENDED: String(automaticPrice(base, "EXTENDED")),
  EXCLUSIVE: String(automaticPrice(base, "EXCLUSIVE")),
});

export function newPricingValue(base = "1000"): LicensePricingValue {
  return { mode: "auto", base, custom: automaticOverrides(Number(base) || 0) };
}

export function pricingValueFromPhoto(photo: Priced): LicensePricingValue {
  const base = Math.max(photo.price || 0, 0);
  const all = allTierPrices(base, photo.licensePrices);
  return {
    mode: hasCustomPrices(photo) ? "custom" : "auto",
    base: String(base),
    custom: {
      EDITORIAL: String(all.EDITORIAL),
      EXTENDED: String(all.EXTENDED),
      EXCLUSIVE: String(all.EXCLUSIVE),
    },
  };
}

/** Switching to "Set my own" starts from the automatic prices, so nothing jumps */
export function withPricingMode(value: LicensePricingValue, mode: PricingMode) {
  if (mode === value.mode) return value;
  return mode === "custom"
    ? { ...value, mode, custom: automaticOverrides(Number(value.base) || 0) }
    : { ...value, mode };
}

const parsePrice = (raw: string) => {
  const value = Number(raw);
  return raw.trim() !== "" && Number.isFinite(value) && value >= 1 ? Math.round(value) : null;
};

const PRICE_ERROR = "Enter a price of at least £1";

export interface PricingCheck {
  /** Licences this photo is offered under */
  tiers: LicenseTier[];
  /** What buyers will pay for each of them (missing while a field is invalid) */
  prices: LicensePrices;
  errors: Partial<Record<LicenseTier, string>>;
  /** A nudge when the prices are in an unusual order; saving is still allowed */
  warning: string | null;
}

export function checkPricing(value: LicensePricingValue, rights: Rights): PricingCheck {
  const tiers = offeredTiers(rights);
  const errors: PricingCheck["errors"] = {};
  const prices: LicensePrices = {};
  const base = parsePrice(value.base);

  if (tiers.length === 1) {
    if (base === null) errors[tiers[0]] = PRICE_ERROR;
    else prices[tiers[0]] = base;
    return { tiers, prices, errors, warning: null };
  }

  if (base === null) errors.COMMERCIAL = PRICE_ERROR;
  else prices.COMMERCIAL = base;

  for (const tier of OVERRIDABLE_TIERS) {
    if (value.mode === "auto") {
      if (base !== null) prices[tier] = automaticPrice(base, tier);
      continue;
    }
    const own = parsePrice(value.custom[tier]);
    if (own === null) errors[tier] = PRICE_ERROR;
    else prices[tier] = own;
  }

  let warning: string | null = null;
  if (value.mode === "custom") {
    const { COMMERCIAL: c, EDITORIAL: e, EXTENDED: x, EXCLUSIVE: s } = prices;
    if (c !== undefined && e !== undefined && e > c) {
      warning = "Editorial is usually priced below Commercial.";
    } else if (c !== undefined && x !== undefined && x < c) {
      warning = "Extended covers more than Commercial, so it's usually priced higher.";
    } else if (x !== undefined && s !== undefined && s < x) {
      warning = "Exclusive is usually your highest price.";
    }
  }

  return { tiers, prices, errors, warning };
}

export interface PricingToSave {
  price: number;
  /** null means NS CAPTURES sets the other prices */
  licensePrices: LicensePrices | null;
}

/** What to store for a pricing form, or null while any price is invalid */
export function pricingToSave(value: LicensePricingValue, rights: Rights): PricingToSave | null {
  const check = checkPricing(value, rights);
  if (Object.keys(check.errors).length > 0) return null;
  const price = check.prices[check.tiers[0]] ?? 0;
  if (check.tiers.length === 1 || value.mode === "auto") return { price, licensePrices: null };
  return {
    price,
    licensePrices: {
      EDITORIAL: check.prices.EDITORIAL,
      EXTENDED: check.prices.EXTENDED,
      EXCLUSIVE: check.prices.EXCLUSIVE,
    },
  };
}

/**
 * Stores a photographer's own licence prices (null clears them). Returns false rather than
 * throwing, e.g. before the license_prices migration has been applied.
 */
export async function saveLicensePrices(
  photoId: string,
  prices: LicensePrices | null,
): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .update({ license_prices: prices })
    .eq("id", photoId);
  if (error) {
    console.error("saveLicensePrices", error);
    return false;
  }
  return true;
}
