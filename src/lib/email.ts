import { supabase } from "./supabase";
import { escapeHtml } from "./validation";

const SENDER = "NS CAPTURES";

async function send(to: string, subject: string, body: string) {
  const fullHtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background-color:#242424;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#242424;">
<tr><td align="center" style="padding:45px 0 60px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#F8F8F8;">
<tr><td style="padding:0 50px 40px 50px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:60px 0 40px 0;">
<svg width="700" height="700" viewBox="0 0 700 700" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:80px;height:80px;">
<rect width="700" height="700" fill="white"/>
<path d="M408.602 226.458C416.585 225.749 432.633 226.199 441.109 226.203L502.536 226.264L511.721 270.435C489.584 270.727 467.246 270.05 445.222 270.43C423.021 270.812 397.602 266.65 380.618 284.038C367.723 297.071 368.086 316.828 380.126 330.203C396.255 348.115 416.803 345.815 438.706 345.628C449.198 345.538 459.617 345.597 470.044 347.47C509.261 354.515 542.696 387.258 542.955 428.725C543.269 449.967 534.874 470.402 519.721 485.289C496.189 508.636 471.278 510.902 440.311 510.845C390.118 511.257 366.933 508.853 334.869 466.507C375.449 466.088 415.932 466.927 456.665 466.298C490.568 465.773 513.019 427.5 485.842 402.315C464.568 382.593 430.456 392.903 404.094 389.041C365.61 383.412 330.24 353.352 326.393 313.257C324.466 292.947 330.828 272.721 344.046 257.175C360.747 237.129 383.328 228.872 408.602 226.458Z" fill="black"/>
<path d="M138.549 203.895C143.958 207.542 157.137 220.77 162.5 225.923L208.173 269.811L399.595 455.635C377.87 456.2 354.693 455.805 332.862 455.789L267.833 392.346C239.7 364.608 211.37 337.065 182.846 309.724C181.664 373.474 182.894 439.015 182.499 503.03C168.095 503.457 152.733 503.28 138.325 503.062L138.311 309.433C138.303 275.469 137.478 237.609 138.549 203.895Z" fill="black"/>
<path d="M534.4 190.718C546.609 187.6 559.052 194.927 562.246 207.12C565.439 219.314 558.189 231.8 546.012 235.07C533.738 238.369 521.117 231.042 517.892 218.74C514.666 206.438 522.077 193.864 534.4 190.718Z" fill="#0B3D2F"/>
</svg>
</td></tr>
<!-- Start dynamic email body content -->
<tr><td>
${body}
</td></tr>
<!-- End dynamic email body content -->
</table>
</td></tr>
<!-- Signature -->
<tr><td style="padding:0 50px 40px 50px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="border-top:1px solid #e0e0e0;padding:30px 0 0 0;">
<p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1e4a3f;font-family:inherit;">NS CAPTURES</p>
<p style="margin:0 0 2px 0;font-size:12px;color:#555555;font-family:inherit;">Global Photography Acquisition &amp; Licensing</p>
<p style="margin:0 0 12px 0;font-size:12px;color:#888888;font-family:inherit;">📍 London, United Kingdom</p>
<p style="margin:0 0 10px 0;font-size:11px;line-height:16px;color:#999999;font-family:inherit;">
<strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are intended only for the use of the individual or entity to whom they are addressed. They may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately, delete this message, and do not disclose, copy, or distribute its contents.
</p>
<p style="margin:0;font-size:11px;color:#999999;font-family:inherit;">&copy; NS CAPTURES. All Rights Reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const { error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, body: fullHtml },
  });
  if (error) console.error("Email send failed:", error);
}

async function sendEmail(to: string, subject: string, html: string) {
  return await send(to, subject, html);
}

export async function sendCreatorSaleNotification(creatorEmail: string, creatorName: string, photoTitle: string, price: number) {
  const subject = "Great news! Someone just bought your photo 🎉";
  const html = `
    <div style="text-align:center; padding:20px;">
      <h1 style="color:#1e4a3f;">You made a sale!</h1>
      <p style="font-size:16px; color:#6b716d;">Hi ${escapeHtml(creatorName)},</p>
      <p style="font-size:16px; color:#6b716d;">We're excited to let you know that a buyer just placed an order for your photo: <strong>${escapeHtml(photoTitle)}</strong>.</p>
      <div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
        <p style="margin:0; font-size:14px; color:#1e4a3f; font-weight:bold;">Gross Revenue</p>
        <p style="margin:5px 0 0 0; font-size:24px; color:#18211f;">$${price.toFixed(2)}</p>
      </div>
      <p style="font-size:14px; color:#6b716d;">The funds are currently pending admin verification. Once verified, they will be added to your available payout balance.</p>
    </div>
  `;
  return sendEmail(creatorEmail, subject, html);
}

export async function sendPurchaseApprovedNotification(buyerEmail: string, buyerName: string, photoTitle: string) {
  const subject = "Your purchase is approved! 📷";
  const html = `
    <div style="text-align:center; padding:20px;">
      <h1 style="color:#1e4a3f;">Payment Confirmed</h1>
      <p style="font-size:16px; color:#6b716d;">Hi ${escapeHtml(buyerName)},</p>
      <p style="font-size:16px; color:#6b716d;">Great news! We've successfully verified your payment for <strong>${escapeHtml(photoTitle)}</strong>.</p>
      <p style="font-size:16px; color:#6b716d;">Your high-resolution license is now active and the photo is ready to download.</p>
      <a href="https://www.nscaptures.com/account" style="display:inline-block; padding:12px 24px; background-color:#1e4a3f; color:white; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:20px;">View My Collection</a>
    </div>
  `;
  return sendEmail(buyerEmail, subject, html);
}

export async function sendPurchaseRejectedNotification(buyerEmail: string, buyerName: string, photoTitle: string) {
  const subject = "Purchase Update: Payment Not Received";
  const html = `
    <div style="text-align:center; padding:20px;">
      <h1 style="color:#d4183d;">Payment Verification Failed</h1>
      <p style="font-size:16px; color:#6b716d;">Hi ${escapeHtml(buyerName)},</p>
      <p style="font-size:16px; color:#6b716d;">We were unable to verify the payment for your purchase of <strong>${escapeHtml(photoTitle)}</strong>.</p>
      <p style="font-size:16px; color:#6b716d;">As a result, the transaction has been rejected and the license has not been activated.</p>
      <p style="font-size:16px; color:#6b716d;">If you believe this is an error, please reply to this email to contact support.</p>
    </div>
  `;
  return sendEmail(buyerEmail, subject, html);
}

function btn(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background-color:#1e4a3f;border-radius:44px;padding:12px 32px;">
<a href="${url}" style="display:block;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;font-family:inherit;">${label}</a>
</td></tr></table>`;
}

export async function sendPurchaseReceipt(
  to: string,
  userName: string,
  items: { title: string; license: string; price: number }[],
  total: number,
) {
  const safeUserName = escapeHtml(userName);
  const itemsHtml = items.map((i) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#333333;">${escapeHtml(i.title)}</td>
<td style="padding:6px 0;font-size:13px;color:#888888;">${escapeHtml(i.license)}</td>
<td style="padding:6px 0;font-size:14px;color:#333333;text-align:right;">$${i.price.toFixed(2)}</td></tr>`
  ).join("");

  await send(to, "Your Purchase Receipt — NS CAPTURES", `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Thank you, ${safeUserName}!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your purchase has been completed. Here's a summary of your order:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
<tr><th style="text-align:left;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">Photo</th>
<th style="text-align:left;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">License</th>
<th style="text-align:right;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">Price</th></tr>
${itemsHtml}
<tr><td colspan="2" style="padding:8px 0;font-size:14px;font-weight:700;color:#1e4a3f;border-top:2px solid #1e4a3f;">Total</td>
<td style="padding:8px 0;font-size:14px;font-weight:700;color:#1e4a3f;text-align:right;border-top:2px solid #1e4a3f;">$${total.toFixed(2)}</td></tr>
</table>
<p style="margin:20px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">View your downloads and licenses in your account dashboard at any time.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account", "My Account")}</p>`);
}

export async function sendLicenseConfirmation(
  to: string,
  userName: string,
  photoTitle: string,
  licenseType: string,
) {
  const safeUserName = escapeHtml(userName);
  const safePhotoTitle = escapeHtml(photoTitle);
  const safeLicenseType = escapeHtml(licenseType);
  await send(to, "License Confirmed — NS CAPTURES", `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">License Confirmed</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeUserName}, your <strong>${safeLicenseType}</strong> license for <strong>${safePhotoTitle}</strong> has been issued.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">You may now download and use the photo in accordance with the license terms. A full invoice is available in your account.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account", "View License")}</p>`);
}

export async function sendContributorAcknowledgment(email: string, name: string) {
  const safeName = escapeHtml(name);
  await send(email, "Application Received — NS CAPTURES", `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Welcome, ${safeName}!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We've received your contributor application. Our team will review your submission and get back to you within 3-5 business days.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">In the meantime, feel free to explore the platform and familiarize yourself with our licensing standards.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com", "Explore NS CAPTURES")}</p>`);
}

export async function sendContributorSubmissionStatus(
  to: string,
  name: string,
  status: "new" | "reviewing" | "approved" | "rejected" | "blocked",
  adminNote?: string,
) {
  const safeName = escapeHtml(name);
  const safeNote = adminNote ? escapeHtml(adminNote) : "";

  const titleByStatus: Record<typeof status, string> = {
    new: "Submission Received",
    reviewing: "Submission In Review",
    approved: "Submission Approved",
    rejected: "Submission Update",
    blocked: "Submission Closed",
  };

  const messageByStatus: Record<typeof status, string> = {
    new: "Your portfolio submission has been received and queued for review.",
    reviewing: "Your portfolio submission is currently under review by our curation team.",
    approved: "Your portfolio has been approved. Our acquisitions team will contact you with next steps.",
    rejected: "Your submission was not approved at this stage. You can refine and submit again.",
    blocked: "Your submission has been closed by our compliance team. Contact support for clarification.",
  };

  await send(to, `${titleByStatus[status]} — NS CAPTURES`, `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">${titleByStatus[status]}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">${messageByStatus[status]}</p>
${safeNote ? `<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#666666;font-family:inherit;"><strong>Admin note:</strong> ${safeNote}</p>` : ""}
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/contribute", "Contributor Portal")}</p>`);
}

export async function sendVerificationStatus(
  to: string,
  userName: string,
  status: "approved" | "rejected",
  reason?: string,
) {
  const isApproved = status === "approved";
  const safeUserName = escapeHtml(userName);
  const safeReason = reason ? escapeHtml(reason) : "";
  await send(to, `Verification ${isApproved ? "Approved" : "Status Update"} — NS CAPTURES`, `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Identity Verification ${isApproved ? "Approved" : "Update"}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeUserName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">
${isApproved
  ? "Your identity verification has been <strong style='color:#1e4a3f;'>approved</strong>. You now have full access to all platform features."
  : `Your identity verification was not approved. ${safeReason ? `<br><br><strong>Reason:</strong> ${safeReason}` : ""} Please review and resubmit.`
}
</p>
${!isApproved ? `<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=verification", "Resubmit")}</p>` : ""}`);
}

export async function sendAdminNotification(
  subject: string,
  message: string,
) {
  await send("support@nscaptures.com", `[Admin] ${escapeHtml(subject)}`, `
<h1 style="margin:0;font-size:20px;line-height:24px;font-weight:400;color:#333333;font-family:inherit;">Admin Notification</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">${message}</p>`);
}
