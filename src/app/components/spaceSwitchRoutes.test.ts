import { beforeEach, describe, expect, it } from "vitest";
import {
  INITIAL_EDITIONS,
  activateWeb3,
  approveEdition,
  mintDigitalEdition,
  pricesFromGbp,
  saveStoredEditions,
  submitEditionForReview,
} from "../data/editions";
import { rememberSpacePath, spaceForPath, spaceSwitchTarget } from "./spaceSwitchRoutes";

describe("Photography | Editions switch", () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveStoredEditions(JSON.parse(JSON.stringify(INITIAL_EDITIONS)));
  });

  it("knows which side a page belongs to", () => {
    expect(spaceForPath("/editions")).toBe("editions");
    expect(spaceForPath("/editions/studio")).toBe("editions");
    expect(spaceForPath("/editionsfoo")).toBe("photography");
    expect(spaceForPath("/account")).toBe("photography");
  });

  it("goes to each side's home until a page there has been visited", () => {
    expect(spaceSwitchTarget("editions", "/search")).toBe("/editions");
    expect(spaceSwitchTarget("photography", "/editions")).toBe("/");
  });

  it("returns to the last page visited on the other side", () => {
    rememberSpacePath("/editions/collection", "?chain=Ethereum");
    rememberSpacePath("/collections");
    expect(spaceSwitchTarget("editions", "/collections")).toBe(
      "/editions/collection?chain=Ethereum",
    );
    expect(spaceSwitchTarget("photography", "/editions/collection")).toBe("/collections");
  });

  it("doesn't remember sign-in pages", () => {
    rememberSpacePath("/search");
    rememberSpacePath("/signin");
    expect(spaceSwitchTarget("photography", "/editions")).toBe("/search");
  });

  it("links the account and the studio once Web3 is on", () => {
    const userId = `user-switch-${Date.now()}`;
    expect(spaceSwitchTarget("editions", "/account", userId)).toBe("/editions");
    activateWeb3(userId, "collector");
    expect(spaceSwitchTarget("editions", "/account", userId)).toBe("/editions/studio");
    expect(spaceSwitchTarget("photography", "/editions/studio")).toBe("/account");
  });

  it("goes from a platform photo edition back to its photo page", () => {
    const edition = mintDigitalEdition({
      photoId: "photo-switch-01",
      title: "Harbour at dawn",
      description: "Test",
      photographerId: "switch-photographer",
      photographerName: "Test Photographer",
      createdBy: "user-switch-creator",
      image: "https://example.com/harbour.jpg",
      tier: "limited_series",
      totalEditions: 5,
      ...pricesFromGbp(200),
      royaltyPercent: 10,
      hasPhysicalTwin: false,
      camera: "Not recorded",
      lens: "Not recorded",
      iso: 0,
      yearCreated: 2026,
      artworkSource: "portfolio",
    });
    // Drafts aren't public, so there's nothing to map to yet
    expect(spaceSwitchTarget("photography", `/editions/${edition.id}`)).toBe("/");

    submitEditionForReview(edition.id);
    approveEdition(edition.id, "Review Admin");
    expect(spaceSwitchTarget("photography", `/editions/${edition.id}`)).toBe(
      "/photo/photo-switch-01",
    );
    // Curated seed editions have no platform photo page
    expect(spaceSwitchTarget("photography", `/editions/${INITIAL_EDITIONS[0].id}`)).toBe("/");
  });
});
