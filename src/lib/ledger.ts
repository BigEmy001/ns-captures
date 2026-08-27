/**
 * What a ledger line should say to the person whose money it is.
 *
 * Some descriptions are written for us, not for them. The Hype Engine records
 * itself by name and cites the photo by its internal upload id:
 *
 *   "Hype Engine: +24 custom downloads on photo upload-1784616302951"
 *
 * That is an internal tool and an internal identifier, and it was appearing in
 * contributors' own earnings and balance tables — 79 lines of it, most of them
 * to one person.
 *
 * The stored text stays exactly as it is: fetchPhotographerMonthlyRevenue
 * matches on "Hype Engine%" to attribute that revenue, so rewriting it would
 * quietly drop those months from the chart. Only the reading changes.
 */

const HYPE_DOWNLOADS = /^\s*Hype\s+Engine[\s:-]*\+?([\d,]+)\s+(?:custom\s+)?downloads?\b.*$/i;
const HYPE_GENERIC = /^\s*Hype\s+Engine[\s:-]*(.*)$/i;

/**
 * Rewrites an internal ledger description into something the earner can read.
 * Anything without a known internal shape is returned as written.
 */
export function ledgerLabel(text?: string | null): string {
  const raw = (text || "").trim();
  if (!raw) return "";

  const hype = HYPE_DOWNLOADS.exec(raw);
  if (hype) {
    const n = Number(hype[1].replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return `${n.toLocaleString("en-GB")} download${n === 1 ? "" : "s"}`;
    }
  }

  const generic = HYPE_GENERIC.exec(raw);
  if (generic) {
    const rest = generic[1].trim();
    if (!rest) {
      return "Custom downloads";
    }
    const restMatch = /^\+?([\d,]+)\s*(.*)$/.exec(rest);
    if (restMatch) {
      const n = Number(restMatch[1].replace(/,/g, ""));
      if (Number.isFinite(n)) {
        return `${n.toLocaleString("en-GB")} download${n === 1 ? "" : "s"}`;
      }
    }
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }

  return raw;
}
