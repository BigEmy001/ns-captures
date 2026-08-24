/**
 * Where "Contact Admin" goes.
 *
 * One setting drives the button in every payment modal, and the admin should
 * not have to say what kind of thing they typed. An address becomes an email,
 * a number becomes WhatsApp, a URL is followed as written.
 *
 * There is always a destination. Before this, an empty setting meant the
 * button was not rendered at all, so the only people who could not reach
 * anyone were the ones who most needed to.
 */

export const DEFAULT_CONTACT = "support@ns-captures.com";

export type ContactKind = "email" | "whatsapp" | "link";

export interface ContactRoute {
  /** Ready for an href. */
  href: string;
  kind: ContactKind;
  /** What the admin actually typed, for showing beside the button. */
  display: string;
  /** Whether a mail subject can be attached. */
  supportsSubject: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s().-]{6,}$/;

function route(value: string): ContactRoute | null {
  const raw = value.trim();
  if (!raw) return null;

  if (/^mailto:/i.test(raw)) {
    const address = raw.slice(7).split("?")[0];
    return { href: raw, kind: "email", display: address, supportsSubject: !raw.includes("?") };
  }

  if (/^https?:\/\//i.test(raw)) {
    const isWhatsapp = /(^|\.)(wa\.me|whatsapp\.com)/i.test(raw.replace(/^https?:\/\//i, ""));
    return {
      href: raw,
      kind: isWhatsapp ? "whatsapp" : "link",
      display: raw,
      supportsSubject: false,
    };
  }

  if (EMAIL.test(raw)) {
    return { href: `mailto:${raw}`, kind: "email", display: raw, supportsSubject: true };
  }

  if (PHONE.test(raw)) {
    const digits = raw.replace(/[^0-9]/g, "");
    return {
      href: `https://wa.me/${digits}`,
      kind: "whatsapp",
      display: raw,
      supportsSubject: false,
    };
  }

  // Something that is neither an address, a number, nor a URL — most likely a
  // bare domain or a half-typed link. Treat it as a link rather than dropping
  // it, but do not guess at a scheme beyond https.
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(raw)) {
    return { href: `https://${raw}`, kind: "link", display: raw, supportsSubject: false };
  }

  return null;
}

/**
 * Resolves the admin's contact setting, falling back through any alternatives
 * and finally to the default address, so the result is always usable.
 */
export function resolveContact(...candidates: (string | null | undefined)[]): ContactRoute {
  for (const candidate of candidates) {
    const resolved = candidate ? route(candidate) : null;
    if (resolved) return resolved;
  }
  return route(DEFAULT_CONTACT)!;
}

/** Adds a subject to an email route; anything else is returned untouched. */
export function withSubject(contact: ContactRoute, subject: string): string {
  if (!contact.supportsSubject) return contact.href;
  return `${contact.href}?subject=${encodeURIComponent(subject)}`;
}

/** The word for the button, so the label matches where it actually goes. */
export function contactLabel(contact: ContactRoute): string {
  if (contact.kind === "whatsapp") return "WhatsApp Admin";
  if (contact.kind === "email") return "Email Admin";
  return "Contact Admin";
}
