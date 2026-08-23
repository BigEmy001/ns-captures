import type { Agreement } from "../../../data/db";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Opens a printable copy of a signed agreement, laid out for A4, and asks the
 * browser to print it — which is where "Save as PDF" lives on every platform.
 *
 * Deliberately not a generated PDF file: producing one properly means a server
 * that can sign and store it, which is a bigger piece of work than a print
 * view, and a half-done client-side PDF of a legal document would be worse
 * than none.
 */
export function printAgreement(
  agreement: Agreement,
  contributorId?: string,
  contributorName?: string,
): void {
  const win = window.open("", "_blank", "width=900,height=1000");

  if (!win) {
    // Pop-ups are blocked. Nothing has gone wrong with the agreement itself.
    window.alert("Allow pop-ups for this site to download your agreement.");
    return;
  }

  const signature = agreement.signedAt
    ? `<div class="sig">
         <p class="k">Signed by</p>
         <p class="v">${escapeHtml(agreement.signedName || contributorName || "")}</p>
         <p class="k">Date</p>
         <p class="v">${new Date(agreement.signedAt).toLocaleString("en-GB")}</p>
       </div>`
    : "";

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(agreement.reference)} — NS CAPTURES</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #18211f;
    line-height: 1.65;
    font-size: 11.5pt;
    margin: 0;
  }
  header { border-bottom: 2px solid #18211f; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { font-family: Arial, sans-serif; font-size: 9pt; letter-spacing: .22em; text-transform: uppercase; }
  h1 { font-size: 19pt; font-weight: 500; margin: 10px 0 14px; }
  .meta { font-family: "Courier New", monospace; font-size: 8.5pt; color: #59645f; }
  .meta span { display: inline-block; margin-right: 18px; }
  .body { white-space: pre-wrap; }
  .empty { color: #8a8f89; font-style: italic; }
  .sig { margin-top: 40px; border-top: 1px solid #cfcdc3; padding-top: 16px; }
  .k { font-family: Arial, sans-serif; font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #758078; margin: 10px 0 0; }
  .v { margin: 2px 0 0; }
  footer { margin-top: 34px; border-top: 1px solid #cfcdc3; padding-top: 10px; font-family: Arial, sans-serif; font-size: 8pt; color: #758078; }
</style>
</head>
<body>
  <header>
    <p class="brand">NS Captures</p>
    <h1>${escapeHtml(agreement.title)}</h1>
    <p class="meta">
      <span>Ref ${escapeHtml(agreement.reference)}</span>
      <span>Version ${escapeHtml(agreement.version)}</span>
      ${contributorId ? `<span>Contributor ${escapeHtml(contributorId)}</span>` : ""}
      ${
        agreement.effectiveDate
          ? `<span>Effective ${new Date(agreement.effectiveDate).toLocaleDateString("en-GB")}</span>`
          : ""
      }
    </p>
  </header>

  ${
    agreement.body
      ? `<div class="body">${escapeHtml(agreement.body)}</div>`
      : `<p class="empty">The text of this agreement has not been attached to the record.</p>`
  }

  ${signature}

  <footer>NS CAPTURES · Global Photography Acquisition &amp; Licensing · London, United Kingdom</footer>
</body>
</html>`);

  win.document.close();
  win.focus();
  // Let the document lay out before the print dialog measures it.
  win.setTimeout(() => win.print(), 250);
}
