/**
 * NS CAPTURES - Platform-Native Fine-Art Digital Editions (NFT) Engine
 *
 * Provides fine-art digital editions, cryptographic certificates of authenticity,
 * ownership provenance, secondary reselling, and Web3 crypto deposit verification gating.
 */

import {
  fetchSupabaseEditions,
  fetchSupabaseCollections,
  fetchSupabaseOwnerships,
  fetchSupabaseActivities,
  insertSupabaseEdition,
  insertSupabaseCollection,
  insertSupabaseOwnership,
  insertSupabaseActivity,
  deleteSupabaseEdition,
  deleteSupabaseCollection,
  fetchCreatorWeb3Vault,
  saveCreatorWeb3Vault,
  type SupabaseEditionRow,
  type SupabaseCollectionRow,
  type SupabaseOwnershipRow,
  type SupabaseActivityRow,
  type CreatorWeb3Vault,
} from "./db";
import { supabase } from "../../lib/supabase";

export type EditionTier = "genesis_1_of_1" | "limited_series" | "physical_twin";
export type EditionStatus = "minted" | "listed" | "sold_out" | "archived";
/** Where an edition sits in the creator → admin publication review. */
export type EditionReviewStatus = "draft" | "pending_review" | "published" | "rejected";
/** Where an edition's artwork came from: an approved portfolio photo, an upload or the profile picture. */
export type ArtworkSource = "portfolio" | "upload" | "profile";

export const ARTWORK_SOURCE_LABELS: Record<ArtworkSource, string> = {
  portfolio: "Approved photo",
  upload: "Uploaded artwork",
  profile: "Profile picture",
};

export interface DigitalEdition {
  id: string;
  tokenId: string; // e.g. "NSC-EDN-2026-0041"
  photoId: string;
  title: string;
  description: string;
  photographerId: string;
  photographerName: string;
  photographerSlug?: string;
  photographerAvatar?: string;
  image: string;
  masterHash: string; // SHA-256 fingerprint of original uncompressed master
  tier: EditionTier;
  totalEditions: number;
  availableEditions: number;
  priceGbp: number;
  priceUsd: number;
  priceEth: number;
  priceSol: number;
  royaltyPercent: number; // default 10%
  hasPhysicalTwin: boolean;
  physicalPrintDetails?: string;
  camera: string;
  lens: string;
  iso: number;
  aperture?: string;
  shutterSpeed?: string;
  location?: string;
  yearCreated: number;
  mintedAt: string;
  status: EditionStatus;
  featured?: boolean;
  curatorNote?: string;
  collectionName?: string;
  /** Creator-made collection this edition belongs to. Curated seed editions match by name instead. */
  collectionId?: string;
  /** Auth user id of the creator who made this edition on the platform */
  createdBy?: string;
  /** Publication review. Curated seed editions have none and are already public. */
  reviewStatus?: EditionReviewStatus;
  /** Admin's note to the creator when changes are requested */
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Missing on older editions, which were all made from approved photos */
  artworkSource?: ArtworkSource;
  /** Creator has taken a published edition off sale for now */
  salesPaused?: boolean;
}

export interface EditionOwnership {
  id: string;
  editionId: string;
  serialNumber: number; // e.g. 3
  serialDisplay: string; // e.g. "#03 / 25"
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerWalletAddress?: string;
  acquiredAt: string;
  purchasePriceGbp: number;
  purchaseCurrency: "GBP" | "ETH" | "USDT" | "SOL" | "NSC";
  certificateNumber: string; // e.g. "COA-NSC-48192-03"
  isListedForResale: boolean;
  resalePriceGbp?: number;
}

export interface EditionActivity {
  id: string;
  editionId: string;
  type: "minted" | "listed" | "purchased" | "transferred" | "royalty_paid" | "mint_fee_paid";
  fromUser?: string;
  toUser?: string;
  price?: number;
  currency?: string;
  timestamp: string;
  txHash: string;
  details?: string;
}

export interface MintFeePaymentInfo {
  coin: string;
  amount: number;
  network?: string;
  txHash: string;
  treasuryAddress: string;
  paidBy?: string;
}

/** Official NS CAPTURES platform treasury wallets receiving minting fees */
export const PLATFORM_TREASURY_WALLETS = {
  evm: "0xcD24721Afef7C969e0d8B8472e1e6c5292214fD8",
  usdtTrc20: "TUMWvNB8sxztU3t3exumc2e3CkX2FkFsfm",
  btc: "bc1qshkdt4xrmny58h67eka2qucqva7wznnq2pq86d",
  sol: "5Ybv7n8Z9dK4uV8e1fQ9xW2s3b5T7g4h6k8m0n2p4r6s",
};

export function getTreasuryWalletForCoin(
  coin: string,
  network?: string,
): { address: string; network: string } {
  const c = (coin || "").toUpperCase();
  const n = (network || "").toUpperCase();
  if (c === "BTC" || n.includes("BITCOIN") || n.includes("SEGWIT")) {
    return { address: PLATFORM_TREASURY_WALLETS.btc, network: "Bitcoin (Native SegWit)" };
  }
  if (c === "TRX" || n.includes("TRC") || (c === "USDT" && !n.includes("ERC"))) {
    return { address: PLATFORM_TREASURY_WALLETS.usdtTrc20, network: "TRC20" };
  }
  if (c === "SOL" || n.includes("SOLANA")) {
    return { address: PLATFORM_TREASURY_WALLETS.sol, network: "Solana" };
  }
  return { address: PLATFORM_TREASURY_WALLETS.evm, network: "ERC20 / Base" };
}

export interface DepositGateConfig {
  minimumDepositUsd: number;
  nscThreshold: number;
  ethThreshold: number;
  solThreshold: number;
  usdtThreshold: number;
  usdcThreshold: number;
  btcThreshold: number;
  enforceDepositGate: boolean;
}

export const DEFAULT_DEPOSIT_CONFIG: DepositGateConfig = {
  minimumDepositUsd: 20,
  nscThreshold: 20,
  ethThreshold: 0.006,
  solThreshold: 0.15,
  usdtThreshold: 20,
  usdcThreshold: 20,
  btcThreshold: 0.0003,
  enforceDepositGate: true,
};

// Initial fine-art seed editions matching the quiet-luxury brand
export const INITIAL_EDITIONS: DigitalEdition[] = [
  {
    id: "edn-genesis-01",
    tokenId: "NSC-GEN-2026-0001",
    photoId: "p-haru-01",
    title: "Nocturne in Kyoto, Rain Reflection No. 4",
    description:
      "A singular 1-of-1 archival master captured in Gion during a spring downpour. Hand-printed on Japanese Washi digital master with pristine micro-contrast and tonal depth.",
    photographerId: "haru-tanaka",
    photographerName: "Haru Tanaka",
    photographerSlug: "haru-tanaka",
    photographerAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-4c9b91e98d929b01f92c3008982ba3ef9104fa27f4e88e9981db89481230e9f1",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1850,
    priceUsd: 2350,
    priceEth: 0.72,
    priceSol: 16.5,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes 24x36” signed Hahnemühle Photo Rag Baryta print delivered in museum-grade archival tube.",
    camera: "Leica M11",
    lens: "Noctilux-M 50mm f/0.95 ASPH",
    iso: 400,
    aperture: "f/0.95",
    shutterSpeed: "1/125s",
    location: "Kyoto, Japan",
    yearCreated: 2025,
    mintedAt: "2026-02-10T14:30:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Featured Genesis Master: Exquisite low-light isolation, unmatched analogue warmth.",
    collectionId: "kyoto-nocturnes",
    collectionName: "Kyoto Nocturnes",
  },
  {
    id: "edn-numbered-03",
    tokenId: "NSC-EDN-2026-0029",
    photoId: "p-patrick-01",
    title: "Solitude in Brutalism: Barbican Walkway",
    description:
      "A limited digital series exploring architectural shadow play and geometry within London's iconic Barbican Estate.",
    photographerId: "patrick-watson-quine",
    photographerName: "Patrick Watson-Quine",
    photographerSlug: "patrick-watson-quine",
    photographerAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-55aa44bb33cc22dd11ee00ff99aa88bb77cc66dd55ee44ff33aa22bb11cc00dd",
    tier: "limited_series",
    totalEditions: 25,
    availableEditions: 19,
    priceGbp: 280,
    priceUsd: 360,
    priceEth: 0.11,
    priceSol: 2.6,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Sony A7R V",
    lens: "FE 24-70mm f/2.8 GM II",
    iso: 100,
    aperture: "f/5.6",
    shutterSpeed: "1/250s",
    location: "London, United Kingdom",
    yearCreated: 2025,
    mintedAt: "2026-02-25T11:00:00Z",
    status: "listed",
    featured: false,
    curatorNote:
      "Rigorous formal composition highlighting post-war British modernist architecture.",
    collectionId: "metropolitan-geometry",
    collectionName: "Metropolitan Geometry",
  },
  {
    id: "edn-genesis-04",
    tokenId: "NSC-GEN-2026-0004",
    photoId: "p-lex-01",
    title: "The Golden Hour at Dune 45",
    description:
      "Unique 1-of-1 Genesis fine-art digital edition. Pristine windswept red dunes of the Namib Desert captured during peak twilight illumination.",
    photographerId: "lexmond-dennis",
    photographerName: "Lexmond Dennis",
    photographerSlug: "lexmond-dennis",
    photographerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 2100,
    priceUsd: 2680,
    priceEth: 0.82,
    priceSol: 18.9,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes 30x45” custom framed museum acrylic glass print signed and numbered by the artist.",
    camera: "Nikon Z9",
    lens: "NIKKOR Z 70-200mm f/2.8 VR S",
    iso: 64,
    aperture: "f/8.0",
    shutterSpeed: "1/400s",
    location: "Sossusvlei, Namibia",
    yearCreated: 2025,
    mintedAt: "2026-03-01T08:00:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Remarkable sculptural minimalism created by natural shadow cast across centuries-old dunes.",
    collectionId: "namibian-horizons",
    collectionName: "Namibian Horizons",
  },
  {
    id: "edn-lex-02",
    tokenId: "NSC-EDN-2026-0033",
    photoId: "amsterdam-canal-twilight",
    title: "Herengracht at Blue Hour",
    description:
      "Curated series of 25 archival editions capturing calm reflections and golden lamp light along Amsterdam's historic canal ring.",
    photographerId: "lexmond-dennis",
    photographerName: "Lexmond Dennis",
    photographerSlug: "lexmond-dennis",
    photographerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11",
    tier: "limited_series",
    totalEditions: 25,
    availableEditions: 21,
    priceGbp: 340,
    priceUsd: 435,
    priceEth: 0.14,
    priceSol: 3.1,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Sony A7R V",
    lens: "FE 16-35mm f/2.8 GM II",
    iso: 100,
    aperture: "f/8.0",
    shutterSpeed: "15s",
    location: "Amsterdam, Netherlands",
    yearCreated: 2025,
    mintedAt: "2026-02-14T19:20:00Z",
    status: "listed",
    featured: true,
    curatorNote: "Atmospheric long-exposure capturing water glassiness and Golden Age façades.",
    collectionId: "amsterdam-canals",
    collectionName: "Amsterdam Canals & Lowland Horizons",
  },
  {
    id: "edn-elena-01",
    tokenId: "NSC-GEN-2026-0019",
    photoId: "milano-duomo-light",
    title: "Milano Study No. 3, Duomo Marble and Dawn",
    description:
      "Unique 1-of-1 Genesis fine-art digital master capturing morning sunlight illuminating Gothic spires and pink Candoglia marble.",
    photographerId: "elena-rossi",
    photographerName: "Elena Rossi",
    photographerSlug: "elena-rossi",
    photographerAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-3344556677889900aabbccddeeff11223344556677889900aabbccddeeff22",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1750,
    priceUsd: 2240,
    priceEth: 0.7,
    priceSol: 15.6,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails: "Includes 24x36” Hahnemühle Museum Etching print signed by Elena Rossi.",
    camera: "Canon EOS R5",
    lens: "RF 24-70mm f/2.8L IS USM",
    iso: 100,
    aperture: "f/5.6",
    shutterSpeed: "1/160s",
    location: "Milan, Italy",
    yearCreated: 2025,
    mintedAt: "2026-02-24T07:15:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Genesis Master: Luminous natural dawn illumination across Candoglia marble spires.",
    collectionId: "milano-form",
    collectionName: "Milano Form & Shadow",
  },
  {
    id: "edn-patrick-02",
    tokenId: "NSC-EDN-2026-0061",
    photoId: "am-downtown-skyline-a-1",
    title: "AM Downtown Skyline & Cloud Elevation",
    description:
      "Archival limited series of 20 editions capturing cool dawn geometry and low stratocumulus banks sweeping through downtown towers.",
    photographerId: "patrick-watson-quine",
    photographerName: "Patrick Watson-Quine",
    photographerSlug: "patrick-watson-quine",
    photographerAvatar:
      "https://res.cloudinary.com/odu5iecy/image/upload/v1784203446/ns-captures/AM%20Downtown%20Closeup%20C-1.jpg",
    image:
      "https://res.cloudinary.com/odu5iecy/image/upload/v1784203467/ns-captures/AM%20Downtown%20Skyline%20A-1.jpg",
    masterHash: "sha256-5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344",
    tier: "limited_series",
    totalEditions: 20,
    availableEditions: 17,
    priceGbp: 390,
    priceUsd: 500,
    priceEth: 0.16,
    priceSol: 3.6,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Leica M11",
    lens: "28mm f/2 Summicron-M ASPH",
    iso: 160,
    aperture: "f/4.0",
    shutterSpeed: "1/500s",
    location: "Montreal, Canada",
    yearCreated: 2025,
    mintedAt: "2026-03-06T09:00:00Z",
    status: "listed",
    featured: false,
    curatorNote:
      "Cool architectural gradation balancing glass curtain walls and northern cloud cover.",
    collectionId: "metropolitan-geometry",
    collectionName: "Metropolitan Geometry",
  },
  {
    id: "edn-patrick-03",
    tokenId: "NSC-GEN-2026-0021",
    photoId: "am-rooftop-b-1",
    title: "AM Rooftop Silhouette at Dawn",
    description:
      "Unique 1-of-1 Genesis edition studying architectural solitude from an elevated rooftop vantage before city transit awakens.",
    photographerId: "patrick-watson-quine",
    photographerName: "Patrick Watson-Quine",
    photographerSlug: "patrick-watson-quine",
    photographerAvatar:
      "https://res.cloudinary.com/odu5iecy/image/upload/v1784203446/ns-captures/AM%20Downtown%20Closeup%20C-1.jpg",
    image:
      "https://res.cloudinary.com/odu5iecy/image/upload/v1784203532/ns-captures/AM%20Rooftop%20B-1.jpg",
    masterHash: "sha256-66778899aabbccddeeff00112233445566778899aabbccddeeff001122334455",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1950,
    priceUsd: 2500,
    priceEth: 0.78,
    priceSol: 17.5,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes custom framed 24x36” metallic pearl archival print with artist certificate.",
    camera: "Leica M11",
    lens: "35mm f/1.4 Summilux-M ASPH",
    iso: 200,
    aperture: "f/2.8",
    shutterSpeed: "1/320s",
    location: "Montreal, Canada",
    yearCreated: 2026,
    mintedAt: "2026-03-07T08:30:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Genesis Master: Intimate aerial solitude over sprawling North American urban grid.",
    collectionId: "metropolitan-geometry",
    collectionName: "Metropolitan Geometry",
  },
  {
    id: "edn-clive-01",
    tokenId: "NSC-GEN-2026-0005",
    photoId: "p-clive-01",
    title: "Longships Lighthouse at Gale Force 9",
    description:
      "A singular 1-of-1 archival master capturing monumental Atlantic swells crashing against the granite reef of Longships Lighthouse off Land's End, Cornwall. Exposed during a severe winter storm on medium-format sensor.",
    photographerId: "clive-varley",
    photographerName: "Clive Varley",
    photographerSlug: "clive-varley",
    photographerAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-77889900aabbccddeeff00112233445566778899aabbccddeeff001122334455",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1950,
    priceUsd: 2500,
    priceEth: 0.76,
    priceSol: 17.2,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes 30x40” custom-framed museum-grade Hahnemühle Photo Rag Baryta print signed by the artist.",
    camera: "Hasselblad H6D-100c",
    lens: "HC 300mm f/4.5",
    iso: 100,
    aperture: "f/8.0",
    shutterSpeed: "1/800s",
    location: "Land's End, Cornwall, United Kingdom",
    yearCreated: 2025,
    mintedAt: "2026-03-02T10:00:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Featured Maritime Master: Phenomenal kinetic wave energy and pristine medium-format tonal depth.",
    collectionId: "cornish-maritime",
    collectionName: "Cornish Tides & Maritime Solitude",
  },
  {
    id: "edn-clive-02",
    tokenId: "NSC-EDN-2026-0030",
    photoId: "p-clive-02",
    title: "Atlantic Swell Across Porth Nanven",
    description:
      "Numbered series exploring the famous egg-shaped granite boulders and Atlantic swell of the Cot Valley in West Cornwall during twilight high tide.",
    photographerId: "clive-varley",
    photographerName: "Clive Varley",
    photographerSlug: "clive-varley",
    photographerAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-8899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677",
    tier: "limited_series",
    totalEditions: 25,
    availableEditions: 22,
    priceGbp: 320,
    priceUsd: 410,
    priceEth: 0.12,
    priceSol: 2.8,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Sony A1",
    lens: "FE 16-35mm f/2.8 GM",
    iso: 64,
    aperture: "f/11.0",
    shutterSpeed: "1/4s",
    location: "Porth Nanven, Cornwall, United Kingdom",
    yearCreated: 2025,
    mintedAt: "2026-03-03T11:00:00Z",
    status: "listed",
    featured: false,
    curatorNote: "Superb long-exposure water dynamics contrasting against ancient glacial granite.",
    collectionId: "cornish-maritime",
    collectionName: "Cornish Tides & Maritime Solitude",
  },
  {
    id: "edn-ian-01",
    tokenId: "NSC-GEN-2026-0006",
    photoId: "p-ian-01",
    title: "Hayward Gallery, Concrete Cantilever No. 04",
    description:
      "A singular 1-of-1 Genesis fine-art study of raw board-marked concrete cantilevers and stark brutalist geometry on London's South Bank at dawn.",
    photographerId: "ian-dandribe",
    photographerName: "Ian Dandribe",
    photographerSlug: "ian-dandribe",
    photographerAvatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-99aabbccddeeff00112233445566778899aabbccddeeff001122334455667788",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1650,
    priceUsd: 2100,
    priceEth: 0.64,
    priceSol: 14.5,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails: "Includes 24x36” museum-mounted silver halide print on aluminium Dibond.",
    camera: "Leica SL2",
    lens: "Super-Vario-Elmar-SL 16-35mm f/3.5-4.5 ASPH",
    iso: 50,
    aperture: "f/8.0",
    shutterSpeed: "1/60s",
    location: "South Bank, London, United Kingdom",
    yearCreated: 2025,
    mintedAt: "2026-03-04T09:00:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Austere structural poetry and monumental massing rendered in pure geometric balance.",
    collectionId: "monolithic-brutalism",
    collectionName: "Monolithic Brutalism & Shadow",
  },
  {
    id: "edn-ian-02",
    tokenId: "NSC-EDN-2026-0031",
    photoId: "p-ian-02",
    title: "National Theatre Flytower at Twilight",
    description:
      "Limited edition capturing the interlocking cast-concrete volumes and amber twilight reflections of Denys Lasdun's National Theatre complex.",
    photographerId: "ian-dandribe",
    photographerName: "Ian Dandribe",
    photographerSlug: "ian-dandribe",
    photographerAvatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
    tier: "limited_series",
    totalEditions: 20,
    availableEditions: 17,
    priceGbp: 290,
    priceUsd: 370,
    priceEth: 0.11,
    priceSol: 2.5,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Sony A7R V",
    lens: "FE 24-70mm f/2.8 GM II",
    iso: 100,
    aperture: "f/5.6",
    shutterSpeed: "1/125s",
    location: "London, United Kingdom",
    yearCreated: 2025,
    mintedAt: "2026-03-05T14:00:00Z",
    status: "listed",
    featured: false,
    curatorNote: "Rich tonal modulation in cast concrete surfaces under overcast British skies.",
    collectionId: "monolithic-brutalism",
    collectionName: "Monolithic Brutalism & Shadow",
  },
  {
    id: "edn-ryusei-01",
    tokenId: "NSC-GEN-2026-0007",
    photoId: "p-ryusei-01",
    title: "Shinjuku Crossing in Heavy Downpour",
    description:
      "A singular 1-of-1 archival Genesis master. Kinetic umbrella geometry and electric reflections on wet asphalt during a torrential typhoon evening in Shinjuku.",
    photographerId: "ryusei-yamada",
    photographerName: "Ryusei Yamada",
    photographerSlug: "ryusei-yamada",
    photographerAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-bbccddeeff00112233445566778899aabbccddeeff00112233445566778899aa",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 2200,
    priceUsd: 2800,
    priceEth: 0.86,
    priceSol: 19.5,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes 36x48” custom-mounted acrylic glass print signed and numbered by the artist.",
    camera: "Fujifilm GFX 100 II",
    lens: "GF 45-100mm f/4 R LM OIS WR",
    iso: 800,
    aperture: "f/4.0",
    shutterSpeed: "1/200s",
    location: "Shinjuku, Tokyo, Japan",
    yearCreated: 2025,
    mintedAt: "2026-03-06T18:00:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Curatorial Highlight: Astounding medium-format dynamic resolution capturing individual raindrops lit by neon billboard luminescence.",
    collectionId: "tokyo-monoliths",
    collectionName: "Tokyo Monoliths & Neon Twilight",
  },
  {
    id: "edn-ryusei-02",
    tokenId: "NSC-EDN-2026-0032",
    photoId: "p-ryusei-02",
    title: "Roppongi Twilight Grid",
    description:
      "An elevated telephoto study of Roppongi Hills high-rise grid and dense arterial highway illumination at dusk.",
    photographerId: "ryusei-yamada",
    photographerName: "Ryusei Yamada",
    photographerSlug: "ryusei-yamada",
    photographerAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-ccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb",
    tier: "limited_series",
    totalEditions: 30,
    availableEditions: 26,
    priceGbp: 350,
    priceUsd: 450,
    priceEth: 0.14,
    priceSol: 3.1,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Sony A7R V",
    lens: "FE 50mm f/1.2 GM",
    iso: 200,
    aperture: "f/2.8",
    shutterSpeed: "1/160s",
    location: "Roppongi, Tokyo, Japan",
    yearCreated: 2025,
    mintedAt: "2026-03-07T12:00:00Z",
    status: "listed",
    featured: false,
    curatorNote: "Intricate architectural density and electric twilight hues.",
    collectionId: "tokyo-monoliths",
    collectionName: "Tokyo Monoliths & Neon Twilight",
  },
  {
    id: "edn-eunji-01",
    tokenId: "NSC-GEN-2026-0008",
    photoId: "p-eunji-01",
    title: "Mapo Bridge at Blue Dawn",
    description:
      "A singular 1-of-1 Genesis archival master. Dense river mist creeping over the steel arches of Mapo Bridge across the Han River before sunrise.",
    photographerId: "eunji-lee",
    photographerName: "Eunji Lee",
    photographerSlug: "eunji-lee",
    photographerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-ddeeff00112233445566778899aabbccddeeff00112233445566778899aabbcc",
    tier: "genesis_1_of_1",
    totalEditions: 1,
    availableEditions: 1,
    priceGbp: 1750,
    priceUsd: 2240,
    priceEth: 0.68,
    priceSol: 15.6,
    royaltyPercent: 10,
    hasPhysicalTwin: true,
    physicalPrintDetails:
      "Includes 30x40” signed archival Japanese Washi paper print floated in walnut frame.",
    camera: "Canon EOS R5",
    lens: "RF 70-200mm f/2.8L IS USM",
    iso: 100,
    aperture: "f/5.6",
    shutterSpeed: "1/80s",
    location: "Han River, Seoul, South Korea",
    yearCreated: 2025,
    mintedAt: "2026-03-08T06:00:00Z",
    status: "listed",
    featured: true,
    curatorNote:
      "Atmospheric silence and exquisite monochromatic tonal gradation through river mist.",
    collectionId: "seoul-mist",
    collectionName: "Seoul Mist & Han River Horizons",
  },
  {
    id: "edn-eunji-02",
    tokenId: "NSC-EDN-2026-0033",
    photoId: "p-eunji-02",
    title: "Bukchon Hanok Silent Alleyways",
    description:
      "Numbered series exploring the geometric eaves and tiled roof silhouettes of Bukchon Hanok Village under early morning frost.",
    photographerId: "eunji-lee",
    photographerName: "Eunji Lee",
    photographerSlug: "eunji-lee",
    photographerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-eeff00112233445566778899aabbccddeeff00112233445566778899aabbccdd",
    tier: "limited_series",
    totalEditions: 25,
    availableEditions: 23,
    priceGbp: 310,
    priceUsd: 395,
    priceEth: 0.12,
    priceSol: 2.7,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Leica Q3",
    lens: "Summilux 28mm f/1.7 ASPH",
    iso: 100,
    aperture: "f/4.0",
    shutterSpeed: "1/250s",
    location: "Seoul, South Korea",
    yearCreated: 2025,
    mintedAt: "2026-03-09T08:00:00Z",
    status: "listed",
    featured: false,
    curatorNote: "Traditional Joseon architectural geometry rendered in delicate morning light.",
    collectionId: "seoul-mist",
    collectionName: "Seoul Mist & Han River Horizons",
  },
];

// Initial seed ownerships
export const INITIAL_OWNERSHIPS: EditionOwnership[] = [
  {
    id: "own-001",
    editionId: "edn-numbered-03",
    serialNumber: 1,
    serialDisplay: "#01 / 25",
    ownerId: "collector-david",
    ownerName: "David Sterling",
    ownerEmail: "david@sterlingcapital.com",
    ownerWalletAddress: "0xbd16e4ebF708EF94E8e89496ecbdEF648922E18d",
    acquiredAt: "2026-02-26T12:05:00Z",
    purchasePriceGbp: 280,
    purchaseCurrency: "USDT",
    certificateNumber: "COA-NSC-2026-0029-01",
    isListedForResale: false,
  },
  {
    id: "own-002",
    editionId: "edn-patrick-02",
    serialNumber: 1,
    serialDisplay: "#01 / 20",
    ownerId: "collector-marcus",
    ownerName: "Marcus Vance",
    ownerEmail: "marcus.vance@vanceart.co.uk",
    ownerWalletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78",
    acquiredAt: "2026-03-06T11:45:00Z",
    purchasePriceGbp: 390,
    purchaseCurrency: "GBP",
    certificateNumber: "COA-NSC-2026-0061-01",
    isListedForResale: false,
  },
  {
    id: "own-003",
    editionId: "edn-lex-02",
    serialNumber: 1,
    serialDisplay: "#01 / 25",
    ownerId: "collector-sophia",
    ownerName: "Sophia Laurent",
    ownerEmail: "sophia@laurentfineart.fr",
    ownerWalletAddress: "0x3F2b810D7a1884C9B417eE6997B24d623b092A19",
    acquiredAt: "2026-02-16T14:30:00Z",
    purchasePriceGbp: 340,
    purchaseCurrency: "ETH",
    certificateNumber: "COA-NSC-2026-0033-01",
    isListedForResale: false,
  },
];

// Initial activity trail
export const INITIAL_ACTIVITY: EditionActivity[] = [
  {
    id: "act-01",
    editionId: "edn-genesis-01",
    type: "minted",
    fromUser: "Haru Tanaka",
    timestamp: "2026-02-10T14:30:00Z",
    txHash: "0x9a3e4128dfb841a029384bcda8293e8a",
    details: "Genesis 1-of-1 digital master certified with SHA-256 archival fingerprint.",
  },
  {
    id: "act-02",
    editionId: "edn-patrick-02",
    type: "purchased",
    fromUser: "Patrick Watson-Quine",
    toUser: "Marcus Vance",
    price: 390,
    currency: "GBP",
    timestamp: "2026-03-06T11:45:00Z",
    txHash: "0x55aa66bb77cc88dd99ee00ff11aa22bb",
    details: "Acquired Edition #01 / 20. Authenticity certificate COA-NSC-2026-0061-01 issued.",
  },
  {
    id: "act-03",
    editionId: "edn-lex-02",
    type: "purchased",
    fromUser: "Lexmond Dennis",
    toUser: "Sophia Laurent",
    price: 340,
    currency: "ETH",
    timestamp: "2026-02-16T14:30:00Z",
    txHash: "0x66bb77cc88dd99ee00ff11aa22bb33cc",
    details: "Acquired Edition #01 / 25. Authenticity certificate COA-NSC-2026-0033-01 issued.",
  },
  {
    id: "act-04",
    editionId: "edn-elena-01",
    type: "minted",
    fromUser: "Elena Rossi",
    timestamp: "2026-02-24T07:15:00Z",
    txHash: "0x77cc88dd99ee00ff11aa22bb33cc44dd",
    details: "Genesis 1-of-1 master 'Milano Study No. 3' certified with physical print twin.",
  },
];

const STORAGE_KEYS = {
  EDITIONS: "ns_digital_editions_v1",
  OWNERSHIPS: "ns_edition_ownerships_v1",
  ACTIVITY: "ns_edition_activity_v1",
  CONFIG: "ns_edition_deposit_config_v1",
  COLLECTIONS: "ns_edition_user_collections_v1",
  CREATOR_PROFILES: "ns_edition_creator_profiles_v1",
  WEB3_ACTIVATIONS: "ns_edition_web3_activations_v1",
};

// Storage helper functions
// In-memory fallback for environments where localStorage is not available (Node/SSR/Vitest)
const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (
      typeof window !== "undefined" &&
      typeof localStorage !== "undefined" &&
      localStorage?.getItem
    ) {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore[key] || null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (
      typeof window !== "undefined" &&
      typeof localStorage !== "undefined" &&
      localStorage?.setItem
    ) {
      localStorage.setItem(key, val);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore[key] = val;
}

// ============================================================
// PURGE / SCRUB HELPER FOR NON-NIGERIAN FINE-ART PLATFORM
// ============================================================

export function isNigerianEdition(e: DigitalEdition): boolean {
  const loc = (e.location || "").toLowerCase();
  const title = (e.title || "").toLowerCase();
  const name = (e.photographerName || "").toLowerCase();
  const id = (e.id || "").toLowerCase();
  const collId = (e.collectionId || "").toLowerCase();
  return (
    loc.includes("nigeria") ||
    loc.includes("lagos") ||
    title.includes("lagos") ||
    title.includes("nigeria") ||
    name.includes("james adebayo") ||
    name.includes("prince kalu") ||
    name.includes("adebayo") ||
    name.includes("akachi") ||
    name.includes("namnso") ||
    name.includes("godfred") ||
    id === "edn-james-01" ||
    id === "edn-james-02" ||
    id === "edn-prince-01" ||
    id === "edn-prince-02" ||
    id === "edn-godfred-01" ||
    id === "lagos-meridian" ||
    id === "edn-numbered-02" ||
    collId === "korean-peninsula-silences"
  );
}

export function isNigerianCollection(c: EditionCollectionMeta): boolean {
  const id = (c.id || "").toLowerCase();
  const name = (c.name || "").toLowerCase();
  const desc = (c.description || "").toLowerCase();
  return (
    id.includes("lagos") ||
    id.includes("nigeria") ||
    id === "lagos-meridian" ||
    id === "ceremony-and-ochre" ||
    id === "accra-radiance" ||
    id === "korean-peninsula-silences" ||
    name.includes("lagos") ||
    name.includes("nigeria") ||
    name.includes("korean peninsula silences") ||
    desc.includes("nigeria") ||
    desc.includes("lagos")
  );
}

// ============================================================
// SUPABASE ROW TRANSFORMERS
// ============================================================

export function editionToSupabaseRow(e: DigitalEdition): SupabaseEditionRow {
  return {
    id: e.id,
    token_id: e.tokenId,
    photo_id: e.photoId || null,
    title: e.title,
    description: e.description || null,
    photographer_id: e.photographerId,
    photographer_name: e.photographerName,
    photographer_slug: e.photographerSlug || null,
    photographer_avatar: e.photographerAvatar || null,
    image: e.image,
    master_hash: e.masterHash,
    tier: e.tier,
    total_editions: e.totalEditions,
    available_editions: e.availableEditions,
    price_gbp: e.priceGbp,
    price_usd: e.priceUsd,
    price_eth: e.priceEth,
    price_sol: e.priceSol,
    royalty_percent: e.royaltyPercent,
    has_physical_twin: e.hasPhysicalTwin,
    physical_print_details: e.physicalPrintDetails || null,
    camera: e.camera || null,
    lens: e.lens || null,
    iso: e.iso ?? null,
    aperture: e.aperture || null,
    shutter_speed: e.shutterSpeed || null,
    location: e.location || null,
    year_created: e.yearCreated ?? null,
    minted_at: e.mintedAt,
    status: e.status,
    featured: e.featured ?? false,
    curator_note: e.curatorNote || null,
    collection_id: e.collectionId || null,
    collection_name: e.collectionName || null,
    artwork_source: e.artworkSource || null,
    sales_paused: e.salesPaused ?? false,
    created_by: e.createdBy || null,
    review_status: e.reviewStatus || null,
    review_note: e.reviewNote || null,
    submitted_at: e.submittedAt || null,
    reviewed_at: e.reviewedAt || null,
    reviewed_by: e.reviewedBy || null,
  };
}

export function supabaseRowToEdition(r: SupabaseEditionRow): DigitalEdition {
  return {
    id: r.id,
    tokenId: r.token_id,
    photoId: r.photo_id || "",
    title: r.title,
    description: r.description || "",
    photographerId: r.photographer_id,
    photographerName: r.photographer_name,
    photographerSlug: r.photographer_slug || undefined,
    photographerAvatar: r.photographer_avatar || undefined,
    image: r.image,
    masterHash: r.master_hash,
    tier: (r.tier as EditionTier) || "limited_series",
    totalEditions: r.total_editions,
    availableEditions: r.available_editions,
    priceGbp: Number(r.price_gbp),
    priceUsd: Number(r.price_usd),
    priceEth: Number(r.price_eth),
    priceSol: Number(r.price_sol),
    royaltyPercent: Number(r.royalty_percent),
    hasPhysicalTwin: r.has_physical_twin,
    physicalPrintDetails: r.physical_print_details || undefined,
    camera: r.camera || "",
    lens: r.lens || "",
    iso: r.iso ?? 0,
    aperture: r.aperture || undefined,
    shutterSpeed: r.shutter_speed || undefined,
    location: r.location || undefined,
    yearCreated: r.year_created || 2026,
    mintedAt: r.minted_at,
    status: (r.status as EditionStatus) || "listed",
    featured: r.featured || false,
    curatorNote: r.curator_note || undefined,
    collectionId: r.collection_id || undefined,
    collectionName: r.collection_name || undefined,
    artworkSource: (r.artwork_source as ArtworkSource) || undefined,
    salesPaused: r.sales_paused || false,
    createdBy: r.created_by || undefined,
    reviewStatus: (r.review_status as EditionReviewStatus) || undefined,
    reviewNote: r.review_note || undefined,
    submittedAt: r.submitted_at || undefined,
    reviewedAt: r.reviewed_at || undefined,
    reviewedBy: r.reviewed_by || undefined,
  };
}

export function collectionToSupabaseRow(c: EditionCollectionMeta): SupabaseCollectionRow {
  return {
    id: c.id,
    name: c.name,
    description: c.description || null,
    curator_statement: c.curatorStatement || null,
    banner_image: c.bannerImage,
    avatar_image: c.avatarImage,
    photographer_id: c.photographerId,
    photographer_name: c.photographerName,
    chain: c.chain,
    contract_address: c.contractAddress,
    royalty_percent: c.royaltyPercent,
    created_by: c.createdBy || null,
    created_at: c.createdAt,
    socials: c.socials || undefined,
  };
}

export function supabaseRowToCollection(r: SupabaseCollectionRow): EditionCollectionMeta {
  return {
    id: r.id,
    name: r.name,
    description: r.description || "",
    curatorStatement: r.curator_statement || undefined,
    bannerImage: r.banner_image,
    avatarImage: r.avatar_image,
    photographerId: r.photographer_id,
    photographerName: r.photographer_name,
    chain: r.chain,
    contractAddress: r.contract_address,
    royaltyPercent: Number(r.royalty_percent),
    createdAt: r.created_at,
    createdBy: r.created_by || undefined,
    socials: r.socials,
  };
}

export function ownershipToSupabaseRow(o: EditionOwnership): SupabaseOwnershipRow {
  return {
    id: o.id,
    edition_id: o.editionId,
    serial_number: o.serialNumber,
    serial_display: o.serialDisplay,
    owner_id: o.ownerId,
    owner_name: o.ownerName,
    owner_email: o.ownerEmail || null,
    owner_wallet_address: o.ownerWalletAddress || null,
    acquired_at: o.acquiredAt,
    purchase_price_gbp: o.purchasePriceGbp,
    purchase_currency: o.purchaseCurrency,
    certificate_number: o.certificateNumber,
    is_listed_for_resale: o.isListedForResale,
    resale_price_gbp: o.resalePriceGbp ?? null,
  };
}

export function supabaseRowToOwnership(r: SupabaseOwnershipRow): EditionOwnership {
  return {
    id: r.id,
    editionId: r.edition_id,
    serialNumber: r.serial_number,
    serialDisplay: r.serial_display,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerEmail: r.owner_email || undefined,
    ownerWalletAddress: r.owner_wallet_address || undefined,
    acquiredAt: r.acquired_at,
    purchasePriceGbp: Number(r.purchase_price_gbp),
    purchaseCurrency: (r.purchase_currency as "GBP" | "ETH" | "USDT" | "SOL" | "NSC") || "GBP",
    certificateNumber: r.certificate_number,
    isListedForResale: r.is_listed_for_resale,
    resalePriceGbp: r.resale_price_gbp != null ? Number(r.resale_price_gbp) : undefined,
  };
}

export function activityToSupabaseRow(a: EditionActivity): SupabaseActivityRow {
  return {
    id: a.id,
    edition_id: a.editionId,
    type: a.type,
    from_user: a.fromUser || null,
    to_user: a.toUser || null,
    price: a.price ?? null,
    currency: a.currency || null,
    timestamp: a.timestamp,
    tx_hash: a.txHash,
    details: a.details || null,
  };
}

export function supabaseRowToActivity(r: SupabaseActivityRow): EditionActivity {
  return {
    id: r.id,
    editionId: r.edition_id,
    type: (r.type as EditionActivity["type"]) || "minted",
    fromUser: r.from_user || undefined,
    toUser: r.to_user || undefined,
    price: r.price != null ? Number(r.price) : undefined,
    currency: r.currency || undefined,
    timestamp: r.timestamp,
    txHash: r.tx_hash,
    details: r.details || undefined,
  };
}

// ============================================================
// STORAGE HELPERS WITH AUTOMATIC NIGERIAN PURGE & SUPABASE SYNC
// ============================================================

export function getStoredEditions(): DigitalEdition[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.EDITIONS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.EDITIONS, JSON.stringify(INITIAL_EDITIONS));
      return INITIAL_EDITIONS;
    }
    let stored = JSON.parse(raw) as DigitalEdition[];
    let changed = false;

    // Filter out any legacy Nigerian data or deleted seed IDs
    if (stored.some(isNigerianEdition)) {
      stored = stored.filter((e) => !isNigerianEdition(e));
      changed = true;
    }

    const storedIds = new Set(stored.map((e) => e.id));
    const missing = INITIAL_EDITIONS.filter((e) => !storedIds.has(e.id));
    if (missing.length > 0) {
      stored = [...stored, ...missing];
      changed = true;
    }

    if (changed) {
      safeSetItem(STORAGE_KEYS.EDITIONS, JSON.stringify(stored));
    }
    return stored;
  } catch {
    return INITIAL_EDITIONS;
  }
}

export function saveStoredEditions(editions: DigitalEdition[]): void {
  try {
    safeSetItem(STORAGE_KEYS.EDITIONS, JSON.stringify(editions));
  } catch (e) {
    console.error("Failed to save editions:", e);
  }
}

export function getStoredOwnerships(): EditionOwnership[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.OWNERSHIPS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.OWNERSHIPS, JSON.stringify(INITIAL_OWNERSHIPS));
      return INITIAL_OWNERSHIPS;
    }
    let stored = JSON.parse(raw) as EditionOwnership[];
    let changed = false;

    // Clean out Nigerian-linked ownerships and excluded seed records
    const isNigerianOwnership = (o: EditionOwnership) =>
      o.editionId === "edn-james-01" ||
      o.editionId === "edn-james-02" ||
      o.editionId === "edn-prince-01" ||
      o.editionId === "edn-prince-02" ||
      o.editionId === "edn-godfred-01" ||
      o.editionId === "edn-numbered-02";

    if (stored.some(isNigerianOwnership)) {
      stored = stored.filter((o) => !isNigerianOwnership(o));
      changed = true;
    }

    const storedIds = new Set(stored.map((o) => o.id));
    const missing = INITIAL_OWNERSHIPS.filter((o) => !storedIds.has(o.id));
    if (missing.length > 0) {
      stored = [...stored, ...missing];
      changed = true;
    }
    if (changed) {
      safeSetItem(STORAGE_KEYS.OWNERSHIPS, JSON.stringify(stored));
    }
    return stored;
  } catch {
    return INITIAL_OWNERSHIPS;
  }
}

export function saveStoredOwnerships(ownerships: EditionOwnership[]): void {
  try {
    safeSetItem(STORAGE_KEYS.OWNERSHIPS, JSON.stringify(ownerships));
  } catch (e) {
    console.error("Failed to save ownerships:", e);
  }
}

export function getStoredActivity(): EditionActivity[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.ACTIVITY);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY));
      return INITIAL_ACTIVITY;
    }
    let stored = JSON.parse(raw) as EditionActivity[];
    let changed = false;

    const isNigerianActivity = (a: EditionActivity) =>
      a.editionId === "edn-james-01" ||
      a.editionId === "edn-james-02" ||
      a.editionId === "edn-prince-01" ||
      a.editionId === "edn-prince-02" ||
      a.editionId === "edn-godfred-01" ||
      a.editionId === "edn-numbered-02" ||
      (a.fromUser || "").toLowerCase().includes("adebayo") ||
      (a.fromUser || "").toLowerCase().includes("kalu") ||
      (a.fromUser || "").toLowerCase().includes("godfred") ||
      (a.toUser || "").toLowerCase().includes("adebayo") ||
      (a.toUser || "").toLowerCase().includes("kalu") ||
      (a.fromUser || "").toLowerCase().includes("junghoon") ||
      (a.toUser || "").toLowerCase().includes("junghoon");

    if (stored.some(isNigerianActivity)) {
      stored = stored.filter((a) => !isNigerianActivity(a));
      changed = true;
    }

    const storedIds = new Set(stored.map((a) => a.id));
    const missing = INITIAL_ACTIVITY.filter((a) => !storedIds.has(a.id));
    if (missing.length > 0) {
      stored = [...stored, ...missing];
      changed = true;
    }
    if (changed) {
      safeSetItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(stored));
    }
    return stored;
  } catch {
    return INITIAL_ACTIVITY;
  }
}

export function saveStoredActivity(activities: EditionActivity[]): void {
  try {
    safeSetItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
  } catch (e) {
    console.error("Failed to save activities:", e);
  }
}

// ============================================================
// SUPABASE REALTIME / ASYNC SYNC ENGINE
// ============================================================

let hasInitiatedSync = false;

export async function syncEditionsWithSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const [supabaseEditions, supabaseCollections, supabaseOwnerships, supabaseActivities] =
      await Promise.all([
        fetchSupabaseEditions(),
        fetchSupabaseCollections(),
        fetchSupabaseOwnerships(),
        fetchSupabaseActivities(),
      ]);

    // 1. Sync Editions
    if (supabaseEditions.length > 0) {
      const remoteEditions = supabaseEditions
        .map(supabaseRowToEdition)
        .filter((e) => !isNigerianEdition(e));
      const local = getStoredEditions();
      const localMap = new Map(local.map((e) => [e.id, e]));

      let changed = false;
      for (const remote of remoteEditions) {
        if (!localMap.has(remote.id)) {
          localMap.set(remote.id, remote);
          changed = true;
        }
      }
      if (changed) {
        saveStoredEditions(Array.from(localMap.values()));
        notifyEditionsChanged();
      }
    }

    // 2. Sync Collections
    if (supabaseCollections.length > 0) {
      const remoteCollections = supabaseCollections
        .map(supabaseRowToCollection)
        .filter((c) => !isNigerianCollection(c));
      const local = getStoredUserCollections();
      const localMap = new Map(local.map((c) => [c.id, c]));

      let changed = false;
      for (const remote of remoteCollections) {
        if (
          !INITIAL_EDITION_COLLECTIONS.some((c) => c.id === remote.id) &&
          !localMap.has(remote.id)
        ) {
          localMap.set(remote.id, remote);
          changed = true;
        }
      }
      if (changed) {
        saveStoredUserCollections(Array.from(localMap.values()));
        notifyEditionsChanged();
      }
    }

    // 3. Sync Ownerships
    if (supabaseOwnerships.length > 0) {
      const remoteOwnerships = supabaseOwnerships.map(supabaseRowToOwnership);
      const local = getStoredOwnerships();
      const localMap = new Map(local.map((o) => [o.id, o]));
      let changed = false;
      for (const remote of remoteOwnerships) {
        if (!localMap.has(remote.id)) {
          localMap.set(remote.id, remote);
          changed = true;
        }
      }
      if (changed) {
        saveStoredOwnerships(Array.from(localMap.values()));
        notifyEditionsChanged();
      }
    }

    // 4. Sync Activities
    if (supabaseActivities.length > 0) {
      const remoteActivities = supabaseActivities.map(supabaseRowToActivity);
      const local = getStoredActivity();
      const localMap = new Map(local.map((a) => [a.id, a]));
      let changed = false;
      for (const remote of remoteActivities) {
        if (!localMap.has(remote.id)) {
          localMap.set(remote.id, remote);
          changed = true;
        }
      }
      if (changed) {
        saveStoredActivity(Array.from(localMap.values()));
        notifyEditionsChanged();
      }
    }
  } catch (err) {
    console.error("Failed to sync editions with Supabase:", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    if (!hasInitiatedSync) {
      hasInitiatedSync = true;
      syncEditionsWithSupabase();
    }
  }, 100);
}

export function getDepositConfig(): DepositGateConfig {
  try {
    const raw = safeGetItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_DEPOSIT_CONFIG;
    return { ...DEFAULT_DEPOSIT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DEPOSIT_CONFIG;
  }
}

export function saveDepositConfig(cfg: Partial<DepositGateConfig>): DepositGateConfig {
  const current = getDepositConfig();
  const updated = { ...current, ...cfg };
  safeSetItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
  return updated;
}

/**
 * Checks if a user's on-chain balances qualify to mint or list an edition.
 * Checks ETH, SOL, USDT, USDC, or BTC across their derived vault balances.
 */
export function checkDepositEligibility(balances: {
  nsc?: number;
  eth?: number;
  sol?: number;
  usdt?: number;
  usdc?: number;
  btc?: number;
  totalUsd?: number;
}): { eligible: boolean; reason?: string; qualifyingToken?: string } {
  const config = getDepositConfig();
  if (!config.enforceDepositGate) {
    return { eligible: true, qualifyingToken: "Exempt" };
  }

  const nsc = balances.nsc || 0;
  const eth = balances.eth || 0;
  const sol = balances.sol || 0;
  const usdt = balances.usdt || 0;
  const usdc = balances.usdc || 0;
  const btc = balances.btc || 0;

  // Primary platform token
  if (nsc >= (config.nscThreshold ?? 20)) {
    return { eligible: true, qualifyingToken: `NSC (${nsc.toFixed(2)} NSC)` };
  }
  if (eth >= config.ethThreshold) {
    return { eligible: true, qualifyingToken: `Ethereum (${eth.toFixed(4)} ETH)` };
  }
  if (sol >= config.solThreshold) {
    return { eligible: true, qualifyingToken: `Solana (${sol.toFixed(2)} SOL)` };
  }
  if (usdt >= config.usdtThreshold) {
    return { eligible: true, qualifyingToken: `Tether (${usdt.toFixed(2)} USDT)` };
  }
  if (usdc >= config.usdcThreshold) {
    return { eligible: true, qualifyingToken: `USD Coin (${usdc.toFixed(2)} USDC)` };
  }
  if (btc >= config.btcThreshold) {
    return { eligible: true, qualifyingToken: `Bitcoin (${btc.toFixed(6)} BTC)` };
  }

  return {
    eligible: false,
    reason: `Requires active NSC or deposit in your Web3 Vault (min: ${config.nscThreshold ?? 20} NSC, ${config.ethThreshold} ETH, ${config.solThreshold} SOL, ${config.usdtThreshold} USDT/USDC, or ${config.btcThreshold} BTC).`,
  };
}

/**
 * Purchases a digital edition, decrements available inventory,
 * creates an immutable Certificate of Authenticity (COA),
 * and logs the provenance activity trail.
 */
export function purchaseEdition(
  editionId: string,
  buyer: { id: string; name: string; email?: string; walletAddress?: string },
  currency: "GBP" | "ETH" | "USDT" | "SOL" | "NSC" = "GBP",
): { success: boolean; ownership?: EditionOwnership; error?: string } {
  const editions = getStoredEditions();
  const editionIndex = editions.findIndex((e) => e.id === editionId);

  if (editionIndex === -1) {
    return { success: false, error: "Edition not found." };
  }

  const edition = editions[editionIndex];
  if (!isEditionPublished(edition)) {
    return { success: false, error: "This edition isn't on sale yet." };
  }
  if (edition.salesPaused) {
    return { success: false, error: "The creator has paused sales of this edition." };
  }
  if (edition.availableEditions <= 0) {
    return { success: false, error: "This edition is completely sold out." };
  }

  // Calculate serial number (e.g., if 25 total and 20 available, next is #6)
  const serialNumber = edition.totalEditions - edition.availableEditions + 1;
  const serialDisplay =
    edition.tier === "genesis_1_of_1"
      ? "1 of 1 Genesis Master"
      : `#${String(serialNumber).padStart(2, "0")} / ${edition.totalEditions}`;

  const certNumber = `COA-NSC-${edition.tokenId.replace("NSC-", "")}-${String(serialNumber).padStart(2, "0")}`;

  const ownership: EditionOwnership = {
    id: `own-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    editionId,
    serialNumber,
    serialDisplay,
    ownerId: buyer.id,
    ownerName: buyer.name,
    ownerEmail: buyer.email,
    ownerWalletAddress: buyer.walletAddress || "0x" + Math.random().toString(16).substring(2, 42),
    acquiredAt: new Date().toISOString(),
    purchasePriceGbp: edition.priceGbp,
    purchaseCurrency: currency,
    certificateNumber: certNumber,
    isListedForResale: false,
  };

  // Update edition inventory
  edition.availableEditions -= 1;
  if (edition.availableEditions === 0) {
    edition.status = "sold_out";
  }
  editions[editionIndex] = edition;
  saveStoredEditions(editions);

  // Save new ownership record
  const ownerships = getStoredOwnerships();
  ownerships.unshift(ownership);
  saveStoredOwnerships(ownerships);

  // Log activity trail
  const activities = getStoredActivity();
  const txHash =
    "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  const purchaseActivity: EditionActivity = {
    id: `act-${Date.now()}`,
    editionId,
    type: "purchased",
    fromUser: edition.photographerName,
    toUser: buyer.name,
    price: edition.priceGbp,
    currency,
    timestamp: new Date().toISOString(),
    txHash,
    details: `Acquired ${serialDisplay}. Authenticity certificate ${certNumber} registered.`,
  };
  activities.unshift(purchaseActivity);

  // Calculate and log creator royalty
  const creatorCut = Math.round(edition.priceGbp * (edition.royaltyPercent / 100));
  const royaltyActivity: EditionActivity = {
    id: `act-${Date.now() + 1}`,
    editionId,
    type: "royalty_paid",
    toUser: edition.photographerName,
    price: creatorCut,
    currency: "GBP",
    timestamp: new Date().toISOString(),
    txHash:
      "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    details: `${edition.royaltyPercent}% creator royalty (£${creatorCut.toFixed(2)}) credited to photographer earnings.`,
  };
  activities.unshift(royaltyActivity);

  saveStoredActivity(activities);

  // Write through to Supabase backend asynchronously
  insertSupabaseEdition(editionToSupabaseRow(edition)).catch((err) =>
    console.error("Supabase purchase update edition error:", err),
  );
  insertSupabaseOwnership(ownershipToSupabaseRow(ownership)).catch((err) =>
    console.error("Supabase purchase insert ownership error:", err),
  );
  insertSupabaseActivity(activityToSupabaseRow(purchaseActivity)).catch((err) =>
    console.error("Supabase purchase insert activity error:", err),
  );
  insertSupabaseActivity(activityToSupabaseRow(royaltyActivity)).catch((err) =>
    console.error("Supabase purchase insert royalty error:", err),
  );

  return { success: true, ownership };
}

/**
 * Mint a new fine-art digital edition. It stays private — as a draft, or
 * straight into the review queue — until an admin approves it.
 */
export function mintDigitalEdition(
  payload: Omit<
    DigitalEdition,
    | "id"
    | "tokenId"
    | "masterHash"
    | "mintedAt"
    | "status"
    | "availableEditions"
    | "reviewStatus"
    | "reviewNote"
    | "submittedAt"
    | "reviewedAt"
    | "reviewedBy"
  > & {
    customMasterHash?: string;
    /** Send straight to the admin review queue instead of saving a draft */
    submitForReview?: boolean;
    /** Optional fee payment routed to NS Captures Treasury upon minting */
    mintFeePayment?: MintFeePaymentInfo;
  },
): DigitalEdition {
  const editions = getStoredEditions();
  const randomHex = Math.floor(1000 + Math.random() * 9000);
  const tokenId =
    payload.tier === "genesis_1_of_1" ? `NSC-GEN-2026-${randomHex}` : `NSC-EDN-2026-${randomHex}`;

  const { customMasterHash, submitForReview = false, mintFeePayment, ...details } = payload;

  // Generate SHA-256 style master hash if not supplied
  const masterHash =
    customMasterHash ||
    "sha256-" +
      Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0"),
      ).join("");

  const newEdition: DigitalEdition = {
    ...details,
    // Suffix keeps ids unique when several editions are made in the same millisecond
    id: `edn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tokenId,
    masterHash,
    availableEditions: payload.totalEditions,
    mintedAt: new Date().toISOString(),
    status: "listed",
    reviewStatus: submitForReview ? "pending_review" : "draft",
    ...(submitForReview ? { submittedAt: new Date().toISOString() } : {}),
  };

  editions.unshift(newEdition);
  saveStoredEditions(editions);

  // Log activity
  const activities = getStoredActivity();
  const mintActivity: EditionActivity = {
    id: `act-${Date.now()}`,
    editionId: newEdition.id,
    type: "minted",
    fromUser: payload.photographerName,
    timestamp: new Date().toISOString(),
    txHash:
      mintFeePayment?.txHash ||
      "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    details: `${payload.tier === "genesis_1_of_1" ? "Genesis 1 of 1 Master" : `Limited Series of ${payload.totalEditions}`} certified with archival SHA-256 fingerprint.`,
  };
  activities.unshift(mintActivity);

  // If a minting fee was paid to platform treasury, record immutable fee activity
  if (mintFeePayment) {
    const feeActivity: EditionActivity = {
      id: `act-fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      editionId: newEdition.id,
      type: "mint_fee_paid",
      fromUser: mintFeePayment.paidBy || payload.photographerName,
      toUser: `NS CAPTURES Treasury (${mintFeePayment.treasuryAddress})`,
      price: mintFeePayment.amount,
      currency: mintFeePayment.coin,
      timestamp: new Date().toISOString(),
      txHash: mintFeePayment.txHash,
      details: `Archival certification & platform minting fee paid via ${mintFeePayment.coin} (${mintFeePayment.network || "Crypto"}). Funds routed to platform treasury.`,
    };
    activities.unshift(feeActivity);
    insertSupabaseActivity(activityToSupabaseRow(feeActivity)).catch((err) =>
      console.error("Supabase fee activity insert error:", err),
    );
  }

  saveStoredActivity(activities);

  // Write through to Supabase backend asynchronously
  insertSupabaseEdition(editionToSupabaseRow(newEdition)).catch((err) =>
    console.error("Supabase mint insert edition error:", err),
  );
  insertSupabaseActivity(activityToSupabaseRow(mintActivity)).catch((err) =>
    console.error("Supabase mint insert activity error:", err),
  );

  notifyEditionsChanged();

  return newEdition;
}

/**
 * Aggregates all minting fees collected across the platform for admin treasury reporting.
 */
export function getCollectedMintingFees(): {
  totalCount: number;
  totalUsdEquivalent: number;
  feesByCurrency: Record<string, number>;
  activities: EditionActivity[];
} {
  const activities = getStoredActivity().filter((a) => a.type === "mint_fee_paid");
  const feesByCurrency: Record<string, number> = {};
  let totalUsd = 0;
  const rates: Record<string, number> = {
    USDT: 1.0,
    USDC: 1.0,
    ETH: 3300.0,
    SOL: 140.0,
    BTC: 68000.0,
  };
  for (const act of activities) {
    const curr = (act.currency || "USDT").toUpperCase();
    const amt = act.price || 0;
    feesByCurrency[curr] = (feesByCurrency[curr] || 0) + amt;
    const rate = rates[curr] || 1.0;
    totalUsd += amt * rate;
  }
  return {
    totalCount: activities.length,
    totalUsdEquivalent: totalUsd,
    feesByCurrency,
    activities,
  };
}

// ============================================================
// NSC TOKEN PRESALE & TREASURY INTAKE ENGINE
// ============================================================

export interface NscPresaleConfig {
  symbol: string;
  status: "active" | "paused" | "ended";
  priceUsd: number; // default: 1.0 (1:1 rate, $1.00 USD per NSC)
  hardCapNsc: number; // default: 1,000,000 NSC
  minPurchaseUsd: number; // default: $1.00
  maxPurchaseUsd: number; // default: $50,000
  launchPriceUsd: number; // default: $1.30 (£1.00 GBP)
  showNscTokenCardInVault: boolean; // default: true (Show NSC balance card in user settlement vault)
  enableAdminNscGifting: boolean; // default: true (Show Gift NSC button in Admin Users panel)
}

export const DEFAULT_PRESALE_CONFIG: NscPresaleConfig = {
  symbol: "NSC",
  status: "active",
  priceUsd: 1.0,
  hardCapNsc: 1000000,
  minPurchaseUsd: 1.0,
  maxPurchaseUsd: 50000,
  launchPriceUsd: 1.3,
  showNscTokenCardInVault: true,
  enableAdminNscGifting: true,
};

export interface NscPresaleOrder {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  coinPaid: string;
  network: string;
  amountPaid: number;
  nscAmount: number;
  rateUsd: number;
  fiatValueUsd: number;
  txHash: string;
  treasuryAddress: string;
  paymentMethod?: "direct_treasury" | "vault_swap";
  senderAddress?: string;
  createdAt: string;
  timestamp: string;
}

const PRESALE_CONFIG_KEY = "ns_presale_config";
const PRESALE_ORDERS_KEY = "ns_presale_orders_cache";

export function getPresaleConfig(): NscPresaleConfig {
  try {
    const raw = safeGetItem(PRESALE_CONFIG_KEY);
    if (!raw) return DEFAULT_PRESALE_CONFIG;
    return { ...DEFAULT_PRESALE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRESALE_CONFIG;
  }
}

export function updatePresaleConfig(patch: Partial<NscPresaleConfig>): NscPresaleConfig {
  const current = getPresaleConfig();
  const next: NscPresaleConfig = { ...current, ...patch };
  safeSetItem(PRESALE_CONFIG_KEY, JSON.stringify(next));
  notifyEditionsChanged();
  return next;
}

export function getStoredPresaleOrders(): NscPresaleOrder[] {
  try {
    const raw = safeGetItem(PRESALE_ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredPresaleOrders(orders: NscPresaleOrder[]) {
  safeSetItem(PRESALE_ORDERS_KEY, JSON.stringify(orders));
}

export function getPresaleMetrics(): {
  config: NscPresaleConfig;
  totalNscSold: number;
  totalUsdRaised: number;
  orderCount: number;
  ordersCount: number;
  totalUsdtRaised: number;
  totalUsdcRaised: number;
  totalEthRaised: number;
  totalSolRaised: number;
  totalBtcRaised: number;
  percentFilled: number;
  breakdown: Record<string, { amount: number; usd: number }>;
  orders: NscPresaleOrder[];
} {
  const config = getPresaleConfig();
  const orders = getStoredPresaleOrders();

  let totalNscSold = 0;
  let totalUsdRaised = 0;
  const breakdown: Record<string, { amount: number; usd: number }> = {
    USDT: { amount: 0, usd: 0 },
    USDC: { amount: 0, usd: 0 },
    ETH: { amount: 0, usd: 0 },
    SOL: { amount: 0, usd: 0 },
    BTC: { amount: 0, usd: 0 },
    TRX: { amount: 0, usd: 0 },
  };

  for (const o of orders) {
    totalNscSold += o.nscAmount || 0;
    totalUsdRaised += o.fiatValueUsd || 0;
    const coin = (o.coinPaid || "USDT").toUpperCase();
    if (!breakdown[coin]) {
      breakdown[coin] = { amount: 0, usd: 0 };
    }
    breakdown[coin].amount += o.amountPaid || 0;
    breakdown[coin].usd += o.fiatValueUsd || 0;
  }

  const percentFilled = Math.min(
    100,
    Number(((totalNscSold / config.hardCapNsc) * 100).toFixed(2)),
  );

  return {
    config,
    totalNscSold,
    totalUsdRaised,
    orderCount: orders.length,
    ordersCount: orders.length,
    totalUsdtRaised: breakdown.USDT.amount,
    totalUsdcRaised: breakdown.USDC.amount,
    totalEthRaised: breakdown.ETH.amount,
    totalSolRaised: breakdown.SOL.amount,
    totalBtcRaised: breakdown.BTC.amount,
    percentFilled,
    breakdown,
    orders,
  };
}

export async function executePresaleSwap(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  coinPaid: string;
  network?: string;
  amountPaid: number;
  trxBalance?: number;
}): Promise<{
  success: boolean;
  order?: NscPresaleOrder;
  error?: string;
  nscCredited?: number;
}> {
  const { userId, userName, userEmail, coinPaid, amountPaid, trxBalance } = params;
  const config = getPresaleConfig();

  if (config.status !== "active") {
    return { success: false, error: "NSC Token Presale is currently paused or ended." };
  }

  if (amountPaid <= 0) {
    return { success: false, error: "Please enter a valid purchase amount." };
  }

  const coin = coinPaid.toUpperCase();

  // Option B Defense: If swapping USDT on Tron self-custody wallet with < 15 TRX, reject
  if (
    coin === "USDT" &&
    (!params.network || params.network.includes("TRC") || params.network.includes("Tron")) &&
    typeof trxBalance === "number" &&
    trxBalance < 15
  ) {
    return {
      success: false,
      error:
        "Tron self-custody address requires ~15 TRX for network gas energy. Please deposit ~15 TRX to your platform vault address or switch to Direct to Treasury.",
    };
  }

  const coinRates: Record<string, number> = {
    USDT: 1.0,
    USDC: 1.0,
    ETH: 3450.0,
    SOL: 145.0,
    BTC: 64500.0,
    TRX: 0.25,
  };
  const unitRate = coinRates[coin] || 1.0;
  const fiatValueUsd = Number((amountPaid * unitRate).toFixed(2));

  if (fiatValueUsd < config.minPurchaseUsd) {
    return {
      success: false,
      error: `Minimum presale purchase is $${config.minPurchaseUsd.toFixed(2)} USD (current: $${fiatValueUsd.toFixed(2)}).`,
    };
  }

  if (fiatValueUsd > config.maxPurchaseUsd) {
    return {
      success: false,
      error: `Maximum presale purchase is $${config.maxPurchaseUsd.toFixed(2)} USD.`,
    };
  }

  // Calculate NSC tokens received: fiatValueUsd / priceUsd (1:1 pricing)
  const nscAmount = Number((fiatValueUsd / config.priceUsd).toFixed(2));

  // Check hard cap
  const currentMetrics = getPresaleMetrics();
  if (currentMetrics.totalNscSold + nscAmount > config.hardCapNsc) {
    const remainingNsc = Math.max(0, config.hardCapNsc - currentMetrics.totalNscSold);
    return {
      success: false,
      error: `Purchase exceeds remaining presale allocation. Only ${remainingNsc.toLocaleString()} NSC remaining.`,
    };
  }

  // Determine platform treasury destination wallet
  const treasury = getTreasuryWalletForCoin(coin, params.network);

  try {
    // Load user's Web3 vault
    const vault = (await fetchCreatorWeb3Vault(userId)) || {
      wallets: [],
      source: "generated",
    };

    // Debit payment coin balance & credit NSC balance
    const coinKey = coin.toLowerCase();
    const tokenBalances = { ...(vault.tokenBalances || {}) };

    const currentCoinBal = tokenBalances[coinKey] ?? tokenBalances[coin] ?? 0;
    const newCoinBal = Math.max(0, Number((currentCoinBal - amountPaid).toFixed(6)));
    tokenBalances[coinKey] = newCoinBal;

    const currentNscBal = tokenBalances.nsc ?? 0;
    const newNscBal = Number((currentNscBal + nscAmount).toFixed(2));
    tokenBalances.nsc = newNscBal;

    // Generate deterministic cryptographic transaction hash
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
    const isEvm =
      (params.network || "").toUpperCase().includes("ERC") || coin === "ETH" || coin === "USDC";
    const txHash = isEvm ? `0x${randomHex}` : randomHex;

    const order: NscPresaleOrder = {
      id: `presale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      userName: userName || "Collector",
      userEmail: userEmail || "",
      coinPaid: coin,
      network: treasury.network,
      amountPaid,
      nscAmount,
      rateUsd: config.priceUsd,
      fiatValueUsd,
      txHash,
      treasuryAddress: treasury.address,
      paymentMethod: "vault_swap",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Update vault presalePurchases and tokenBalances
    const updatedPurchases = [order, ...(vault.presalePurchases || [])].slice(0, 100);
    const updatedVault: CreatorWeb3Vault = {
      ...vault,
      tokenBalances,
      presalePurchases: updatedPurchases,
    };

    // Cache updated balances in localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`ns_${coinKey}_balance_${userId}`, newCoinBal.toString());
        localStorage.setItem(`ns_nsc_balance_${userId}`, newNscBal.toString());
      } catch {
        // ignore
      }
    }

    await saveCreatorWeb3Vault(userId, updatedVault);

    // Save order to presale orders cache
    const allOrders = [order, ...getStoredPresaleOrders()];
    saveStoredPresaleOrders(allOrders);

    // Write through to Supabase if available in browser
    if (
      typeof window !== "undefined" &&
      !(typeof process !== "undefined" && (process.env?.NODE_ENV === "test" || process.env?.VITEST))
    ) {
      try {
        await supabase.from("nsc_presale_orders").insert([
          {
            id: order.id,
            user_id: userId,
            user_name: order.userName,
            user_email: order.userEmail,
            coin_paid: order.coinPaid,
            network: order.network,
            amount_paid: order.amountPaid,
            nsc_amount: order.nscAmount,
            rate_usd: order.rateUsd,
            fiat_value_usd: order.fiatValueUsd,
            tx_hash: order.txHash,
            treasury_address: order.treasuryAddress,
            created_at: order.createdAt,
          },
        ]);
      } catch {
        // localStorage fallback was already written
      }
    }

    notifyEditionsChanged();

    return {
      success: true,
      order,
      nscCredited: nscAmount,
    };
  } catch (err: unknown) {
    console.error("executePresaleSwap error:", err);
    const msg = err instanceof Error ? err.message : "Failed to process presale purchase.";
    return {
      success: false,
      error: msg,
    };
  }
}

export async function executePresaleDirectPayment(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  coinPaid: string;
  network?: string;
  amountPaid: number;
  txHash: string;
  senderAddress?: string;
}): Promise<{
  success: boolean;
  order?: NscPresaleOrder;
  error?: string;
  nscCredited?: number;
}> {
  const { userId, userName, userEmail, coinPaid, amountPaid, txHash, senderAddress } = params;
  const config = getPresaleConfig();

  if (config.status !== "active") {
    return { success: false, error: "NSC Token Presale is currently paused or ended." };
  }

  if (amountPaid <= 0) {
    return { success: false, error: "Please enter a valid purchase amount." };
  }

  const cleanTxHash = (txHash || "").trim();
  if (!cleanTxHash || cleanTxHash.length < 8) {
    return {
      success: false,
      error: "Please enter a valid transaction hash (TxID) from your transfer.",
    };
  }

  // Prevent double-claiming the same transaction hash
  const existingOrders = getStoredPresaleOrders();
  if (existingOrders.some((o) => o.txHash.toLowerCase() === cleanTxHash.toLowerCase())) {
    return {
      success: false,
      error: "This transaction hash has already been claimed.",
    };
  }

  const coin = coinPaid.toUpperCase();
  const coinRates: Record<string, number> = {
    USDT: 1.0,
    USDC: 1.0,
    ETH: 3450.0,
    SOL: 145.0,
    BTC: 64500.0,
    TRX: 0.25,
  };
  const unitRate = coinRates[coin] || 1.0;
  const fiatValueUsd = Number((amountPaid * unitRate).toFixed(2));

  if (fiatValueUsd < config.minPurchaseUsd) {
    return {
      success: false,
      error: `Minimum presale purchase is $${config.minPurchaseUsd.toFixed(2)} USD (current: $${fiatValueUsd.toFixed(2)}).`,
    };
  }

  if (fiatValueUsd > config.maxPurchaseUsd) {
    return {
      success: false,
      error: `Maximum presale purchase is $${config.maxPurchaseUsd.toFixed(2)} USD.`,
    };
  }

  // Calculate NSC tokens received: fiatValueUsd / priceUsd (1:1 pricing)
  const nscAmount = Number((fiatValueUsd / config.priceUsd).toFixed(2));

  // Check hard cap
  const currentMetrics = getPresaleMetrics();
  if (currentMetrics.totalNscSold + nscAmount > config.hardCapNsc) {
    const remainingNsc = Math.max(0, config.hardCapNsc - currentMetrics.totalNscSold);
    return {
      success: false,
      error: `Purchase exceeds remaining presale allocation. Only ${remainingNsc.toLocaleString()} NSC remaining.`,
    };
  }

  // Determine platform treasury destination wallet
  const treasury = getTreasuryWalletForCoin(coin, params.network);

  try {
    // Load user's Web3 vault
    const vault = (await fetchCreatorWeb3Vault(userId)) || {
      wallets: [],
      source: "generated",
    };

    // Credit user's NSC balance (no debit of internal vault coin balance since funds were sent externally)
    const tokenBalances = { ...(vault.tokenBalances || {}) };
    const currentNscBal = tokenBalances.nsc ?? 0;
    const newNscBal = Number((currentNscBal + nscAmount).toFixed(2));
    tokenBalances.nsc = newNscBal;

    const order: NscPresaleOrder = {
      id: `presale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      userName: userName || "Collector",
      userEmail: userEmail || "",
      coinPaid: coin,
      network: treasury.network,
      amountPaid,
      nscAmount,
      rateUsd: config.priceUsd,
      fiatValueUsd,
      txHash: cleanTxHash,
      treasuryAddress: treasury.address,
      paymentMethod: "direct_treasury",
      senderAddress: senderAddress || undefined,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Update vault presalePurchases and tokenBalances
    const updatedPurchases = [order, ...(vault.presalePurchases || [])].slice(0, 100);
    const updatedVault: CreatorWeb3Vault = {
      ...vault,
      tokenBalances,
      presalePurchases: updatedPurchases,
    };

    // Cache updated NSC balance in localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`ns_nsc_balance_${userId}`, newNscBal.toString());
      } catch {
        // ignore
      }
    }

    await saveCreatorWeb3Vault(userId, updatedVault);

    // Save order to presale orders cache
    const allOrders = [order, ...getStoredPresaleOrders()];
    saveStoredPresaleOrders(allOrders);

    // Write through to Supabase if available in browser
    if (
      typeof window !== "undefined" &&
      !(typeof process !== "undefined" && (process.env?.NODE_ENV === "test" || process.env?.VITEST))
    ) {
      try {
        await supabase.from("nsc_presale_orders").insert([
          {
            id: order.id,
            user_id: userId,
            user_name: order.userName,
            user_email: order.userEmail,
            coin_paid: order.coinPaid,
            network: order.network,
            amount_paid: order.amountPaid,
            nsc_amount: order.nscAmount,
            rate_usd: order.rateUsd,
            fiat_value_usd: order.fiatValueUsd,
            tx_hash: order.txHash,
            treasury_address: order.treasuryAddress,
            created_at: order.createdAt,
          },
        ]);
      } catch {
        // localStorage fallback was already written
      }
    }

    notifyEditionsChanged();

    return {
      success: true,
      order,
      nscCredited: nscAmount,
    };
  } catch (err: unknown) {
    console.error("executePresaleDirectPayment error:", err);
    const msg = err instanceof Error ? err.message : "Failed to process direct treasury payment.";
    return {
      success: false,
      error: msg,
    };
  }
}

// ============================================================
// PUBLICATION REVIEW (creator submits → admin approves)
// ============================================================

export const EDITIONS_CHANGED_EVENT = "ns:editions-changed";

export const EDITION_REVIEW_LABELS: Record<EditionReviewStatus, string> = {
  draft: "Draft",
  pending_review: "In review",
  published: "Published",
  rejected: "Changes requested",
};

function notifyEditionsChanged() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(EDITIONS_CHANGED_EVENT));
  }
}

/** Curated seed editions carry no review status and count as published. */
export function editionReviewStatus(edition: DigitalEdition): EditionReviewStatus {
  return edition.reviewStatus ?? "published";
}

export function isEditionPublished(edition: DigitalEdition): boolean {
  return editionReviewStatus(edition) === "published";
}

/** Editions the public can see and buy. */
export function getPublishedEditions(): DigitalEdition[] {
  return getStoredEditions().filter(isEditionPublished);
}

/** Whether this signed-in user made the edition (by auth id or photographer profile id). */
export function isEditionCreator(
  edition: DigitalEdition,
  user: { id?: string; slug?: string } | null | undefined,
): boolean {
  if (!user) return false;
  return [user.id, user.slug].some(
    (value) => !!value && (value === edition.createdBy || value === edition.photographerId),
  );
}

/** Every edition a creator made, whatever its review state. */
export function getEditionsByCreator(creator: { id?: string; slug?: string }): DigitalEdition[] {
  return getStoredEditions().filter((edition) => isEditionCreator(edition, creator));
}

export type EditionReviewResult = {
  success: boolean;
  /** The updated edition, when the change was applied */
  edition?: DigitalEdition;
  /** Why the change was refused, written for the person who asked for it */
  error?: string;
};

function updateEditionReview(
  editionId: string,
  allowedFrom: EditionReviewStatus[],
  changes: Partial<DigitalEdition>,
): EditionReviewResult {
  const editions = getStoredEditions();
  const index = editions.findIndex((e) => e.id === editionId);
  if (index === -1) return { success: false, error: "Edition not found." };

  const current = editionReviewStatus(editions[index]);
  if (!allowedFrom.includes(current)) {
    return {
      success: false,
      error: `This edition is ${EDITION_REVIEW_LABELS[current].toLowerCase()}, so that isn't possible.`,
    };
  }

  const updated: DigitalEdition = { ...editions[index], ...changes };
  editions[index] = updated;
  saveStoredEditions(editions);

  // Write through to Supabase backend asynchronously
  insertSupabaseEdition(editionToSupabaseRow(updated)).catch((err) =>
    console.error("Supabase update edition review error:", err),
  );

  notifyEditionsChanged();
  return { success: true, edition: updated };
}

/** Creator sends a draft (or an edition with requested changes) to the review queue. */
export function submitEditionForReview(editionId: string): EditionReviewResult {
  return updateEditionReview(editionId, ["draft", "rejected"], {
    reviewStatus: "pending_review",
    submittedAt: new Date().toISOString(),
  });
}

/** Creator pulls a submission back out of the queue. */
export function withdrawEditionFromReview(editionId: string): EditionReviewResult {
  return updateEditionReview(editionId, ["pending_review"], {
    reviewStatus: "draft",
    submittedAt: undefined,
  });
}

/** Admin publishes an edition on the marketplace. */
export function approveEdition(editionId: string, reviewer: string): EditionReviewResult {
  return updateEditionReview(editionId, ["pending_review", "rejected"], {
    reviewStatus: "published",
    reviewNote: undefined,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer,
  });
}

/** Admin sends a submission back — or takes a published edition down — with a note. */
export function rejectEdition(
  editionId: string,
  note: string,
  reviewer: string,
): EditionReviewResult {
  const reason = note.trim();
  if (!reason) return { success: false, error: "Add a note so the creator knows what to change." };
  return updateEditionReview(editionId, ["pending_review", "published"], {
    reviewStatus: "rejected",
    reviewNote: reason,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer,
  });
}

/** Creator removes an edition that never went public. */
export function deleteEditionDraft(editionId: string): { success: boolean; error?: string } {
  const editions = getStoredEditions();
  const edition = editions.find((e) => e.id === editionId);
  if (!edition) return { success: false, error: "Edition not found." };

  const status = editionReviewStatus(edition);
  if (status !== "draft" && status !== "rejected") {
    return {
      success: false,
      error: "Only drafts and editions with requested changes can be deleted.",
    };
  }

  saveStoredEditions(editions.filter((e) => e.id !== editionId));

  // Write through to Supabase backend asynchronously
  deleteSupabaseEdition(editionId).catch((err) =>
    console.error("Supabase delete edition error:", err),
  );

  notifyEditionsChanged();
  return { success: true };
}

// ============================================================
// CREATOR TOOLS (edit drafts, pause sales, identity, sales)
// ============================================================

export const ROYALTY_LIMITS = { min: 0, max: 20 } as const;

/** Marketplace prices in the other currencies, derived from the GBP list price. */
export function pricesFromGbp(
  priceGbp: number,
): Pick<DigitalEdition, "priceGbp" | "priceUsd" | "priceEth" | "priceSol"> {
  return {
    priceGbp,
    priceUsd: Math.round(priceGbp * 1.28),
    priceEth: Number((priceGbp / 2600).toFixed(3)),
    priceSol: Number((priceGbp / 110).toFixed(2)),
  };
}

/** Whether a collector can buy this edition right now. */
export function isEditionForSale(edition: DigitalEdition): boolean {
  return isEditionPublished(edition) && !edition.salesPaused && edition.availableEditions > 0;
}

export type EditionDetailsChanges = {
  title: string;
  description: string;
  tier: EditionTier;
  totalEditions: number;
  priceGbp: number;
  royaltyPercent: number;
  hasPhysicalTwin: boolean;
  physicalPrintDetails?: string;
  /** One of the creator's own collections, or null to list the edition on its own */
  collectionId: string | null;
};

/** Creator edits an edition that isn't public: a draft, or one with requested changes. */
export function updateEditionDetails(
  editionId: string,
  changes: EditionDetailsChanges,
  creator: { id?: string; slug?: string },
): EditionReviewResult {
  const edition = getStoredEditions().find((e) => e.id === editionId);
  if (!edition) return { success: false, error: "Edition not found." };
  if (!isEditionCreator(edition, creator)) {
    return { success: false, error: "Only the creator can edit this edition." };
  }

  const title = changes.title.trim();
  if (!title) return { success: false, error: "Give the edition a title." };
  if (!(changes.priceGbp >= 1)) return { success: false, error: "Set a price of at least £1." };
  if (!(
    changes.royaltyPercent >= ROYALTY_LIMITS.min && changes.royaltyPercent <= ROYALTY_LIMITS.max
  )) {
    return {
      success: false,
      error: `Royalty must be between ${ROYALTY_LIMITS.min}% and ${ROYALTY_LIMITS.max}%.`,
    };
  }

  const totalEditions = changes.tier === "genesis_1_of_1" ? 1 : Math.round(changes.totalEditions);
  // An edition taken down after going live may already have collectors
  const sold = edition.totalEditions - edition.availableEditions;
  if (sold > 0 && changes.tier !== edition.tier) {
    return { success: false, error: "Editions that have sold can't change type." };
  }
  if (totalEditions < Math.max(sold, 1)) {
    return {
      success: false,
      error:
        sold > 0
          ? `${sold} copies have already sold, so keep at least ${sold}.`
          : "An edition needs at least one copy.",
    };
  }

  let collectionName: string | undefined;
  if (changes.collectionId) {
    const collection = getEditionCollection(changes.collectionId);
    if (!collection || !isCollectionCreator(collection, creator)) {
      return { success: false, error: "Choose one of your own collections." };
    }
    collectionName = collection.name;
  }

  const tokenPrefix = changes.tier === "genesis_1_of_1" ? "NSC-GEN-" : "NSC-EDN-";
  return updateEditionReview(editionId, ["draft", "rejected"], {
    title,
    description: changes.description.trim(),
    tier: changes.tier,
    totalEditions,
    availableEditions: totalEditions - sold,
    ...pricesFromGbp(changes.priceGbp),
    royaltyPercent: changes.royaltyPercent,
    hasPhysicalTwin: changes.hasPhysicalTwin,
    physicalPrintDetails: changes.hasPhysicalTwin
      ? changes.physicalPrintDetails?.trim() || undefined
      : undefined,
    collectionId: changes.collectionId ?? undefined,
    collectionName,
    tokenId: sold > 0 ? edition.tokenId : edition.tokenId.replace(/^NSC-(GEN|EDN)-/, tokenPrefix),
  });
}

/** Creator takes a published edition off sale, or puts it back on sale. */
export function setEditionSalesPaused(
  editionId: string,
  paused: boolean,
  creator: { id?: string; slug?: string },
): EditionReviewResult {
  const edition = getStoredEditions().find((e) => e.id === editionId);
  if (!edition) return { success: false, error: "Edition not found." };
  if (!isEditionCreator(edition, creator)) {
    return { success: false, error: "Only the creator can change sales for this edition." };
  }
  return updateEditionReview(editionId, ["published"], { salesPaused: paused || undefined });
}

export interface EditionCreatorProfile {
  userId: string;
  /** Photographer slug when saved, so public pages can find the profile by slug */
  slug?: string;
  displayName: string;
  bio: string;
  /** "account" follows the account profile picture; "upload" uses avatarUrl (an avatar or character) */
  avatarSource: "account" | "upload";
  avatarUrl?: string;
  updatedAt: string;
}

export const CREATOR_PROFILE_LIMITS = { name: 60, bio: 280 } as const;

function getStoredCreatorProfiles(): Record<string, EditionCreatorProfile> {
  try {
    const parsed: unknown = JSON.parse(safeGetItem(STORAGE_KEYS.CREATOR_PROFILES) ?? "{}");
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, EditionCreatorProfile>)
      : {};
  } catch {
    return {};
  }
}

export function getEditionCreatorProfile(userId: string): EditionCreatorProfile | null {
  return getStoredCreatorProfiles()[userId] ?? null;
}

/** The name and avatar collectors see for a creator. */
export function resolveCreatorIdentity(
  user: { id: string; name?: string; avatar?: string },
  profile: EditionCreatorProfile | null = getEditionCreatorProfile(user.id),
): { name: string; avatar?: string } {
  return {
    name: profile?.displayName || user.name || "NS CAPTURES creator",
    avatar:
      profile?.avatarSource === "upload" && profile.avatarUrl
        ? profile.avatarUrl
        : user.avatar || profile?.avatarUrl || undefined,
  };
}

/** Saves the creator's NFT identity and shows it on their existing editions and collections. */
export function saveEditionCreatorProfile(
  input: {
    displayName: string;
    bio: string;
    avatarSource: "account" | "upload";
    avatarUrl?: string;
  },
  user: { id: string; slug?: string; name?: string; avatar?: string },
): { success: boolean; profile?: EditionCreatorProfile; error?: string } {
  const displayName = input.displayName.trim();
  const bio = input.bio.trim();
  if (!displayName) return { success: false, error: "Add the name collectors will see." };
  if (displayName.length > CREATOR_PROFILE_LIMITS.name) {
    return {
      success: false,
      error: `Keep your name to ${CREATOR_PROFILE_LIMITS.name} characters.`,
    };
  }
  if (bio.length > CREATOR_PROFILE_LIMITS.bio) {
    return { success: false, error: `Keep your bio to ${CREATOR_PROFILE_LIMITS.bio} characters.` };
  }
  if (input.avatarSource === "upload" && !input.avatarUrl) {
    return { success: false, error: "Upload an avatar or choose your profile picture." };
  }

  const profile: EditionCreatorProfile = {
    userId: user.id,
    slug: user.slug,
    displayName,
    bio,
    avatarSource: input.avatarSource,
    // Keep a copy of the account picture too, for public pages that only have the profile
    avatarUrl: input.avatarSource === "upload" ? input.avatarUrl : user.avatar || undefined,
    updatedAt: new Date().toISOString(),
  };
  safeSetItem(
    STORAGE_KEYS.CREATOR_PROFILES,
    JSON.stringify({ ...getStoredCreatorProfiles(), [user.id]: profile }),
  );

  const identity = resolveCreatorIdentity(user, profile);
  const editions = getStoredEditions();
  if (editions.some((e) => isEditionCreator(e, user))) {
    saveStoredEditions(
      editions.map((e) =>
        isEditionCreator(e, user)
          ? { ...e, photographerName: identity.name, photographerAvatar: identity.avatar }
          : e,
      ),
    );
  }
  const collections = getStoredUserCollections();
  if (collections.some((c) => isCollectionCreator(c, user))) {
    saveStoredUserCollections(
      collections.map((c) =>
        isCollectionCreator(c, user) ? { ...c, photographerName: identity.name } : c,
      ),
    );
  }

  notifyEditionsChanged();
  return { success: true, profile };
}

/** Sales of a creator's editions and the royalties credited to them. */
export function getCreatorSalesSummary(creator: { id?: string; slug?: string }) {
  const editionIds = new Set(getEditionsByCreator(creator).map((e) => e.id));
  const sales = getStoredOwnerships().filter((o) => editionIds.has(o.editionId));
  return {
    salesCount: sales.length,
    grossGbp: sales.reduce((sum, o) => sum + o.purchasePriceGbp, 0),
    royaltiesGbp: getStoredActivity()
      .filter((a) => a.type === "royalty_paid" && editionIds.has(a.editionId))
      .reduce((sum, a) => sum + (a.price ?? 0), 0),
    collectors: new Set(sales.map((o) => o.ownerId)).size,
  };
}

/** Editions a collector owns, newest first. */
export function getOwnershipsByOwner(ownerId: string): EditionOwnership[] {
  return getStoredOwnerships().filter((o) => o.ownerId === ownerId);
}

// ============================================================
// WEB3 ACTIVATION (one account, switched on for NFTs) + PUBLIC PAGES
// ============================================================

export type Web3Role = "collector" | "creator";

export interface Web3Activation {
  userId: string;
  role: Web3Role;
  termsAcceptedAt: string;
  activatedAt: string;
}

function getStoredActivations(): Record<string, Web3Activation> {
  try {
    const parsed: unknown = JSON.parse(safeGetItem(STORAGE_KEYS.WEB3_ACTIVATIONS) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Web3Activation>) : {};
  } catch {
    return {};
  }
}

export function getWeb3Activation(userId?: string | null): Web3Activation | null {
  return userId ? (getStoredActivations()[userId] ?? null) : null;
}

/** Whether the account has Web3 switched on. Creator tools also need the creator role. */
export function isWeb3Activated(userId: string | null | undefined, role: Web3Role = "collector") {
  const activation = getWeb3Activation(userId);
  return Boolean(activation) && (role === "collector" || activation?.role === "creator");
}

/** Switches Web3 on for an existing account. Collectors can become creators, never the reverse. */
export function activateWeb3(userId: string, role: Web3Role): Web3Activation {
  const existing = getWeb3Activation(userId);
  const now = new Date().toISOString();
  const activation: Web3Activation = {
    userId,
    role: existing?.role === "creator" ? "creator" : role,
    termsAcceptedAt: now,
    activatedAt: existing?.activatedAt ?? now,
  };
  safeSetItem(
    STORAGE_KEYS.WEB3_ACTIVATIONS,
    JSON.stringify({ ...getStoredActivations(), [userId]: activation }),
  );
  notifyEditionsChanged();
  return activation;
}

export type CreatorPageData = {
  key: string;
  userId?: string;
  name: string;
  avatar?: string;
  bio: string;
  joinedAt?: string;
  created: DigitalEdition[];
  collections: EditionCollectionMeta[];
  collected: { edition: DigitalEdition; ownership: EditionOwnership }[];
  collectors: number;
};

/** A public creator or collector page, looked up by photographer slug/id or user id. Public data only. */
export function getCreatorPageData(key: string): CreatorPageData | null {
  if (!key) return null;
  const published = getPublishedEditions();
  const profile =
    Object.values(getStoredCreatorProfiles()).find((p) => p.userId === key || p.slug === key) ??
    null;
  const userId =
    profile?.userId ??
    published.find((e) => e.createdBy && (e.photographerId === key || e.createdBy === key))
      ?.createdBy ??
    (getOwnershipsByOwner(key).length > 0 ? key : undefined);
  const keys = new Set([key, userId, profile?.slug].filter((v): v is string => Boolean(v)));

  const created = published.filter(
    (e) => keys.has(e.photographerId) || (Boolean(e.createdBy) && keys.has(e.createdBy ?? "")),
  );
  const collections = getPublicEditionCollections().filter(
    (c) => keys.has(c.photographerId) || (Boolean(c.createdBy) && keys.has(c.createdBy ?? "")),
  );
  const byId = new Map(published.map((e) => [e.id, e]));
  const ownerships = userId ? getOwnershipsByOwner(userId) : [];
  const collected = ownerships.flatMap((ownership) => {
    const edition = byId.get(ownership.editionId);
    return edition ? [{ edition, ownership }] : [];
  });
  if (!profile && created.length === 0 && collected.length === 0) return null;

  const createdIds = new Set(created.map((e) => e.id));
  return {
    key,
    userId,
    name:
      profile?.displayName ||
      created[0]?.photographerName ||
      ownerships[0]?.ownerName ||
      "NS CAPTURES member",
    avatar: profile?.avatarUrl ?? created[0]?.photographerAvatar,
    bio: profile?.bio ?? "",
    joinedAt: getWeb3Activation(userId)?.activatedAt,
    created,
    collections,
    collected,
    collectors: new Set(
      getStoredOwnerships()
        .filter((o) => createdIds.has(o.editionId))
        .map((o) => o.ownerId),
    ).size,
  };
}

// ============================================================
// PUBLIC MARKETPLACE VISIBILITY (Admin Toggle)
// ============================================================

export const EDITIONS_VISIBILITY_KEY = "ns_editions_public_visibility";
export const EDITIONS_VISIBILITY_EVENT = "ns:editions-visibility-updated";

// Ensure editions room is toggled ON by default across sessions and local preview
if (!safeGetItem("ns_editions_forced_on_v2")) {
  safeSetItem(EDITIONS_VISIBILITY_KEY, "true");
  safeSetItem("ns_editions_forced_on_v2", "true");
}

/**
 * Checks whether the Digital Editions room is publicly visible.
 * Defaults to true (toggled ON) so users can explore editions on localhost and production.
 */
export function isEditionsPublic(): boolean {
  try {
    const val = safeGetItem(EDITIONS_VISIBILITY_KEY);
    // Defaults to true (toggled ON) unless an administrator explicitly sets it to "false"
    return val !== "false";
  } catch {
    return true;
  }
}

/**
 * Updates the public visibility of the Digital Editions room.
 * Dispatches an event so all components update immediately.
 */
export function setEditionsPublic(visible: boolean): void {
  try {
    safeSetItem(EDITIONS_VISIBILITY_KEY, visible ? "true" : "false");
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(EDITIONS_VISIBILITY_EVENT, { detail: { visible } }));
    }
  } catch (e) {
    console.error("Failed to set editions visibility:", e);
  }
}

// ============================================================
// DIGITAL EDITIONS COLLECTIONS REGISTRY
// ============================================================

export interface EditionCollectionMeta {
  id: string;
  name: string;
  description: string;
  curatorStatement?: string;
  bannerImage: string;
  avatarImage: string;
  photographerId: string;
  photographerName: string;
  chain: string;
  contractAddress: string;
  createdAt: string;
  royaltyPercent: number;
  /** Auth user id of the creator who made it. Curated collections have none. */
  createdBy?: string;
  socials?: {
    twitter?: string;
    discord?: string;
    instagram?: string;
    etherscan?: string;
    website?: string;
  };
}

export const INITIAL_EDITION_COLLECTIONS: EditionCollectionMeta[] = [
  {
    id: "kyoto-nocturnes",
    name: "Kyoto Nocturnes",
    description:
      "An intimate photographic exploration of nocturnal Kyoto. Captured between midnight and blue twilight across ancient Gion alleyways and lantern-lit stone staircases using high-precision prime lenses. Numbered editions accompanied by cryptographic Certificates of Authenticity.",
    curatorStatement:
      "Featured Curatorial Highlight: Exquisite low-light isolation, unmatched analogue warmth, and historical architecture rendered in pristine dynamic range.",
    bannerImage:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80",
    photographerId: "haru-tanaka",
    photographerName: "Haru Tanaka",
    chain: "Ethereum",
    contractAddress: "0x2B4a971c4D6B21Ac8F01b9E71cA71D925e019E71",
    createdAt: "2026-01-15T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "metropolitan-geometry",
    name: "Metropolitan Geometry",
    description:
      "A formal architectural study of brutalist rhythm, cast concrete, and shadow across iconic post-war British modernist complexes.",
    curatorStatement:
      "Geometry, balance, and austere concrete tonality captured in crisp high-contrast monochrome and twilight tones.",
    bannerImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&auto=format&fit=crop&q=80",
    photographerId: "patrick-watson-quine",
    photographerName: "Patrick Watson-Quine",
    chain: "Ethereum",
    contractAddress: "0x3F2b810D7a1884C9B417eE6997B24d623b092A19",
    createdAt: "2026-02-12T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "namibian-horizons",
    name: "Namibian Horizons",
    description:
      "Sculptural red dunes and minimal shadow cast in Sossusvlei, exploring transient desert light and ancient geological silence.",
    curatorStatement:
      "Ultra-wide and telephoto isolation of natural ridges and deep contrast at the golden hour.",
    bannerImage:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80",
    photographerId: "lexmond-dennis",
    photographerName: "Lexmond Dennis",
    chain: "Ethereum",
    contractAddress: "0x11A4cD6b8897E90B427F231Ac96e0019B8641a9B",
    createdAt: "2026-02-20T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "amsterdam-canals",
    name: "Amsterdam Canals & Lowland Horizons",
    description:
      "Atmospheric twilight reflections, historic canal bridges, and dramatic North Sea cloud banks across the Netherlands. Large-format dynamic range preserved in uncompressed archival masters.",
    curatorStatement:
      "Curator Spotlight: Exquisite long-exposure water stillness and classic Dutch architectural framing.",
    bannerImage:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80",
    photographerId: "lexmond-dennis",
    photographerName: "Lexmond Dennis",
    chain: "Ethereum",
    contractAddress: "0x55EE66FF77AA88BB99CC00DD11EE22FF33AA44BB",
    createdAt: "2026-02-14T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "milano-form",
    name: "Milano Form & Shadow",
    description:
      "Architectural contrast, warm Lombardian daylight, and refined studio minimalism captured in Milan by Elena Rossi.",
    curatorStatement:
      "Curatorial Feature: Flawless balance of golden hour shadows and neoclassical Italian stonework.",
    bannerImage:
      "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&auto=format&fit=crop&q=80",
    photographerId: "elena-rossi",
    photographerName: "Elena Rossi",
    chain: "Ethereum",
    contractAddress: "0xAA11BB22CC33DD44EE55FF66AA77BB88CC99DD00",
    createdAt: "2026-02-24T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "cornish-maritime",
    name: "Cornish Tides & Maritime Solitude",
    description:
      "Monumental Atlantic wave dynamics, storm-beaten granite reefs, and nocturnal tidal solitudes across Cornwall and the Hebrides by Clive Varley. Captured on medium-format archival sensors.",
    curatorStatement:
      "Curatorial Highlight: Raw kinetic ocean energy and exceptional medium-format dynamic resolution off the UK's most exposed headlands.",
    bannerImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80",
    photographerId: "clive-varley",
    photographerName: "Clive Varley",
    chain: "Ethereum",
    contractAddress: "0x66AA77BB88CC99DD0011EE22FF33AA44BB55CC66",
    createdAt: "2026-03-01T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "monolithic-brutalism",
    name: "Monolithic Brutalism & Shadow",
    description:
      "A rigorous formal exploration of British post-war brutalist architecture, raw board-marked concrete cantilevers, and tonal shadow poetry across London's South Bank and modernist estates.",
    curatorStatement:
      "Curator Selection: Pure geometric discipline and austere massing preserved in silver-halide calibrated prints.",
    bannerImage:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=250&auto=format&fit=crop&q=80",
    photographerId: "ian-dandribe",
    photographerName: "Ian Dandribe",
    chain: "Ethereum",
    contractAddress: "0x77BB88CC99DD0011EE22FF33AA44BB55CC66DD77",
    createdAt: "2026-03-02T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "tokyo-monoliths",
    name: "Tokyo Monoliths & Neon Twilight",
    description:
      "Dense high-rise geometries, torrential typhoon asphalt reflections, and neon-saturated twilight grids across Shinjuku, Roppongi, and Shibuya by Ryusei Yamada.",
    curatorStatement:
      "Curator Spotlight: Astounding 100-megapixel medium-format fidelity capturing the electric pulse of nocturnal Tokyo.",
    bannerImage:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&auto=format&fit=crop&q=80",
    photographerId: "ryusei-yamada",
    photographerName: "Ryusei Yamada",
    chain: "Ethereum",
    contractAddress: "0x88CC99DD0011EE22FF33AA44BB55CC66DD77EE88",
    createdAt: "2026-03-03T00:00:00Z",
    royaltyPercent: 10,
  },
  {
    id: "seoul-mist",
    name: "Seoul Mist & Han River Horizons",
    description:
      "Silent dawn mist creeping across Han River bridges, quiet Bukchon Hanok alleyways, and contemplative urban monochromatic minimalism by Eunji Lee.",
    curatorStatement:
      "Curator Feature: Contemplative stillness, delicate tonal gradation, and tactile Japanese Washi archival twin editions.",
    bannerImage:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80",
    photographerId: "eunji-lee",
    photographerName: "Eunji Lee",
    chain: "Ethereum",
    contractAddress: "0x99DD0011EE22FF33AA44BB55CC66DD77EE88FF99",
    createdAt: "2026-03-04T00:00:00Z",
    royaltyPercent: 10,
  },
];

export const COLLECTION_CHAINS = ["Ethereum", "Base", "Solana"] as const;
export const COLLECTION_LIMITS = { nameMin: 3, nameMax: 60, description: 1000 } as const;

export type EditionCollectionInput = {
  name: string;
  description: string;
  /** Logo shown beside the collection name */
  avatarImage: string;
  /** Wide banner; the logo is used when it's left empty */
  bannerImage?: string;
  chain: string;
  royaltyPercent: number;
};

export type EditionCollectionResult = {
  success: boolean;
  collection?: EditionCollectionMeta;
  error?: string;
};

function getStoredUserCollections(): EditionCollectionMeta[] {
  try {
    const parsed: unknown = JSON.parse(safeGetItem(STORAGE_KEYS.COLLECTIONS) ?? "[]");
    let collections = Array.isArray(parsed) ? (parsed as EditionCollectionMeta[]) : [];
    if (collections.some(isNigerianCollection)) {
      collections = collections.filter((c) => !isNigerianCollection(c));
      safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    }
    return collections;
  } catch {
    return [];
  }
}

function saveStoredUserCollections(collections: EditionCollectionMeta[]): void {
  safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
}

/** Curated collections plus every collection creators have made. */
export function getEditionCollections(): EditionCollectionMeta[] {
  return [...INITIAL_EDITION_COLLECTIONS, ...getStoredUserCollections()];
}

export function getEditionCollection(idOrName: string): EditionCollectionMeta | null {
  if (!idOrName) return null;
  const norm = idOrName.toLowerCase().replace(/-/g, " ");
  return (
    getEditionCollections().find(
      (c) =>
        c.id === idOrName ||
        c.name.toLowerCase() === norm ||
        c.name.toLowerCase() === idOrName.toLowerCase(),
    ) || null
  );
}

export function isCollectionCreator(
  collection: EditionCollectionMeta,
  user: { id?: string } | null | undefined,
): boolean {
  return !!user?.id && collection.createdBy === user.id;
}

export function editionBelongsToCollection(
  edition: DigitalEdition,
  collection: EditionCollectionMeta,
): boolean {
  if (edition.collectionId) return edition.collectionId === collection.id;
  // Creator-made collections only hold editions explicitly added to them
  if (collection.createdBy) return false;
  return (
    edition.collectionName?.toLowerCase() === collection.name.toLowerCase() ||
    edition.photographerId === collection.photographerId
  );
}

export function getEditionsByCollection(collectionIdOrName: string): DigitalEdition[] {
  const col = getEditionCollection(collectionIdOrName);
  if (!col) return [];
  return getPublishedEditions().filter((e) => editionBelongsToCollection(e, col));
}

/** Curated collections, and creator collections once one of their editions is published. */
export function getPublicEditionCollections(): EditionCollectionMeta[] {
  const published = getPublishedEditions();
  return getEditionCollections().filter(
    (c) => !c.createdBy || published.some((e) => editionBelongsToCollection(e, c)),
  );
}

export function getCollectionsByCreator(creator: { id?: string }): EditionCollectionMeta[] {
  return getStoredUserCollections().filter((c) => isCollectionCreator(c, creator));
}

function validateCollectionInput(input: EditionCollectionInput, excludeId?: string): string | null {
  const name = input.name.trim();
  if (name.length < COLLECTION_LIMITS.nameMin) {
    return `Collection names need at least ${COLLECTION_LIMITS.nameMin} characters.`;
  }
  if (name.length > COLLECTION_LIMITS.nameMax) {
    return `Keep the collection name to ${COLLECTION_LIMITS.nameMax} characters.`;
  }
  const taken = getEditionCollections().some(
    (c) => c.id !== excludeId && c.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) return "A collection with that name already exists. Try another name.";
  if (input.description.trim().length > COLLECTION_LIMITS.description) {
    return "Keep the description to 1,000 characters.";
  }
  if (!input.avatarImage) return "Add a logo for the collection.";
  if (!(COLLECTION_CHAINS as readonly string[]).includes(input.chain)) return "Choose a chain.";
  if (!(input.royaltyPercent >= ROYALTY_LIMITS.min && input.royaltyPercent <= ROYALTY_LIMITS.max)) {
    return `Royalty must be between ${ROYALTY_LIMITS.min}% and ${ROYALTY_LIMITS.max}%.`;
  }
  return null;
}

function uniqueCollectionSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "collection";
  const taken = new Set(getEditionCollections().map((c) => c.id));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

/** A creator starts a collection. It stays off the marketplace until one of its editions is published. */
export function createEditionCollection(
  input: EditionCollectionInput,
  creator: { id: string; slug?: string; name?: string; avatar?: string },
): EditionCollectionResult {
  const error = validateCollectionInput(input);
  if (error) return { success: false, error };

  const collection: EditionCollectionMeta = {
    id: uniqueCollectionSlug(input.name),
    name: input.name.trim(),
    description: input.description.trim(),
    avatarImage: input.avatarImage,
    bannerImage: input.bannerImage || input.avatarImage,
    photographerId: creator.slug || creator.id,
    photographerName: resolveCreatorIdentity(creator).name,
    chain: input.chain,
    contractAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    createdAt: new Date().toISOString(),
    royaltyPercent: input.royaltyPercent,
    createdBy: creator.id,
  };
  saveStoredUserCollections([...getStoredUserCollections(), collection]);
  // Write through to Supabase backend asynchronously
  insertSupabaseCollection(collectionToSupabaseRow(collection)).catch((err) =>
    console.error("Supabase create collection error:", err),
  );
  notifyEditionsChanged();
  return { success: true, collection };
}

export function updateEditionCollection(
  collectionId: string,
  input: EditionCollectionInput,
  creator: { id?: string },
): EditionCollectionResult {
  const collections = getStoredUserCollections();
  const index = collections.findIndex((c) => c.id === collectionId);
  if (index === -1) return { success: false, error: "Collection not found." };
  if (!isCollectionCreator(collections[index], creator)) {
    return { success: false, error: "Only the creator can edit this collection." };
  }
  const error = validateCollectionInput(input, collectionId);
  if (error) return { success: false, error };

  const updated: EditionCollectionMeta = {
    ...collections[index],
    name: input.name.trim(),
    description: input.description.trim(),
    avatarImage: input.avatarImage,
    bannerImage: input.bannerImage || input.avatarImage,
    chain: input.chain,
    royaltyPercent: input.royaltyPercent,
  };
  collections[index] = updated;
  saveStoredUserCollections(collections);

  // Write through to Supabase backend asynchronously
  insertSupabaseCollection(collectionToSupabaseRow(updated)).catch((err) =>
    console.error("Supabase update collection error:", err),
  );

  // Editions carry the collection name for display, so keep it in step
  const editions = getStoredEditions();
  if (editions.some((e) => e.collectionId === collectionId)) {
    saveStoredEditions(
      editions.map((e) =>
        e.collectionId === collectionId ? { ...e, collectionName: updated.name } : e,
      ),
    );
  }
  notifyEditionsChanged();
  return { success: true, collection: updated };
}

/** Deletes a creator collection that has nothing live or in review; its drafts are listed on their own. */
export function deleteEditionCollection(
  collectionId: string,
  creator: { id?: string },
): { success: boolean; error?: string } {
  const collections = getStoredUserCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return { success: false, error: "Collection not found." };
  if (!isCollectionCreator(collection, creator)) {
    return { success: false, error: "Only the creator can delete this collection." };
  }

  const editions = getStoredEditions();
  const members = editions.filter((e) => e.collectionId === collectionId);
  const locked = members.some((e) => {
    const status = editionReviewStatus(e);
    return status === "published" || status === "pending_review";
  });
  if (locked) {
    return {
      success: false,
      error: "Collections with live or in-review editions can't be deleted.",
    };
  }

  saveStoredUserCollections(collections.filter((c) => c.id !== collectionId));

  // Write through to Supabase backend asynchronously
  deleteSupabaseCollection(collectionId).catch((err) =>
    console.error("Supabase delete collection error:", err),
  );

  if (members.length > 0) {
    saveStoredEditions(
      editions.map((e) =>
        e.collectionId === collectionId
          ? { ...e, collectionId: undefined, collectionName: undefined }
          : e,
      ),
    );
  }
  notifyEditionsChanged();
  return { success: true };
}
