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
  getEditionCollections,
  getEditionCollection,
  getEditionsByCollection,
  approveEdition,
  deleteEditionDraft,
  getEditionsByCreator,
  getPublishedEditions,
  isEditionPublished,
  rejectEdition,
  submitEditionForReview,
  withdrawEditionFromReview,
  createEditionCollection,
  deleteEditionCollection,
  getCollectionsByCreator,
  getCreatorSalesSummary,
  getPublicEditionCollections,
  pricesFromGbp,
  gbpToNsc,
  NSC_PER_GBP,
  resolveCreatorIdentity,
  saveEditionCreatorProfile,
  setEditionSalesPaused,
  updateEditionDetails,
  activateWeb3,
  getCreatorPageData,
  getWeb3Activation,
  isWeb3Activated,
  getCollectedMintingFees,
  PLATFORM_TREASURY_WALLETS,
  getTreasuryWalletForCoin,
  getDepositConfig,
  saveDepositConfig,
  getPresaleConfig,
  updatePresaleConfig,
  getStoredPresaleOrders,
  saveStoredPresaleOrders,
  getPresaleMetrics,
  executePresaleSwap,
  executePresaleDirectPayment,
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
      expect(result.reason).toContain("Requires active NSC or deposit");
    });

    it("qualifies when NSC platform token threshold is met", () => {
      const result = checkDepositEligibility({ nsc: 25 });
      expect(result.eligible).toBe(true);
      expect(result.qualifyingToken).toContain("NSC");
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
        "edn-numbered-03",
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
      expect(result.ownership?.serialDisplay).toContain("/ 25");
      expect(result.ownership?.certificateNumber).toMatch(/^COA-NSC-/);
      expect(result.ownership?.ownerName).toBe("Sophia Taylor");

      // Verify inventory decremented
      const updated = getStoredEditions().find((e) => e.id === "edn-numbered-03");
      expect(updated?.availableEditions).toBe(18); // was 19
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

    it("purchases an edition denominated in NSC", () => {
      const result = purchaseEdition(
        "edn-numbered-03",
        {
          id: "buyer-nsc-01",
          name: "NSC Collector",
          walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
        "NSC",
      );

      expect(result.success).toBe(true);
      expect(result.ownership?.purchaseCurrency).toBe("NSC");
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
      expect(newEdition.reviewStatus).toBe("draft");
    });
  });

  describe("publication review", () => {
    const mintForCreator = (submitForReview = false) =>
      mintDigitalEdition({
        photoId: "photo-review-01",
        title: "Harbour Fog at Dawn",
        description: "Test edition for the review workflow.",
        photographerId: "photog-anna",
        photographerName: "Anna Holm",
        createdBy: "user-anna",
        image: "https://example.com/harbour.jpg",
        tier: "limited_series",
        totalEditions: 10,
        priceGbp: 200,
        priceUsd: 256,
        priceEth: 0.08,
        priceSol: 1.8,
        royaltyPercent: 10,
        hasPhysicalTwin: false,
        camera: "Fujifilm GFX 100S",
        lens: "GF 45mm f/2.8",
        iso: 100,
        yearCreated: 2026,
        submitForReview,
      });

    it("treats curated seed editions as published", () => {
      expect(getPublishedEditions()).toHaveLength(INITIAL_EDITIONS.length);
    });

    it("keeps a draft off the marketplace until an admin approves it", () => {
      const draft = mintForCreator();
      expect(isEditionPublished(draft)).toBe(false);
      expect(getPublishedEditions().some((e) => e.id === draft.id)).toBe(false);

      expect(submitEditionForReview(draft.id).success).toBe(true);
      const approved = approveEdition(draft.id, "Review Admin");
      expect(approved.success).toBe(true);
      expect(approved.edition?.reviewStatus).toBe("published");
      expect(getPublishedEditions().some((e) => e.id === draft.id)).toBe(true);
    });

    it("needs a note to request changes and lets the creator resubmit", () => {
      const pending = mintForCreator(true);
      expect(pending.reviewStatus).toBe("pending_review");
      expect(pending.submittedAt).toBeDefined();

      expect(rejectEdition(pending.id, "   ", "Review Admin").success).toBe(false);
      const rejected = rejectEdition(
        pending.id,
        "Please use the full-resolution master",
        "Review Admin",
      );
      expect(rejected.success).toBe(true);
      expect(rejected.edition?.reviewNote).toBe("Please use the full-resolution master");
      expect(submitEditionForReview(pending.id).success).toBe(true);
      expect(withdrawEditionFromReview(pending.id).success).toBe(true);
    });

    it("lists a creator's editions and only deletes ones that never went public", () => {
      const draft = mintForCreator();
      expect(getEditionsByCreator({ id: "user-anna" }).map((e) => e.id)).toContain(draft.id);
      expect(deleteEditionDraft("edn-genesis-01").success).toBe(false);
      expect(deleteEditionDraft(draft.id).success).toBe(true);
    });
  });

  describe("creator tools", () => {
    const creator = {
      id: "user-elena",
      slug: "elena-rossi",
      name: "Elena Rossi",
      avatar: "https://example.com/elena.jpg",
    };
    let sequence = 0;
    const uniqueName = (base: string) => `${base} ${Date.now()}-${(sequence += 1)}`;
    const collectionInput = (name: string) => ({
      name,
      description: "Atmospheric architectural studies after dark.",
      avatarImage: "https://example.com/logo.jpg",
      chain: "Ethereum",
      royaltyPercent: 10,
    });
    const mintFor = (overrides: Partial<Parameters<typeof mintDigitalEdition>[0]> = {}) =>
      mintDigitalEdition({
        photoId: "upload-01",
        title: "Night Market",
        description: "Uploaded character artwork.",
        photographerId: creator.slug,
        photographerName: creator.name,
        createdBy: creator.id,
        image: "https://example.com/night-market.png",
        tier: "limited_series",
        totalEditions: 10,
        ...pricesFromGbp(300),
        royaltyPercent: 10,
        hasPhysicalTwin: false,
        camera: "Digital artwork",
        lens: "Not applicable",
        iso: 0,
        yearCreated: 2026,
        artworkSource: "upload",
        ...overrides,
      });
    const publish = (editionId: string) => {
      submitEditionForReview(editionId);
      approveEdition(editionId, "Review Admin");
    };

    it("creates a collection with a unique name", () => {
      const name = uniqueName("Alpine Nocturnes");
      const created = createEditionCollection(collectionInput(name), creator);
      expect(created.success).toBe(true);
      expect(created.collection?.bannerImage).toBe("https://example.com/logo.jpg");
      expect(getCollectionsByCreator(creator).map((c) => c.id)).toContain(created.collection?.id);
      expect(createEditionCollection(collectionInput(name.toUpperCase()), creator).success).toBe(
        false,
      );
      expect(createEditionCollection(collectionInput("Kyoto Nocturnes"), creator).success).toBe(
        false,
      );
    });

    it("only holds editions added to it and stays private until one is published", () => {
      const { collection } = createEditionCollection(
        collectionInput(uniqueName("Harbour")),
        creator,
      );
      const inside = mintFor({ collectionId: collection!.id, collectionName: collection!.name });
      publish(mintFor().id); // listed on its own
      expect(getPublicEditionCollections().some((c) => c.id === collection!.id)).toBe(false);

      publish(inside.id);
      expect(getEditionsByCollection(collection!.id).map((e) => e.id)).toEqual([inside.id]);
      expect(getPublicEditionCollections().some((c) => c.id === collection!.id)).toBe(true);
    });

    it("lets the creator edit a draft but not a published edition", () => {
      const draft = mintFor();
      const changes = {
        title: "Night Market II",
        description: "Edited",
        tier: "genesis_1_of_1" as const,
        totalEditions: 10,
        priceGbp: 520,
        royaltyPercent: 12,
        hasPhysicalTwin: false,
        collectionId: null,
      };
      expect(updateEditionDetails(draft.id, changes, { id: "someone-else" }).success).toBe(false);

      const edited = updateEditionDetails(draft.id, changes, creator);
      expect(edited.success).toBe(true);
      expect(edited.edition?.totalEditions).toBe(1);
      expect(edited.edition?.tokenId).toMatch(/^NSC-GEN-/);
      expect(edited.edition?.priceEth).toBe(0.2);

      publish(draft.id);
      expect(updateEditionDetails(draft.id, changes, creator).success).toBe(false);
    });

    it("refuses sales of unpublished or paused editions", () => {
      const buyer = { id: "buyer-ada", name: "Ada" };
      const edition = mintFor();
      expect(purchaseEdition(edition.id, buyer).success).toBe(false);

      publish(edition.id);
      expect(setEditionSalesPaused(edition.id, true, creator).success).toBe(true);
      expect(purchaseEdition(edition.id, buyer).success).toBe(false);

      expect(setEditionSalesPaused(edition.id, false, creator).success).toBe(true);
      expect(purchaseEdition(edition.id, buyer).success).toBe(true);
      expect(getCreatorSalesSummary(creator).salesCount).toBeGreaterThanOrEqual(1);
    });

    it("saves a creator profile and shows it on their editions", () => {
      const edition = mintFor();
      expect(
        saveEditionCreatorProfile({ displayName: " ", bio: "", avatarSource: "account" }, creator)
          .success,
      ).toBe(false);
      expect(
        saveEditionCreatorProfile(
          { displayName: "Elena", bio: "", avatarSource: "upload" },
          creator,
        ).success,
      ).toBe(false);

      const saved = saveEditionCreatorProfile(
        {
          displayName: "Elena R.",
          bio: "Alpine morning scenes",
          avatarSource: "upload",
          avatarUrl: "https://example.com/character.png",
        },
        creator,
      );
      expect(saved.success).toBe(true);
      expect(resolveCreatorIdentity(creator)).toEqual({
        name: "Elena R.",
        avatar: "https://example.com/character.png",
      });
      expect(getStoredEditions().find((e) => e.id === edition.id)?.photographerAvatar).toBe(
        "https://example.com/character.png",
      );
    });

    it("only deletes a collection with nothing live or in review", () => {
      const { collection } = createEditionCollection(
        collectionInput(uniqueName("Archive")),
        creator,
      );
      const draft = mintFor({ collectionId: collection!.id, collectionName: collection!.name });
      submitEditionForReview(draft.id);
      expect(deleteEditionCollection(collection!.id, creator).success).toBe(false);

      withdrawEditionFromReview(draft.id);
      expect(deleteEditionCollection(collection!.id, creator).success).toBe(true);
      expect(getStoredEditions().find((e) => e.id === draft.id)?.collectionId).toBeUndefined();
    });
  });

  describe("web3 activation and public pages", () => {
    it("switches Web3 on once and only upgrades collectors to creators", () => {
      const userId = `user-web3-${Date.now()}`;
      expect(isWeb3Activated(userId)).toBe(false);

      const first = activateWeb3(userId, "collector");
      expect(isWeb3Activated(userId)).toBe(true);
      expect(isWeb3Activated(userId, "creator")).toBe(false);

      activateWeb3(userId, "creator");
      expect(isWeb3Activated(userId, "creator")).toBe(true);
      expect(activateWeb3(userId, "collector").role).toBe("creator");
      expect(getWeb3Activation(userId)?.activatedAt).toBe(first.activatedAt);
    });

    it("builds a public page from a creator's slug and hides drafts", () => {
      const stamp = Date.now();
      const creator = { id: `user-page-${stamp}`, slug: `page-creator-${stamp}`, name: "Tobi" };
      saveEditionCreatorProfile(
        {
          displayName: "Tobi P.",
          bio: "Rooftops",
          avatarSource: "upload",
          avatarUrl: "https://example.com/tobi.png",
        },
        creator,
      );
      const edition = mintDigitalEdition({
        photoId: "upload-page",
        title: "Rooftop",
        description: "Test",
        photographerId: creator.slug,
        photographerName: "Tobi P.",
        createdBy: creator.id,
        image: "https://example.com/rooftop.png",
        tier: "genesis_1_of_1",
        totalEditions: 1,
        ...pricesFromGbp(900),
        royaltyPercent: 10,
        hasPhysicalTwin: false,
        camera: "Digital artwork",
        lens: "Not applicable",
        iso: 0,
        yearCreated: 2026,
        artworkSource: "upload",
      });
      expect(getCreatorPageData(creator.slug)?.created).toHaveLength(0);

      submitEditionForReview(edition.id);
      approveEdition(edition.id, "Review Admin");
      const page = getCreatorPageData(creator.slug);
      expect(page?.name).toBe("Tobi P.");
      expect(page?.avatar).toBe("https://example.com/tobi.png");
      expect(page?.created.map((e) => e.id)).toEqual([edition.id]);
      expect(getCreatorPageData(creator.id)?.userId).toBe(creator.id);
      expect(getCreatorPageData("nobody-here")).toBeNull();
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

    it("includes platform photographer collections with published editions", () => {
      const platformCollectionIds = [
        "amsterdam-canals",
        "milano-form",
        "metropolitan-geometry",
        "namibian-horizons",
        "kyoto-nocturnes",
        "cornish-maritime",
        "monolithic-brutalism",
        "tokyo-monoliths",
        "seoul-mist",
      ];

      for (const id of platformCollectionIds) {
        const col = getEditionCollection(id);
        expect(col, `Collection ${id} should exist`).toBeDefined();
        const editions = getEditionsByCollection(id);
        expect(editions.length, `Collection ${id} should have editions`).toBeGreaterThan(0);
      }
    });

    it("verifies Junghoon Sung has zero pre-seeded editions or collections (registers and mints in studio)", () => {
      const allEditions = getStoredEditions();
      const allCollections = getEditionCollections();

      const sungEditions = allEditions.filter(
        (e) =>
          e.photographerId === "junghoon-sung-e85d599d" ||
          e.photographerName.toLowerCase().includes("junghoon") ||
          e.collectionId === "korean-peninsula-silences",
      );
      expect(sungEditions).toHaveLength(0);

      const sungCollections = allCollections.filter(
        (c) =>
          c.id === "korean-peninsula-silences" ||
          c.photographerId === "junghoon-sung-e85d599d" ||
          c.name.toLowerCase().includes("korean peninsula silences"),
      );
      expect(sungCollections).toHaveLength(0);
    });

    it("contains strictly non-Nigerian fine-art photography and collections", () => {
      const allEditions = getStoredEditions();
      const allCollections = getEditionCollections();

      for (const edition of allEditions) {
        expect(edition.location?.toLowerCase()).not.toContain("nigeria");
        expect(edition.location?.toLowerCase()).not.toContain("lagos");
        expect(edition.title.toLowerCase()).not.toContain("lagos");
        expect(edition.photographerName.toLowerCase()).not.toContain("james adebayo");
        expect(edition.photographerName.toLowerCase()).not.toContain("prince kalu");
      }

      for (const collection of allCollections) {
        expect(collection.name.toLowerCase()).not.toContain("lagos");
        expect(collection.name.toLowerCase()).not.toContain("nigeria");
        expect(collection.id.toLowerCase()).not.toContain("lagos");
        expect(collection.id).not.toBe("ceremony-and-ochre");
        expect(collection.id).not.toBe("accra-radiance");
      }
    });
  });

  describe("Platform Minting Fee & Treasury Routing", () => {
    it("provides valid official platform treasury addresses across networks", () => {
      expect(PLATFORM_TREASURY_WALLETS.evm).toBe("0xcD24721Afef7C969e0d8B8472e1e6c5292214fD8");
      expect(PLATFORM_TREASURY_WALLETS.usdtTrc20).toBe("TUMWvNB8sxztU3t3exumc2e3CkX2FkFsfm");
      expect(PLATFORM_TREASURY_WALLETS.btc).toBe("bc1qshkdt4xrmny58h67eka2qucqva7wznnq2pq86d");

      const usdt = getTreasuryWalletForCoin("USDT", "TRC20");
      expect(usdt.address).toBe(PLATFORM_TREASURY_WALLETS.usdtTrc20);

      const eth = getTreasuryWalletForCoin("ETH", "ERC20");
      expect(eth.address).toBe(PLATFORM_TREASURY_WALLETS.evm);

      const btc = getTreasuryWalletForCoin("BTC", "Native SegWit");
      expect(btc.address).toBe(PLATFORM_TREASURY_WALLETS.btc);
    });

    it("records mint_fee_paid activity when minting fee is provided", () => {
      const minted = mintDigitalEdition({
        photoId: "test-photo-fee-01",
        title: "Nocturne in Silver",
        description: "Test description",
        photographerId: "test-artist",
        photographerName: "Test Artist",
        image: "https://example.com/art.jpg",
        tier: "limited_series",
        totalEditions: 10,
        priceGbp: 300,
        priceUsd: 380,
        priceEth: 0.12,
        priceSol: 2.7,
        royaltyPercent: 10,
        hasPhysicalTwin: false,
        camera: "Leica SL2",
        lens: "50mm",
        iso: 100,
        yearCreated: 2026,
        submitForReview: true,
        mintFeePayment: {
          coin: "USDT",
          amount: 20,
          network: "TRC20",
          txHash: "0xfee1234567890abcdef",
          treasuryAddress: PLATFORM_TREASURY_WALLETS.usdtTrc20,
          paidBy: "Test Artist",
        },
      });

      expect(minted.id).toBeDefined();

      const collected = getCollectedMintingFees();
      expect(collected.totalCount).toBeGreaterThan(0);
      const feeActivity = collected.activities.find((a) => a.editionId === minted.id);
      expect(feeActivity).toBeDefined();
      expect(feeActivity?.type).toBe("mint_fee_paid");
      expect(feeActivity?.price).toBe(20);
      expect(feeActivity?.currency).toBe("USDT");
      expect(feeActivity?.toUser).toContain(PLATFORM_TREASURY_WALLETS.usdtTrc20);
    });

    it("allows admin to update deposit and minting fee thresholds", () => {
      const updated = saveDepositConfig({
        usdtThreshold: 25,
        ethThreshold: 0.008,
      });
      expect(updated.usdtThreshold).toBe(25);
      expect(updated.ethThreshold).toBe(0.008);

      const readBack = getDepositConfig();
      expect(readBack.usdtThreshold).toBe(25);
      expect(readBack.ethThreshold).toBe(0.008);

      // Restore defaults
      saveDepositConfig({ usdtThreshold: 20, ethThreshold: 0.006 });
    });
  });

  describe("NSC Token Presale & Treasury Engine", () => {
    beforeEach(() => {
      // Reset presale config and orders to clean slate
      updatePresaleConfig({
        priceUsd: 1.0,
        hardCapNsc: 1_000_000,
        status: "active",
        minPurchaseUsd: 1.0,
        maxPurchaseUsd: 50_000.0,
      });
      saveStoredPresaleOrders([]);
    });

    it("initializes with 1:1 pricing ($1.00 USD / 1 NSC) and 1M NSC hard cap", () => {
      const config = getPresaleConfig();
      expect(config.priceUsd).toBe(1.0);
      expect(config.hardCapNsc).toBe(1_000_000);
      expect(config.status).toBe("active");
      expect(config.symbol).toBe("NSC");
      expect(config.minPurchaseUsd).toBe(1.0);
    });

    it("allows admin to update presale settings and status", () => {
      const updated = updatePresaleConfig({
        priceUsd: 1.0,
        status: "paused",
        minPurchaseUsd: 10.0,
      });
      expect(updated.status).toBe("paused");
      expect(updated.minPurchaseUsd).toBe(10.0);

      const readBack = getPresaleConfig();
      expect(readBack.status).toBe("paused");
    });

    it("blocks purchases when presale is paused", async () => {
      updatePresaleConfig({ status: "paused" });
      const result = await executePresaleSwap({
        userId: "test-user-01",
        coinPaid: "USDT",
        amountPaid: 50,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("paused or ended");
    });

    it("enforces minimum purchase USD limit", async () => {
      const result = await executePresaleSwap({
        userId: "test-user-01",
        coinPaid: "USDT",
        amountPaid: 0.5, // Below $1 min
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Minimum presale purchase");
    });

    it("executes 1:1 swap for USDT and routes to platform treasury", async () => {
      const result = await executePresaleSwap({
        userId: "test-user-buyer",
        userName: "Elena Rostova",
        userEmail: "elena@example.com",
        coinPaid: "USDT",
        network: "TRC20",
        amountPaid: 100,
      });

      expect(result.success).toBe(true);
      expect(result.nscCredited).toBe(100);
      expect(result.order).toBeDefined();
      expect(result.order?.coinPaid).toBe("USDT");
      expect(result.order?.nscAmount).toBe(100);
      expect(result.order?.treasuryAddress).toBe(PLATFORM_TREASURY_WALLETS.usdtTrc20);
      expect(result.order?.txHash).toBeTruthy();

      // Check stored orders
      const orders = getStoredPresaleOrders();
      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe(result.order?.id);

      // Check metrics
      const metrics = getPresaleMetrics();
      expect(metrics.totalUsdRaised).toBe(100);
      expect(metrics.totalNscSold).toBe(100);
      expect(metrics.orderCount).toBe(1);
      expect(metrics.totalUsdtRaised).toBe(100);
    });

    it("executes crypto conversion swap (ETH) into NSC tokens at market valuation", async () => {
      // 0.1 ETH @ $3,450/ETH = $345 USD -> 345 NSC (1:1)
      const result = await executePresaleSwap({
        userId: "test-user-eth",
        userName: "Crypto Collector",
        coinPaid: "ETH",
        network: "ERC20",
        amountPaid: 0.1,
      });

      expect(result.success).toBe(true);
      expect(result.nscCredited).toBe(345);
      expect(result.order?.treasuryAddress).toBe(PLATFORM_TREASURY_WALLETS.evm);
      expect(result.order?.txHash?.startsWith("0x")).toBe(true);

      const metrics = getPresaleMetrics();
      expect(metrics.totalEthRaised).toBe(0.1);
      expect(metrics.totalUsdRaised).toBe(345);
      expect(metrics.totalNscSold).toBe(345);
    });

    it("enforces hard cap limit on presale allocation", async () => {
      // Set hard cap to 500 NSC for testing
      updatePresaleConfig({ hardCapNsc: 500 });

      // First buy 400 NSC
      const buy1 = await executePresaleSwap({
        userId: "test-user-cap-1",
        coinPaid: "USDT",
        amountPaid: 400,
      });
      expect(buy1.success).toBe(true);

      // Attempt to buy 200 NSC (400 + 200 = 600 > 500 hard cap)
      const buy2 = await executePresaleSwap({
        userId: "test-user-cap-2",
        coinPaid: "USDT",
        amountPaid: 200,
      });
      expect(buy2.success).toBe(false);
      expect(buy2.error).toContain("Purchase exceeds remaining presale allocation");
      expect(buy2.error).toContain("100 NSC remaining");
    });

    it("records direct treasury transfer from Binance/external wallet without requiring vault balance", async () => {
      const txHash = "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef";
      const result = await executePresaleDirectPayment({
        userId: "test-direct-buyer",
        userName: "Marcus Aurelius",
        userEmail: "marcus@rome.art",
        coinPaid: "USDT",
        network: "TRC20",
        amountPaid: 250,
        txHash,
      });

      expect(result.success).toBe(true);
      expect(result.nscCredited).toBe(250);
      expect(result.order?.paymentMethod).toBe("direct_treasury");
      expect(result.order?.txHash).toBe(txHash);
      expect(result.order?.treasuryAddress).toBe(PLATFORM_TREASURY_WALLETS.usdtTrc20);

      // Verify stored order and metrics
      const orders = getStoredPresaleOrders();
      expect(orders.length).toBe(1);
      expect(orders[0].paymentMethod).toBe("direct_treasury");

      const metrics = getPresaleMetrics();
      expect(metrics.totalUsdRaised).toBe(250);
      expect(metrics.totalNscSold).toBe(250);
    });

    it("prevents double-claiming the same transaction hash", async () => {
      const duplicateTx = "0xduplicatehash1234567890abcdef1234567890abcdef1234567890abcdef";

      // First claim succeeds
      const res1 = await executePresaleDirectPayment({
        userId: "buyer-one",
        coinPaid: "USDT",
        amountPaid: 100,
        txHash: duplicateTx,
      });
      expect(res1.success).toBe(true);

      // Second claim with same TxHash fails
      const res2 = await executePresaleDirectPayment({
        userId: "buyer-two",
        coinPaid: "USDT",
        amountPaid: 100,
        txHash: duplicateTx,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain("already been claimed");
    });

    it("rejects USDT vault swap when self-custody Tron address has insufficient TRX for gas (Option B)", async () => {
      // Abraham has 10 USDT in vault, but 0 TRX on-chain for gas
      const result = await executePresaleSwap({
        userId: "abraham-user-id",
        coinPaid: "USDT",
        network: "TRC20",
        amountPaid: 10,
        trxBalance: 0, // 0 TRX detected on-chain
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tron self-custody address requires ~15 TRX");
      expect(result.error).toContain("Direct to Treasury");
    });

    it("routes TRX payments to platform Tron treasury and credits NSC based on assigned rate", async () => {
      // 1. Verify treasury route for TRX is TRC20 treasury
      const treasury = getTreasuryWalletForCoin("TRX");
      expect(treasury.address).toBe(PLATFORM_TREASURY_WALLETS.usdtTrc20);
      expect(treasury.network).toBe("TRC20");

      // 2. Direct payment in TRX (100 TRX @ $0.25 = $25 USD = 25 NSC)
      const txHash = "0xtrxhash1234567890abcdef1234567890abcdef1234567890abcdef12345678";
      const result = await executePresaleDirectPayment({
        userId: "abraham-trx-buyer",
        coinPaid: "TRX",
        network: "TRC20",
        amountPaid: 100,
        txHash,
      });

      expect(result.success).toBe(true);
      expect(result.nscCredited).toBe(25);
      expect(result.order?.fiatValueUsd).toBe(25);
      expect(result.order?.treasuryAddress).toBe(PLATFORM_TREASURY_WALLETS.usdtTrc20);
    });

    it("updates and persists admin toggles for NSC vault card and admin gifting", () => {
      const initial = getPresaleConfig();
      expect(initial.showNscTokenCardInVault).toBe(true);
      expect(initial.enableAdminNscGifting).toBe(true);

      // Toggle off
      updatePresaleConfig({
        showNscTokenCardInVault: false,
        enableAdminNscGifting: false,
      });

      const updated = getPresaleConfig();
      expect(updated.showNscTokenCardInVault).toBe(false);
      expect(updated.enableAdminNscGifting).toBe(false);

      // Toggle back on
      updatePresaleConfig({
        showNscTokenCardInVault: true,
        enableAdminNscGifting: true,
      });

      const restored = getPresaleConfig();
      expect(restored.showNscTokenCardInVault).toBe(true);
      expect(restored.enableAdminNscGifting).toBe(true);
    });
  });
});

describe("NSC pricing", () => {
  it("values 1 NSC at £1, so an edition's NSC price matches its list price", () => {
    expect(NSC_PER_GBP).toBe(1);
    const { priceGbp } = pricesFromGbp(250);
    expect(gbpToNsc(priceGbp)).toBe(250);
  });

  it("rounds NSC amounts to two decimal places", () => {
    expect(gbpToNsc(0.5)).toBe(0.5);
    expect(gbpToNsc(19.999)).toBe(20);
    expect(gbpToNsc(1850)).toBe(1850);
  });

  it("prices every seed edition in NSC at its £ list price", () => {
    for (const edition of INITIAL_EDITIONS) {
      expect(gbpToNsc(edition.priceGbp)).toBe(edition.priceGbp);
    }
  });
});
