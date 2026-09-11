/**
 * Universal clipboard utility with graceful fallback for all browser environments,
 * mobile views, and restricted iframe permissions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern async Clipboard API
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to legacy fallback
  }

  // 2. Legacy execCommand('copy') fallback
  try {
    if (typeof document !== "undefined") {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.contain = "strict";
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.fontSize = "12pt";

      const selection = document.getSelection();
      const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      document.body.appendChild(el);
      el.select();
      el.selectionStart = 0;
      el.selectionEnd = text.length;

      const success = document.execCommand("copy");
      document.body.removeChild(el);

      if (originalRange && selection) {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      }
      return success;
    }
  } catch {
    return false;
  }

  return false;
}
