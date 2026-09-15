import type { AuthUser } from "../../context/AuthContext";
import type { MintArtwork } from "../../components/MintEditionModal";
import {
  getCollectionsByCreator,
  getCreatorSalesSummary,
  getEditionCreatorProfile,
  getEditionsByCreator,
  getOwnershipsByOwner,
  getWeb3Activation,
  type ArtworkSource,
  type DigitalEdition,
} from "../../data/editions";

export type StudioSection =
  "overview" | "create" | "editions" | "collections" | "collected" | "profile";

/** Opens the mint modal: a new edition from some artwork, or an existing draft to edit. */
export type MintRequest = { artwork: MintArtwork; source: ArtworkSource; edition?: DigitalEdition };

/** Everything the studio and the account summary show for one user. */
export function loadStudioData(user: AuthUser | null) {
  return {
    userId: user?.id ?? null,
    activation: user ? getWeb3Activation(user.id) : null,
    editions: user ? getEditionsByCreator(user) : [],
    collections: user ? getCollectionsByCreator(user) : [],
    owned: user ? getOwnershipsByOwner(user.id) : [],
    profile: user ? getEditionCreatorProfile(user.id) : null,
    sales: user
      ? getCreatorSalesSummary(user)
      : { salesCount: 0, grossGbp: 0, royaltiesGbp: 0, collectors: 0 },
  };
}

export type StudioData = ReturnType<typeof loadStudioData>;

/** "night-market_final.png" → "Night market final" */
export function titleFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Untitled artwork";
}

/** The mint modal's artwork for an edition that already exists. */
export function artworkForEdition(edition: DigitalEdition): MintRequest {
  return {
    artwork: {
      id: edition.photoId,
      image: edition.image,
      title: edition.title,
      description: edition.description,
      camera: edition.camera,
      lens: edition.lens,
      iso: edition.iso,
    },
    source: edition.artworkSource ?? "portfolio",
    edition,
  };
}
