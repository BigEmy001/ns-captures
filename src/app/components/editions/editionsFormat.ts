import type { Variants } from "framer-motion";
import {
  getEditionCollection,
  type DigitalEdition,
  type EditionActivity,
  type EditionOwnership,
} from "../../data/editions";

// Shared class tokens for the dark editions design (Figma "photo details", node 18:2)
export const monoLabelClass = "font-mono text-xs uppercase leading-[15px] text-(--ed-muted)";

const pressTransition =
  "transition-[background-color,border-color,color,scale,transform] duration-150 active:scale-[0.96]";

export const primaryButtonClass = `inline-flex items-center justify-center gap-2 rounded-full bg-(--ed-primary) font-medium tracking-[-0.15px] text-[#fff] hover:bg-(--ed-primary-hover) disabled:pointer-events-none disabled:bg-(--ed-raised) disabled:text-(--ed-muted) ${pressTransition}`;

export const secondaryButtonClass = `inline-flex items-center justify-center gap-2 rounded-full border border-(--ed-border) bg-(--ed-surface) font-medium tracking-[-0.15px] text-(--ed-text) hover:bg-(--ed-raised) ${pressTransition}`;

export const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-(--ed-border) bg-(--ed-surface) text-(--ed-muted) transition-colors hover:bg-(--ed-raised) hover:text-(--ed-text)";

export const inputClass =
  "h-10 w-full rounded-lg border border-(--ed-border) bg-(--ed-bg) px-3 text-sm text-(--ed-text) outline-none transition-colors placeholder:text-(--ed-muted) focus:border-(--ed-primary)";

export const selectClass =
  "h-10 appearance-none rounded-full border border-(--ed-border) bg-(--ed-surface) pl-4 pr-9 text-sm text-(--ed-text) outline-none transition-colors hover:bg-(--ed-raised) focus:border-(--ed-primary) [&>option]:bg-(--ed-surface)";

export const tableHeadClass = "font-mono text-xs uppercase text-(--ed-muted)";

// Scroll-triggered reveal for page sections
export const sectionReveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { type: "spring", duration: 0.6, bounce: 0 },
} as const;

// One-shot entrance: fade up out of a slight blur. Pass a delay via `custom` when used standalone.
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: (delay?: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.5, bounce: 0, ...(delay ? { delay } : {}) },
    // Drop the filter afterwards so it doesn't create a stacking context for menus
    transitionEnd: { filter: "none" },
  }),
};

export const formatEth = (value: number) => `${Number(value.toFixed(3))} ETH`;
export const formatGbp = (value: number) => `£${value.toLocaleString("en-GB")}`;
export const formatPercent = (value: number) =>
  value < 1 ? `${value.toFixed(2)}%` : `${Math.round(value)}%`;
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const shortHex = (value: string, head = 6, tail = 4) =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Trait rarity pills: the rarer a trait is across the registry, the warmer the tone
export const TRAIT_TONES = {
  rare: "bg-(--ed-tone-rare-bg) text-(--ed-tone-rare-fg)",
  uncommon: "bg-(--ed-tone-uncommon-bg) text-(--ed-tone-uncommon-fg)",
  common: "bg-(--ed-tone-common-bg) text-(--ed-tone-common-fg)",
  base: "bg-(--ed-raised) text-(--ed-muted)",
};

export function traitTone(percent: number) {
  if (percent <= 10) return TRAIT_TONES.rare;
  if (percent <= 25) return TRAIT_TONES.uncommon;
  if (percent <= 50) return TRAIT_TONES.common;
  return TRAIT_TONES.base;
}

export const ACTIVITY_LABELS: Record<EditionActivity["type"], string> = {
  minted: "Minted",
  listed: "Listed",
  purchased: "Sale",
  transferred: "Transfer",
  royalty_paid: "Royalty",
};

export function tierLabel(edition: DigitalEdition) {
  if (edition.tier === "genesis_1_of_1") return "Genesis 1/1";
  if (edition.tier === "physical_twin") return "Physical twin";
  return "Series";
}

export function collectionSlugFor(edition: Pick<DigitalEdition, "collectionName">) {
  if (!edition.collectionName) return "kyoto-nocturnes";
  return (
    getEditionCollection(edition.collectionName)?.id ??
    edition.collectionName.toLowerCase().replace(/\s+/g, "-")
  );
}

// Placeholder ownership used to preview a certificate before an edition has been collected
export function sampleOwnershipFor(edition: DigitalEdition): EditionOwnership {
  return {
    id: `coa-${edition.id}-sample`,
    editionId: edition.id,
    serialNumber: 1,
    serialDisplay:
      edition.tier === "genesis_1_of_1" ? "#01 / 01" : `#01 / ${edition.totalEditions}`,
    ownerId: edition.photographerId,
    ownerName: edition.photographerName,
    acquiredAt: edition.mintedAt,
    purchasePriceGbp: edition.priceGbp,
    purchaseCurrency: "ETH",
    certificateNumber: `COA-${edition.tokenId.replace("NSC-", "")}-01`,
    isListedForResale: false,
  };
}
