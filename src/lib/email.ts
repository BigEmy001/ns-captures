import { supabase } from "./supabase";
import { escapeHtml } from "./validation";

const SENDER = "NS CAPTURES";

async function send(to: string, subject: string, body: string) {
  const { error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, body },
  });
  if (error) console.error("Email send failed:", error);
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
