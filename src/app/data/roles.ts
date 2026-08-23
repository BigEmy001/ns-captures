/**
 * Photographer and Contributor are different things on this platform.
 *
 *  - A **Photographer** sells work through the marketplace: they upload, get
 *    reviewed, are licensed by customers, and are paid out.
 *  - A **Contributor** is a member of the International Contributor &
 *    Photographic Acquisition Programme. They do everything a photographer
 *    does, and additionally have a contributor ID, a recognition level, direct
 *    acquisitions, agreements, bonuses and publication consideration.
 *
 * Contributors are admitted by NS CAPTURES rather than self-selected, which is
 * why the role is granted from the admin console rather than chosen at signup.
 */

export type PlatformRole = "Buyer" | "Photographer" | "Contributor" | "Enterprise" | "Admin";

/** Roles that upload work, hold a portfolio and earn from it. */
export function isCreatorRole(role: string | undefined): boolean {
  return role === "Photographer" || role === "Contributor" || role === "Admin";
}

/** Roles admitted to the contributor programme. */
export function isProgrammeRole(role: string | undefined): boolean {
  return role === "Contributor" || role === "Admin";
}

/**
 * Whether someone can reach their creator screens. Admins always can;
 * a photographer or contributor must be verified first.
 */
export function hasCreatorAccess(
  role: string | undefined,
  verificationStatus: string | undefined,
): boolean {
  if (role === "Admin") return true;
  return isCreatorRole(role) && verificationStatus === "verified";
}

/** Whether the programme screens — acquisitions, agreements, bonuses — apply. */
export function hasProgrammeAccess(
  role: string | undefined,
  verificationStatus: string | undefined,
): boolean {
  if (role === "Admin") return true;
  return isProgrammeRole(role) && verificationStatus === "verified";
}

export const ROLE_LABELS: Record<string, string> = {
  Buyer: "Buyer",
  Photographer: "Photographer",
  Contributor: "Contributor",
  Enterprise: "Enterprise",
  Admin: "Admin",
};

export const ASSIGNABLE_ROLES: PlatformRole[] = [
  "Buyer",
  "Photographer",
  "Contributor",
  "Enterprise",
  "Admin",
];
