/**
 * NS CAPTURES - Platform-Native Fine-Art Digital Editions (NFT) Engine
 *
 * Provides fine-art digital editions, cryptographic certificates of authenticity,
 * ownership provenance, secondary reselling, and Web3 crypto deposit verification gating.
 */

export type EditionTier = "genesis_1_of_1" | "limited_series" | "physical_twin";
export type EditionStatus = "minted" | "listed" | "sold_out" | "archived";
/** Where an edition sits in the creator → admin publication review. */
export type EditionReviewStatus = "draft" | "pending_review" | "published" | "rejected";

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
  /** Auth user id of the creator who made this edition on the platform */
  createdBy?: string;
  /** Publication review. Curated seed editions have none and are already public. */
  reviewStatus?: EditionReviewStatus;
  /** Admin's note to the creator when changes are requested */
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
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
  purchaseCurrency: "GBP" | "ETH" | "USDT" | "SOL";
  certificateNumber: string; // e.g. "COA-NSC-48192-03"
  isListedForResale: boolean;
  resalePriceGbp?: number;
}

export interface EditionActivity {
  id: string;
  editionId: string;
  type: "minted" | "listed" | "purchased" | "transferred" | "royalty_paid";
  fromUser?: string;
  toUser?: string;
  price?: number;
  currency?: string;
  timestamp: string;
  txHash: string;
  details?: string;
}

export interface DepositGateConfig {
  minimumDepositUsd: number;
  ethThreshold: number;
  solThreshold: number;
  usdtThreshold: number;
  usdcThreshold: number;
  btcThreshold: number;
  enforceDepositGate: boolean;
}

export const DEFAULT_DEPOSIT_CONFIG: DepositGateConfig = {
  minimumDepositUsd: 20,
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
    collectionName: "Kyoto Nocturnes",
  },
  {
    id: "edn-numbered-02",
    tokenId: "NSC-EDN-2026-0014",
    photoId: "p-sung-02",
    title: "Monolith & Silence, Gangwon Mist",
    description:
      "Curated limited series of 15 archival digital editions. Captured at dawn in the remote mountain passes of Gangwon province.",
    photographerId: "junghoon-sung-e85d599d",
    photographerName: "Junghoon Sung",
    photographerSlug: "junghoon-sung-e85d599d",
    photographerAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=85",
    masterHash: "sha256-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    tier: "limited_series",
    totalEditions: 15,
    availableEditions: 11,
    priceGbp: 450,
    priceUsd: 580,
    priceEth: 0.18,
    priceSol: 4.2,
    royaltyPercent: 10,
    hasPhysicalTwin: false,
    camera: "Hasselblad X2D 100C",
    lens: "XCD 55mm f/2.5 V",
    iso: 64,
    aperture: "f/8.0",
    shutterSpeed: "1/60s",
    location: "Gangwon-do, South Korea",
    yearCreated: 2025,
    mintedAt: "2026-02-18T09:15:00Z",
    status: "listed",
    featured: true,
    curatorNote: "100-megapixel medium-format master capturing ethereal atmospheric transitions.",
    collectionName: "Korean Peninsula Silences",
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
    collectionName: "Namibian Horizons",
  },
];

// Initial seed ownerships
export const INITIAL_OWNERSHIPS: EditionOwnership[] = [
  {
    id: "own-001",
    editionId: "edn-numbered-02",
    serialNumber: 1,
    serialDisplay: "#01 / 15",
    ownerId: "collector-marcus",
    ownerName: "Marcus Vance",
    ownerEmail: "marcus.vance@vanceart.co.uk",
    ownerWalletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78",
    acquiredAt: "2026-02-19T10:14:00Z",
    purchasePriceGbp: 450,
    purchaseCurrency: "GBP",
    certificateNumber: "COA-NSC-2026-0014-01",
    isListedForResale: false,
  },
  {
    id: "own-002",
    editionId: "edn-numbered-02",
    serialNumber: 2,
    serialDisplay: "#02 / 15",
    ownerId: "collector-elena",
    ownerName: "Elena Rostova",
    ownerEmail: "elena@rostovagallery.ch",
    ownerWalletAddress: "0x5fe17c1dEb702ba15B88E8d04F0CaD7a64B803a7",
    acquiredAt: "2026-02-21T16:22:00Z",
    purchasePriceGbp: 450,
    purchaseCurrency: "ETH",
    certificateNumber: "COA-NSC-2026-0014-02",
    isListedForResale: false,
  },
  {
    id: "own-003",
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
    editionId: "edn-numbered-02",
    type: "purchased",
    fromUser: "Junghoon Sung",
    toUser: "Marcus Vance",
    price: 450,
    currency: "GBP",
    timestamp: "2026-02-19T10:14:00Z",
    txHash: "0x4b78c912ef65a0b94389cdef128938aa",
    details: "Acquired Edition #01 / 15. Certificate of Authenticity COA-NSC-2026-0014-01 issued.",
  },
  {
    id: "act-03",
    editionId: "edn-numbered-02",
    type: "royalty_paid",
    toUser: "Junghoon Sung",
    price: 45,
    currency: "GBP",
    timestamp: "2026-02-19T10:14:00Z",
    txHash: "0x2e8f1920acb91048e9a2b049d819c901",
    details: "10% primary creator cut disbursed to creator earnings.",
  },
];

const STORAGE_KEYS = {
  EDITIONS: "ns_digital_editions_v1",
  OWNERSHIPS: "ns_edition_ownerships_v1",
  ACTIVITY: "ns_edition_activity_v1",
  CONFIG: "ns_edition_deposit_config_v1",
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
  } catch (_e) {
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
  } catch (_e) {
    // ignore
  }
  memoryStore[key] = val;
}

export function getStoredEditions(): DigitalEdition[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.EDITIONS);
    if (!raw) {
      safeSetItem(STORAGE_KEYS.EDITIONS, JSON.stringify(INITIAL_EDITIONS));
      return INITIAL_EDITIONS;
    }
    return JSON.parse(raw);
  } catch (_e) {
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
    return JSON.parse(raw);
  } catch (_e) {
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
    return JSON.parse(raw);
  } catch (_e) {
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

export function getDepositConfig(): DepositGateConfig {
  try {
    const raw = safeGetItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_DEPOSIT_CONFIG;
    return { ...DEFAULT_DEPOSIT_CONFIG, ...JSON.parse(raw) };
  } catch (_e) {
    return DEFAULT_DEPOSIT_CONFIG;
  }
}

export function saveDepositConfig(cfg: Partial<DepositGateConfig>): DepositGateConfig {
  const current = getDepositConfig();
  const updated = { ...current, ...cfg };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save deposit config:", e);
    }
  }
  return updated;
}

/**
 * Checks if a user's on-chain balances qualify to mint or list an edition.
 * Checks ETH, SOL, USDT, USDC, or BTC across their derived vault balances.
 */
export function checkDepositEligibility(balances: {
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

  const eth = balances.eth || 0;
  const sol = balances.sol || 0;
  const usdt = balances.usdt || 0;
  const usdc = balances.usdc || 0;
  const btc = balances.btc || 0;

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
    reason: `Requires an active deposit in your Web3 Vault (min: ${config.ethThreshold} ETH, ${config.solThreshold} SOL, ${config.usdtThreshold} USDT/USDC, or ${config.btcThreshold} BTC).`,
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
  currency: "GBP" | "ETH" | "USDT" | "SOL" = "GBP",
): { success: boolean; ownership?: EditionOwnership; error?: string } {
  const editions = getStoredEditions();
  const editionIndex = editions.findIndex((e) => e.id === editionId);

  if (editionIndex === -1) {
    return { success: false, error: "Edition not found." };
  }

  const edition = editions[editionIndex];
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

  activities.unshift({
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
  });

  // Calculate and log creator royalty
  const creatorCut = Math.round(edition.priceGbp * (edition.royaltyPercent / 100));
  activities.unshift({
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
  });

  saveStoredActivity(activities);

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
  },
): DigitalEdition {
  const editions = getStoredEditions();
  const randomHex = Math.floor(1000 + Math.random() * 9000);
  const tokenId =
    payload.tier === "genesis_1_of_1" ? `NSC-GEN-2026-${randomHex}` : `NSC-EDN-2026-${randomHex}`;

  const { customMasterHash, submitForReview = false, ...details } = payload;

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
    id: `edn-${Date.now()}`,
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
  activities.unshift({
    id: `act-${Date.now()}`,
    editionId: newEdition.id,
    type: "minted",
    fromUser: payload.photographerName,
    timestamp: new Date().toISOString(),
    txHash:
      "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    details: `${payload.tier === "genesis_1_of_1" ? "Genesis 1 of 1 Master" : `Limited Series of ${payload.totalEditions}`} certified with archival SHA-256 fingerprint.`,
  });
  saveStoredActivity(activities);

  return newEdition;
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
  notifyEditionsChanged();
  return { success: true };
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
    id: "korean-peninsula-silences",
    name: "Korean Peninsula Silences",
    description:
      "100-megapixel medium-format masterworks documenting morning mists and monolith ridges across Gangwon-do. An ode to solitude, geological patience, and silent mountain passes.",
    curatorStatement:
      "Captured on Hasselblad X2D 100C with extreme resolution, preserving delicate tonal gradation across alpine mountain passes.",
    bannerImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2400&auto=format&fit=crop&q=85",
    avatarImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80",
    photographerId: "junghoon-sung-e85d599d",
    photographerName: "Junghoon Sung",
    chain: "Ethereum",
    contractAddress: "0x89C1a54E0F45963E879B54128D849B11306d15E3",
    createdAt: "2026-02-01T00:00:00Z",
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
];

export function getEditionCollections(): EditionCollectionMeta[] {
  return INITIAL_EDITION_COLLECTIONS;
}

export function getEditionCollection(idOrName: string): EditionCollectionMeta | null {
  if (!idOrName) return null;
  const norm = idOrName.toLowerCase().replace(/-/g, " ");
  return (
    INITIAL_EDITION_COLLECTIONS.find(
      (c) =>
        c.id === idOrName ||
        c.name.toLowerCase() === norm ||
        c.name.toLowerCase() === idOrName.toLowerCase(),
    ) || null
  );
}

export function getEditionsByCollection(collectionIdOrName: string): DigitalEdition[] {
  const col = getEditionCollection(collectionIdOrName);
  if (!col) return [];
  const allEditions = getPublishedEditions();
  return allEditions.filter(
    (e) =>
      e.collectionName?.toLowerCase() === col.name.toLowerCase() ||
      e.photographerId === col.photographerId,
  );
}
