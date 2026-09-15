import {
  editionBelongsToCollection,
  getEditionCollections,
  type DigitalEdition,
  type EditionCollectionMeta,
  type EditionOwnership,
} from "../../data/editions";

export const TIMEFRAMES = [
  { id: "1h", label: "1h" },
  { id: "6h", label: "6h" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number]["id"];

export const TIMEFRAME_SCALE: Record<Timeframe, number> = {
  "1h": 0.06,
  "6h": 0.3,
  "24h": 1,
  "7d": 2.4,
};

// Illustrative 24h market momentum per collection. Floor price, supply and owners come from
// live inventory and ownership records instead.
export const COLLECTION_MOMENTUM = [
  {
    id: "kyoto-nocturnes",
    change: 28.3,
    volumeGbp: 142500,
    sales: 38,
    sparkline: [12, 14, 13, 17, 19, 18, 24, 28],
  },
  {
    id: "namibian-horizons",
    change: 18.2,
    volumeGbp: 89000,
    sales: 22,
    sparkline: [30, 29, 32, 35, 33, 38, 41, 44],
  },
  {
    id: "korean-peninsula-silences",
    change: 14.5,
    volumeGbp: 68200,
    sales: 17,
    sparkline: [20, 21, 19, 22, 23, 21, 26, 29],
  },
  {
    id: "metropolitan-geometry",
    change: 9.9,
    volumeGbp: 34800,
    sales: 9,
    sparkline: [15, 16, 14, 18, 17, 20, 22, 24],
  },
];

export type TokenStandard = "ERC-721" | "ERC-1155";

// Same rule as the edition page: a Genesis 1/1 is one-of-a-kind, series share a token contract
export const tokenStandardFor = (tier: DigitalEdition["tier"]): TokenStandard =>
  tier === "genesis_1_of_1" ? "ERC-721" : "ERC-1155";

export type CollectionRow = {
  meta: EditionCollectionMeta;
  image: string;
  floorEth: number;
  floorGbp: number;
  supply: number;
  listed: number;
  owners: number;
  change: number;
  volumeGbp: number;
  sales: number;
  sparkline: number[];
  tiers: DigitalEdition["tier"][];
  hasPhysicalTwin: boolean;
  standards: TokenStandard[];
  verified: boolean;
  curated: boolean;
};

export const formatCompactGbp = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatChange = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

/** One row per collection that has published editions, with stats for the given timeframe. */
export function buildCollectionRows(
  editions: DigitalEdition[],
  ownerships: EditionOwnership[],
  timeframe: Timeframe,
): CollectionRow[] {
  const scale = TIMEFRAME_SCALE[timeframe];
  return getEditionCollections().flatMap((meta) => {
    // Same membership rule as getEditionsByCollection, so counts match the collection page
    const items = editions.filter((e) => editionBelongsToCollection(e, meta));
    if (items.length === 0) return [];
    const editionIds = new Set(items.map((e) => e.id));
    const momentum = COLLECTION_MOMENTUM.find((entry) => entry.id === meta.id);
    return [
      {
        meta,
        image: items[0].image,
        floorEth: Math.min(...items.map((e) => e.priceEth)),
        floorGbp: Math.min(...items.map((e) => e.priceGbp)),
        supply: items.reduce((sum, e) => sum + e.totalEditions, 0),
        listed: items.reduce((sum, e) => sum + e.availableEditions, 0),
        owners: new Set(ownerships.filter((o) => editionIds.has(o.editionId)).map((o) => o.ownerId))
          .size,
        change: (momentum?.change ?? 0) * scale,
        volumeGbp: (momentum?.volumeGbp ?? 0) * scale,
        sales: Math.round((momentum?.sales ?? 0) * scale),
        sparkline: momentum?.sparkline ?? [0, 0],
        tiers: [...new Set(items.map((e) => e.tier))],
        hasPhysicalTwin: items.some((e) => e.hasPhysicalTwin),
        standards: [...new Set(items.map((e) => tokenStandardFor(e.tier)))],
        // Every curated collection carries the verified badge wherever it's shown
        verified: true,
        curated: Boolean(meta.curatorStatement),
      },
    ];
  });
}
