const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(input));
}

export function isStrongPassword(input: string): boolean {
  if (input.length < 10) return false;
  const hasLetter = /[A-Za-z]/.test(input);
  const hasNumber = /\d/.test(input);
  return hasLetter && hasNumber;
}

export function isValidPhone(input: string): boolean {
  return PHONE_REGEX.test(input.trim());
}

export function isValidHttpsUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function escapeHtml(input: string): string {
  if (!input) return "";
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
