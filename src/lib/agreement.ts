/**
 * Filling an agreement in for the person it is about.
 *
 * The supplied text carries bracketed placeholders — [FULL LEGAL NAME],
 * [CONTRIBUTOR ID], [DATE] and so on. Left alone they reach the contributor
 * exactly as written, so the thing they sign, the copy they are emailed and
 * the PDF they save all read "Name: [FULL LEGAL NAME]".
 *
 * These are filled once, at the moment of issue, and frozen into that
 * agreement's own copy of the body. Doing it at render time instead would mean
 * a signed contract that quietly rewrites itself whenever someone edits their
 * profile — the reference, the date and the name on a document must not be
 * able to change after it has been signed.
 */

export interface AgreementContext {
  reference?: string | null;
  version?: string | null;
  effectiveDate?: string | null;
  name?: string | null;
  contributorId?: string | null;
  email?: string | null;
  country?: string | null;
}

/** How a date reads in a contract, rather than as an ISO timestamp. */
function longDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The reference is written as NSC-CA-[YEAR]-[NUMBER], so a reference already
 * in that shape supplies both halves rather than being pasted in twice.
 */
function splitReference(reference?: string | null): { year?: string; number?: string } {
  const match = /^([A-Z]+(?:-[A-Z]+)*)-(\d{4})-(.+)$/.exec((reference || "").trim());
  if (!match) return {};
  return { year: match[2], number: match[3] };
}

export function fillAgreement(body: string, ctx: AgreementContext): string {
  if (!body) return "";

  const { year, number } = splitReference(ctx.reference);
  const effective = longDate(ctx.effectiveDate);

  const values: Record<string, string | undefined> = {
    YEAR: year ?? String(new Date().getUTCFullYear()),
    NUMBER: number ?? undefined,
    VERSION: ctx.version ?? undefined,
    DATE: effective,
    "FULL LEGAL NAME": ctx.name ?? undefined,
    "CONTRIBUTOR ID": ctx.contributorId ?? undefined,
    // The signature block abbreviates the same field.
    ID: ctx.contributorId ?? undefined,
    "EMAIL ADDRESS": ctx.email ?? undefined,
    COUNTRY: ctx.country ?? undefined,
  };

  // A placeholder with nothing to put in it is left visible rather than
  // replaced with a blank, so a missing detail is obvious before signing
  // instead of becoming an empty line nobody notices.
  return body.replace(/\[([A-Z][A-Z ]*)\]/g, (whole, key: string) => {
    const value = values[key.trim()];
    return value && value.trim() ? value.trim() : whole;
  });
}

/** Which placeholders would still be unfilled, so an admin can be warned. */
export function unfilledPlaceholders(body: string, ctx: AgreementContext): string[] {
  const filled = fillAgreement(body, ctx);
  const left = filled.match(/\[[A-Z][A-Z ]*\]/g) || [];
  return [...new Set(left)];
}

/**
 * The agreement is 51 numbered sections. Rendering it as one column means
 * scrolling past all of them to reach the signature, which on a phone is
 * punishing. Splitting on the headings lets it be read a section at a time.
 */
export interface AgreementSection {
  heading: string;
  content: string;
}

export function splitSections(body: string): AgreementSection[] {
  if (!body.trim()) return [];

  const lines = body.split("\n");
  const sections: AgreementSection[] = [];
  let heading = "";
  let buffer: string[] = [];

  const push = () => {
    const content = buffer.join("\n").trim();
    if (heading || content) sections.push({ heading, content });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    // "12. PAYMENT AND CONTRIBUTOR EARNINGS" — a numbered, capitalised heading.
    if (/^\d{1,2}\.\s+[A-Z][A-Z0-9 ,&/'()-]{3,}$/.test(trimmed)) {
      push();
      heading = trimmed;
      continue;
    }
    // The horizontal rules divide sections; they are not content.
    if (/^─+$/.test(trimmed)) continue;
    buffer.push(line);
  }
  push();

  return sections.filter((s) => s.heading || s.content);
}
