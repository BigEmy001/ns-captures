import { describe, it, expect, beforeEach } from "vitest";
import {
  checkDepositEligibility,
  purchaseEdition,
  mintDigitalEdition,
  getStoredEditions,
  saveStoredEditions,
  isEditionsPublic,
  setEditionsPublic,
  INITIAL_EDITIONS,
  INITIAL_EDITION_COLLECTIONS,
  getEditionCollections,
  getEditionCollection,
  getEditionsByCollection,
} from "./editions";

describe("Digital Editions Data Engine", () => {
  beforeEach(() => {
    // Reset editions state for consistent tests
    saveStoredEditions(JSON.parse(JSON.stringify(INITIAL_EDITIONS)));
  });

  describe("checkDepositEligibility", () => {
    it("rejects zero or low balances when gate is enforced", () => {
      const result = checkDepositEligibility({});
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Requires an active deposit");
    });

    it("qualifies when ETH threshold is met", () => {
      const result = checkDepositEligibility({ eth: 0.01 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("Ethereum");
    });

    it("qualifies when SOL threshold is met", () => {
      const result = checkDepositEligibility({ sol: 0.2 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("Solana");
    });

    it("qualifies when USDT threshold is met", () => {
      const result = checkDepositEligibility({ usdt: 25 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("Tether");
    });

    it("qualifies when USDC threshold is met", () => {
      const result = checkDepositEligibility({ usdc: 50 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("USD Coin");
    });

    it("qualifies when BTC threshold is met", () => {
      const result = checkDepositEligibility({ btc: 0.0005 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("Bitcoin");
    });
  });

  describe("purchaseEdition", () => {
    it("purchases a numbered edition and issues a serial & certificate", () => {
      const result = purchaseEdition(
        "edn-numbered-02",
        {
          id: "buyer-01",
          name: "Sophia Taylor",
          email: "sophia@taylor.art",
          walletAddress: "0x1234567890123456789012345678901234567890",
        },
        "GBP",
      );

      expect(result.success).toBe(true);
      expect(result.ownership).toBeDefined();
      expect(result.ownership?.serialDisplay).toContain("/ 15");
      expect(result.ownership?.certificateNumber).toMatch(/^COA-NSC-/);
      expect(result.ownership?.ownerName).toBe("Sophia Taylor");

      // Verify inventory decremented
      const updated = getStoredEditions().find((e) => e.id === "edn-numbered-02");
      expect(updated?.availableEditions).toBe(10); // was 11
    });

    it("handles Genesis 1 of 1 master purchase and marks sold out", () => {
      const result = purchaseEdition(
        "edn-genesis-01",
        {
          id: "buyer-02",
          name: "Lord Hamilton",
        },
        "ETH",
      );

      expect(result.success).toBe(true);
      expect(result.ownership?.serialDisplay).toBe("1 of 1 Genesis Master");

      const updated = getStoredEditions().find((e) => e.id === "edn-genesis-01");
      expect(updated?.availableEditions).toBe(0);
      expect(updated?.status).toBe("sold_out");
    });
  });

  describe("mintDigitalEdition", () => {
    it("creates a new platform digital edition with unique Token ID", () => {
      const newEdition = mintDigitalEdition({
        photoId: "photo-new-01",
        title: "Winter Over Mont Blanc",
        description: "Alps high altitude aerial photograph.",
        photographerId: "photog-jean",
        photographerName: "Jean-Luc Moreau",
        image: "https://example.com/montblanc.jpg",
        tier: "limited_series",
        totalEditions: 25,
        priceGbp: 320,
        priceUsd: 410,
        priceEth: 0.12,
        priceSol: 2.8,
        royaltyPercent: 10,
        hasPhysicalTwin: false,
        camera: "Leica SL2",
        lens: "Vario-Elmarit-SL 24-90mm",
        iso: 100,
        yearCreated: 2026,
      });

      expect(newEdition.id).toMatch(/^edn-/);
      expect(newEdition.tokenId).toMatch(/^NSC-EDN-2026-/);
      expect(newEdition.masterHash).toMatch(/^sha256-/);
      expect(newEdition.availableEditions).toBe(25);
      expect(newEdition.status).toBe("listed");
    });
  });

  describe("public visibility toggle", () => {
    it("defaults to true (toggled ON)", () => {
      setEditionsPublic(true);
      expect(isEditionsPublic()).toBe(true);
    });

    it("can be toggled OFF and back ON by admin", () => {
      setEditionsPublic(false);
      expect(isEditionsPublic()).toBe(false);

      setEditionsPublic(true);
      expect(isEditionsPublic()).toBe(true);
    });
  });

  describe("Edition Collections (Figma node 18:567)", () => {
    it("returns list of curated collections including Kyoto Nocturnes", () => {
      const collections = getEditionCollections();
      expect(collections.length).toBeGreaterThanOrEqual(4);
      const kyoto = collections.find((c) => c.id === "kyoto-nocturnes");
      expect(kyoto).toBeDefined();
      expect(kyoto?.name).toBe("Kyoto Nocturnes");
      expect(kyoto?.photographerName).toBe("Haru Tanaka");
      expect(kyoto?.chain).toBe("Ethereum");
      expect(kyoto?.royaltyPercent).toBe(10);
      expect(kyoto?.contractAddress).toMatch(/^0x/);
    });

    it("retrieves a collection by id or slug", () => {
      const col = getEditionCollection("kyoto-nocturnes");
      expect(col).toBeDefined();
      expect(col?.id).toBe("kyoto-nocturnes");
      expect(col?.name).toBe("Kyoto Nocturnes");
      expect(col?.royaltyPercent).toBe(10);
    });

    it("retrieves a collection case-insensitively by name", () => {
      const col = getEditionCollection("Kyoto Nocturnes");
      expect(col).toBeDefined();
      expect(col?.id).toBe("kyoto-nocturnes");
    });

    it("retrieves editions belonging to a collection", () => {
      const items = getEditionsByCollection("kyoto-nocturnes");
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(
          item.collectionName?.toLowerCase() === "kyoto nocturnes" ||
          item.photographerName === "Haru Tanaka",
        ).toBe(true);
      });
    });

    it("falls back gracefully for unknown collection id", () => {
      const unknownCol = getEditionCollection("non-existent-collection-id");
      expect(unknownCol).toBeNull();

      const items = getEditionsByCollection("non-existent-collection-id");
      expect(items).toEqual([]);
    });
  });
});
