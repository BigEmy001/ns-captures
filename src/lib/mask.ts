/**
 * Shows only the last four characters of an account identifier.
 * The contributor programme brief is explicit that complete banking details
 * must never appear on the dashboard; the full value stays editable in the form.
 */
export function maskAccount(value: unknown): string {
  const raw = typeof value === "string" ? value.replace(/\s+/g, "") : "";
  if (!raw) return "Not set";
  if (raw.length <= 4) return `•••• ${raw}`;
  return `•••• ${raw.slice(-4)}`;
}
