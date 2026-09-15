import { getStoredEditions, isEditionPublished, isWeb3Activated } from "../data/editions";

/** The two sides of NS CAPTURES: the photography site and the Editions (Web3) marketplace. */
export type Space = "photography" | "editions";

const LAST_PATH_KEY: Record<Space, string> = {
  photography: "ns_space_last_photography_path",
  editions: "ns_space_last_editions_path",
};

// Sign-in and one-off pages aren't somewhere to come back to
const NOT_RESTORABLE =
  /^\/(signin|signup|forgot-password|reset-password|admin\/login|proposal)(\/|$)/;

// /editions/<segment> routes that aren't edition pages
const EDITIONS_SECTIONS = new Set(["collection", "studio", "creator", "learn"]);

export function spaceForPath(pathname: string): Space {
  return pathname === "/editions" || pathname.startsWith("/editions/") ? "editions" : "photography";
}

/** Remembers the page someone is on, so switching back returns them there. */
export function rememberSpacePath(pathname: string, search = "") {
  if (NOT_RESTORABLE.test(pathname)) return;
  try {
    sessionStorage.setItem(LAST_PATH_KEY[spaceForPath(pathname)], `${pathname}${search}`);
  } catch {
    // Storage unavailable: switching falls back to each side's home
  }
}

function lastSpacePath(space: Space): string | null {
  try {
    return sessionStorage.getItem(LAST_PATH_KEY[space]);
  } catch {
    return null;
  }
}

/**
 * Where the Photography | Editions switch goes from the current page: the matching page on the
 * other side when there is one, otherwise the last page visited there, otherwise that side's home.
 */
export function spaceSwitchTarget(to: Space, pathname: string, userId?: string | null): string {
  if (to === "editions") {
    if (pathname.startsWith("/account") && userId && isWeb3Activated(userId)) {
      return "/editions/studio";
    }
    return lastSpacePath("editions") ?? "/editions";
  }

  if (pathname.startsWith("/editions/studio")) return "/account";
  const [, segment] = pathname.match(/^\/editions\/([^/]+)$/) ?? [];
  if (segment && !EDITIONS_SECTIONS.has(segment)) {
    const edition = getStoredEditions().find((e) => e.id === segment);
    // Editions made from a platform photo can go back to that photo's page
    if (
      edition &&
      isEditionPublished(edition) &&
      edition.createdBy &&
      (edition.artworkSource ?? "portfolio") === "portfolio"
    ) {
      return `/photo/${edition.photoId}`;
    }
  }
  return lastSpacePath("photography") ?? "/";
}
