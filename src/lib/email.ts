import { supabase } from "./supabase";
import { escapeHtml } from "./validation";

const SENDER = "NS CAPTURES";

async function send(to: string, subject: string, body: string) {
  const { error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, body },
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
