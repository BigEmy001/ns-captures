import { supabase } from "./supabase";
import { escapeHtml } from "./validation";

async function send(to: string, subject: string, body: string) {
  const { error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, body },
  });
  if (error) console.error("Email send failed:", error);
}

export async function sendCreatorSaleNotification(
  creatorEmail: string,
  creatorName: string,
  photoTitle: string,
  price: number,
) {
  const subject = "Great news! Someone just bought your photo";
  const html = `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">You made a sale!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${escapeHtml(creatorName)},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We're excited to let you know that a buyer just placed an order for your photo: <strong>${escapeHtml(photoTitle)}</strong>.</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f; font-weight:bold;">Gross Revenue</p>
  <p style="margin:5px 0 0 0; font-size:24px; color:#18211f;">£${price.toFixed(2)}</p>
</div>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">The funds are currently pending admin verification. Once verified, they will be added to your available payout balance.</p>
${btn("https://www.nscaptures.com/account", "View My Account")}`;
  return send(creatorEmail, subject, html);
}

export async function sendPurchaseApprovedNotification(
  buyerEmail: string,
  buyerName: string,
  photoTitle: string,
) {
  const subject = "Your purchase is approved!";
  const html = `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Payment Confirmed</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${escapeHtml(buyerName)},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Great news! We've successfully verified your payment for <strong>${escapeHtml(photoTitle)}</strong>.</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your high-resolution license is now active and the photo is ready to download.</p>
${btn("https://www.nscaptures.com/account", "View My Collection")}`;
  return send(buyerEmail, subject, html);
}

export async function sendPurchaseRejectedNotification(
  buyerEmail: string,
  buyerName: string,
  photoTitle: string,
) {
  const subject = "Purchase Update: Payment Not Received";
  const html = `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Payment Verification Failed</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${escapeHtml(buyerName)},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We were unable to verify the payment for your purchase of <strong>${escapeHtml(photoTitle)}</strong>.</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">As a result, the transaction has been rejected and the license has not been activated.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">If you believe this is an error, please reply to this email to contact support.</p>`;
  return send(buyerEmail, subject, html);
}

function btn(url: string, label: string): string {
  return `
<p style="margin:0 0 40px 0;">
<table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background-color:#1e4a3f;border-radius:44px;padding:12px 32px;">
<a href="${url}" style="display:block;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;font-family:inherit;">${label}</a>
</td></tr></table>
</p>
<p style="margin:0 0 10px 0;font-size:13px;line-height:20px;color:#888888;font-family:inherit;">Or copy this link into your browser:</p>
<p style="margin:0;font-size:12px;line-height:18px;color:#1e4a3f;word-break:break-all;font-family:monospace;">${url}</p>`;
}

export async function sendPurchaseReceipt(
  to: string,
  userName: string,
  items: { title: string; license: string; price: number }[],
  total: number,
) {
  const safeUserName = escapeHtml(userName);
  const itemsHtml = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#333333;">${escapeHtml(i.title)}</td>
<td style="padding:6px 0;font-size:13px;color:#888888;">${escapeHtml(i.license)}</td>
<td style="padding:6px 0;font-size:14px;color:#333333;text-align:right;">£${i.price.toFixed(2)}</td></tr>`,
    )
    .join("");

  await send(
    to,
    "Your Purchase Receipt — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Thank you, ${safeUserName}!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your purchase has been completed. Here's a summary of your order:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
<tr><th style="text-align:left;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">Photo</th>
<th style="text-align:left;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">License</th>
<th style="text-align:right;font-size:12px;color:#888888;font-family:inherit;padding:8px 0;border-bottom:1px solid #e0e0e0;">Price</th></tr>
${itemsHtml}
<tr><td colspan="2" style="padding:8px 0;font-size:14px;font-weight:700;color:#1e4a3f;border-top:2px solid #1e4a3f;">Total</td>
<td style="padding:8px 0;font-size:14px;font-weight:700;color:#1e4a3f;text-align:right;border-top:2px solid #1e4a3f;">£${total.toFixed(2)}</td></tr>
</table>
<p style="margin:20px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">View your downloads and licenses in your account dashboard at any time.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account", "My Account")}</p>`,
  );
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
  await send(
    to,
    "License Confirmed — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">License Confirmed</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeUserName}, your <strong>${safeLicenseType}</strong> license for <strong>${safePhotoTitle}</strong> has been issued.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">You may now download and use the photo in accordance with the license terms. A full invoice is available in your account.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account", "View License")}</p>`,
  );
}

export async function sendContributorAcknowledgment(email: string, name: string) {
  const safeName = escapeHtml(name);
  await send(
    email,
    "Application Received — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Welcome, ${safeName}!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We've received your contributor application. Our team will review your submission and get back to you within 24 hours.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">In the meantime, feel free to explore the platform and familiarize yourself with our licensing standards.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com", "Explore NS CAPTURES")}</p>`,
  );
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
    approved:
      "Your portfolio has been approved. Our acquisitions team will contact you with next steps.",
    rejected: "Your submission was not approved at this stage. You can refine and submit again.",
    blocked:
      "Your submission has been closed by our compliance team. Contact support for clarification.",
  };

  await send(
    to,
    `${titleByStatus[status]} — NS CAPTURES`,
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">${titleByStatus[status]}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">${messageByStatus[status]}</p>
${safeNote ? `<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#666666;font-family:inherit;"><strong>Admin note:</strong> ${safeNote}</p>` : ""}
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/contribute", "Contributor Portal")}</p>`,
  );
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
  await send(
    to,
    `Verification ${isApproved ? "Approved" : "Status Update"} — NS CAPTURES`,
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Identity Verification ${isApproved ? "Approved" : "Update"}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeUserName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">
${
  isApproved
    ? "Your identity verification has been <strong style='color:#1e4a3f;'>approved</strong>. You now have full access to all platform features."
    : `Your identity verification was not approved. ${safeReason ? `<br><br><strong>Reason:</strong> ${safeReason}` : ""} Please review and resubmit.`
}
</p>
${!isApproved ? `<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=verification", "Resubmit")}</p>` : ""}`,
  );
}

export async function sendAdminNotification(subject: string, message: string) {
  await send(
    "support@nscaptures.com",
    `[Admin] ${escapeHtml(subject)}`,
    `
<h1 style="margin:0;font-size:20px;line-height:24px;font-weight:400;color:#333333;font-family:inherit;">Admin Notification</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">${message}</p>`,
  );
}

export async function sendPayoutRequestSubmitted(
  photographerEmail: string,
  photographerName: string,
  amount: number,
  method: "card" | "local_bank" | "crypto" | "paypal",
) {
  const safeName = escapeHtml(photographerName);
  const methodLabel =
    method === "card"
      ? "Bank Transfer"
      : method === "local_bank"
        ? "Local Bank"
        : method === "crypto"
          ? "Crypto Wallet"
          : "PayPal";

  await send(
    photographerEmail,
    "Payout Request Received — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Payout Request Received</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We've received your payout request. It's now in the admin queue and will be reviewed shortly.</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Amount:</strong> £${amount.toFixed(2)}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Method:</strong> ${methodLabel}</p>
</div>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">Payouts are typically processed within 3-5 business days. We'll notify you as soon as the status changes.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=payouts", "View Payout Status")}</p>`,
  );
}

export async function sendPayoutRequestApproved(
  photographerEmail: string,
  photographerName: string,
  amount: number,
  method: "card" | "local_bank" | "crypto" | "paypal",
) {
  const safeName = escapeHtml(photographerName);
  const methodLabel =
    method === "card"
      ? "Bank Transfer"
      : method === "local_bank"
        ? "Local Bank"
        : method === "crypto"
          ? "Crypto Wallet"
          : "PayPal";

  await send(
    photographerEmail,
    "Payout Approved — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Payout Approved ✅</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your payout request has been approved by our finance team. The funds will be dispatched to your ${methodLabel} shortly.</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Amount:</strong> £${amount.toFixed(2)}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Method:</strong> ${methodLabel}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Status:</strong> Approved</p>
</div>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">Funds typically arrive within 3-5 business days, depending on your payment provider.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=payouts", "View Payout History")}</p>`,
  );
}

export async function sendPayoutRequestRejected(
  photographerEmail: string,
  photographerName: string,
  amount: number,
  reason: string = "",
) {
  const safeName = escapeHtml(photographerName);
  const safeReason = reason ? escapeHtml(reason) : "";

  await send(
    photographerEmail,
    "Payout Request Update — NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Payout Request Update</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Unfortunately, your recent payout request for <strong>£${amount.toFixed(2)}</strong> was not approved at this time.</p>
${safeReason ? `<div style="background-color:#fdf5f5; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #f5d6d6;"><p style="margin:0; font-size:14px; color:#9c2b2b;"><strong>Reason:</strong> ${safeReason}</p></div>` : ""}
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">Your available balance has not been deducted. Feel free to update your details and submit a new request at any time.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=payouts", "Update Payout Method")}</p>`,
  );
}

export async function sendAutoGeneratedAccountEmail(
  email: string,
  name: string,
  tempPassword: string,
) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(tempPassword);

  await send(
    email,
    "Welcome to NS CAPTURES - Your Account Details",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Welcome to NS CAPTURES, ${safeName}!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We have received your portfolio submission. To help you manage your application and access the platform, we've automatically generated an account for you.</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Here are your temporary login details:</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Email:</strong> ${safeEmail}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Password:</strong> <span style="font-family:monospace; background:#fff; padding:2px 6px; border-radius:4px; border:1px solid #ececec;">${safePassword}</span></p>
</div>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#6b716d;font-family:inherit;">For your security, we strongly recommend changing your password immediately after logging in.</p>
<p style="margin:20px 0 0;">${btn("https://www.nscaptures.com/signin", "Log In to Your Account")}</p>`,
  );
}

export async function sendAdminDirectEmail(
  to: string,
  userName: string,
  subject: string,
  message: string,
) {
  const safeName = escapeHtml(userName);
  const safeSubject = escapeHtml(subject);
  const body = `
<h1 style="margin:0;font-size:22px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">${safeSubject}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#6b716d;font-family:inherit;">Hi ${safeName},</p>
<div style="margin:20px 0;padding:20px;background-color:#f8f9f7;border-radius:8px;border:1px solid #dce8df;">
  <p style="margin:0;font-size:15px;line-height:22px;color:#333333;font-family:inherit;white-space:pre-wrap;">${escapeHtml(message)}</p>
</div>
<p style="margin:20px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">If you have any questions, simply reply to this email.</p>
<p style="margin:20px 0 0;">${btn("https://www.nscaptures.com/account", "Go to Your Account")}</p>`;
  await send(to, `NS CAPTURES - ${subject}`, body);
}

/**
 * Progress on a payout. Only the stages a contributor would actually want to
 * hear about are sent by default — the intermediate banking steps show on the
 * timeline instead, so a single payout doesn't generate ten emails.
 */
export async function sendPayoutStageUpdate(
  photographerEmail: string,
  photographerName: string,
  amount: number,
  stageLabel: string,
  stageBody: string,
  note?: string,
) {
  const safeName = escapeHtml(photographerName);
  const safeLabel = escapeHtml(stageLabel);
  const safeBody = escapeHtml(stageBody);
  const safeNote = note ? escapeHtml(note) : "";

  await send(
    photographerEmail,
    `${stageLabel} — NS CAPTURES Payout`,
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">${safeLabel}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">${safeBody}</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Amount:</strong> £${amount.toFixed(2)}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Status:</strong> ${safeLabel}</p>
</div>
${
  safeNote
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#555555;font-family:inherit;"><strong>Note from NS CAPTURES:</strong> ${safeNote}</p>`
    : ""
}
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">You can follow every step of this payout on your payouts page.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=payouts", "View payout timeline")}</p>`,
  );
}

/**
 * Official Payout Settlement Notification with itemized breakdown and delivery schedule.
 */
export async function sendPayoutSettlementNotificationEmail({
  to,
  recipientName,
  approvedPayout,
  conversionCostPercent,
  conversionCostAmount,
  networkTransferPercent,
  networkTransferAmount,
  totalSettlementCosts,
  payoutAmountScheduled,
  scheduledDeliveryNotice,
  salutation,
  bodyText,
  departmentSignoff,
}: {
  to: string;
  recipientName: string;
  approvedPayout: number;
  conversionCostPercent: number;
  conversionCostAmount: number;
  networkTransferPercent: number;
  networkTransferAmount: number;
  totalSettlementCosts: number;
  payoutAmountScheduled: number;
  scheduledDeliveryNotice?: string;
  salutation?: string;
  bodyText?: string;
  departmentSignoff?: string;
}) {
  const safeName = escapeHtml(recipientName);
  const safeSchedule = escapeHtml(
    scheduledDeliveryNotice ||
      "This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience.",
  );
  const safeSalutation = escapeHtml(salutation || `Dear ${safeName},`);
  const safeSignoff = escapeHtml(
    departmentSignoff || "Kind regards,\nFinance & Settlement Department\nNS CAPTURES",
  ).replace(/\n/g, "<br/>");

  const defaultParagraphs = [
    `We are pleased to confirm that your payout of <strong style="color:#ffffff;">&pound;${approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> has been approved for digital-asset settlement.`,
    `Following a final regional routing review, it was determined that your region is currently awaiting access to the company's upcoming Web3 settlement platform. The payout will therefore proceed through the alternative digital-asset conversion and withdrawal route.`,
    `Under the stated payout policy, the approved payout amount must be delivered in full. Settlement-related costs are therefore recorded separately and are not deducted from the approved payout amount.`,
    `The applicable settlement costs are shown above. The regional review is also the reason this additional settlement requirement has appeared at this stage of processing.`,
    `Once the settlement process has been completed, the approved &pound;${approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} payout will proceed through the applicable GBP-to-USDT conversion and digital-asset withdrawal route.`,
  ];

  const paragraphsHtml = (
    bodyText ? bodyText.split("\n\n").map((p) => escapeHtml(p.trim())) : defaultParagraphs
  )
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:13.5px;line-height:21px;color:#cbd5e1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${p}</p>`,
    )
    .join("");

  const body = `
<!-- MAD FINTECH OBSIDIAN CARD -->
<div style="max-width:540px;margin:0 auto;background-color:#090f0c;border:1px solid #1a382b;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
  
  <!-- Top Protocol Clearance Ribbon -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#064e3b;border-bottom:2px solid #00e599;">
    <tr>
      <td style="padding:14px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left">
              <span style="display:inline-block;color:#00e599;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">
                &#9679; CLEARANCE PROTOCOL // LEVEL-4 DISPATCH
              </span>
            </td>
            <td align="right">
              <span style="display:inline-block;background-color:rgba(0,229,153,0.15);border:1px solid #00e599;border-radius:4px;padding:3px 8px;color:#a7f3d0;font-family:ui-monospace,monospace;font-size:10px;font-weight:600;letter-spacing:0.8px;">
                REF: #NSC-8842-SETTLE
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Automated Dispatch Callout -->
  <div style="margin:20px 20px 0;background-color:#0b1812;border:1px solid #163626;border-radius:8px;padding:12px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="22" valign="top" style="font-size:14px;line-height:18px;color:#00e599;">&#9889;</td>
        <td style="padding-left:8px;">
          <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:700;color:#00e599;letter-spacing:1px;text-transform:uppercase;">
            AUTOMATED SYSTEM NOTIFICATION
          </div>
          <div style="font-size:12px;line-height:18px;color:#94a3b8;font-style:italic;margin-top:2px;">
            &ldquo;${safeSchedule}&rdquo;
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Hero Amount Section -->
  <div style="text-align:center;padding:26px 20px 22px;border-bottom:1px solid #142a20;">
    <div style="display:inline-block;background-color:rgba(0,229,153,0.1);border:1px solid #00e599;border-radius:20px;padding:4px 14px;margin-bottom:12px;">
      <span style="color:#00e599;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:ui-monospace,monospace;">
        &#9679; APPROVED FOR DIGITAL-ASSET SETTLEMENT
      </span>
    </div>
    <div style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
      Approved Payout Capital
    </div>
    <div style="font-size:46px;font-weight:800;line-height:50px;color:#ffffff;letter-spacing:-1.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      &pound;${approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
    <div style="color:#64748b;font-size:11px;margin-top:8px;font-family:ui-monospace,monospace;letter-spacing:0.5px;">
      CURRENCY: GBP (STERLING) &bull; SETTLEMENT ROUTE: USDT (TRC-20 / ERC-20)
    </div>
  </div>

  <!-- Security Screening Row -->
  <div style="padding:16px 20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33.3%" style="padding:0 4px 0 0;">
          <div style="background-color:#0c1612;border:1px solid #153223;border-radius:6px;padding:8px;text-align:center;">
            <div style="color:#00e599;font-size:10px;font-weight:700;font-family:ui-monospace,monospace;">AML AUDIT</div>
            <div style="color:#f8fafc;font-size:11px;font-weight:700;margin-top:2px;">CLEARED &#10003;</div>
          </div>
        </td>
        <td width="33.3%" style="padding:0 2px;">
          <div style="background-color:#0c1612;border:1px solid #153223;border-radius:6px;padding:8px;text-align:center;">
            <div style="color:#00e599;font-size:10px;font-weight:700;font-family:ui-monospace,monospace;">PRINCIPAL</div>
            <div style="color:#f8fafc;font-size:11px;font-weight:700;margin-top:2px;">100% INTACT</div>
          </div>
        </td>
        <td width="33.3%" style="padding:0 0 0 4px;">
          <div style="background-color:#1c1304;border:1px solid #b45309;border-radius:6px;padding:8px;text-align:center;">
            <div style="color:#fbbf24;font-size:10px;font-weight:700;font-family:ui-monospace,monospace;">SETTLEMENT</div>
            <div style="color:#fbbf24;font-size:11px;font-weight:700;margin-top:2px;">PENDING CLEARANCE</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Itemized Settlement Breakdown Table -->
  <div style="margin:20px 20px;background-color:#070d0a;border:1px solid #173727;border-radius:8px;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="background-color:#0b1e16;border-bottom:1px solid #173727;">
        <td colspan="2" style="padding:10px 16px;">
          <span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:700;color:#00e599;letter-spacing:1px;text-transform:uppercase;">
            PAYOUT SETTLEMENT BREAKDOWN
          </span>
        </td>
      </tr>

      <!-- Approved Payout -->
      <tr style="border-bottom:1px solid #11251c;background-color:#08120d;">
        <td style="padding:12px 16px;">
          <div style="color:#f8fafc;font-size:13px;font-weight:600;">&bull; Approved Payout</div>
          <div style="color:#64748b;font-size:11px;">Full creator allocation · zero deductions from capital</div>
        </td>
        <td align="right" style="padding:12px 16px;white-space:nowrap;">
          <span style="color:#ffffff;font-size:14px;font-weight:700;font-family:ui-monospace,monospace;">&pound;${approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </td>
      </tr>

      <!-- Conversion Cost -->
      <tr style="border-bottom:1px solid #11251c;background-color:#060b08;">
        <td style="padding:12px 16px;">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;">&bull; Digital Asset Conversion &amp; Withdrawal Cost (${conversionCostPercent}%)</div>
          <div style="color:#64748b;font-size:11px;">GBP-to-USDT cross-border liquidity provisioning</div>
        </td>
        <td align="right" style="padding:12px 16px;white-space:nowrap;">
          <span style="color:#cbd5e1;font-size:14px;font-weight:600;font-family:ui-monospace,monospace;">&pound;${conversionCostAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </td>
      </tr>

      <!-- Transfer Cost -->
      <tr style="border-bottom:1px solid #11251c;background-color:#08120d;">
        <td style="padding:12px 16px;">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;">&bull; USDT Network/Transfer Cost (${networkTransferPercent}%)</div>
          <div style="color:#64748b;font-size:11px;">Validator clearance &amp; smart-contract gas execution</div>
        </td>
        <td align="right" style="padding:12px 16px;white-space:nowrap;">
          <span style="color:#cbd5e1;font-size:14px;font-weight:600;font-family:ui-monospace,monospace;">&pound;${networkTransferAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </td>
      </tr>

      <!-- Settlement Obligation (Gold Glow) -->
      <tr style="background-color:#261704;border-top:1px solid #d97706;border-bottom:1px solid #d97706;">
        <td style="padding:14px 16px;">
          <div style="color:#fbbf24;font-size:13px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">
            &#9889; Total Settlement Costs
          </div>
          <div style="color:#f59e0b;font-size:11px;font-weight:600;margin-top:2px;">
            Recorded separately &bull; Not deducted from approved payout
          </div>
        </td>
        <td align="right" style="padding:14px 16px;white-space:nowrap;">
          <span style="display:inline-block;background-color:#d97706;color:#ffffff;font-weight:800;font-size:15px;padding:5px 12px;border-radius:5px;font-family:ui-monospace,monospace;box-shadow:0 2px 8px rgba(217,119,6,0.4);">
            &pound;${totalSettlementCosts.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </td>
      </tr>

      <!-- Guaranteed Payout Scheduled (Emerald Glow) -->
      <tr style="background-color:#062b1d;border-top:1px solid #00e599;">
        <td style="padding:14px 16px;">
          <div style="color:#00e599;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
            &#10003; Payout Amount Scheduled for Delivery
          </div>
          <div style="color:#6ee7b7;font-size:11px;margin-top:2px;">
            100% full approved payout delivered intact
          </div>
        </td>
        <td align="right" style="padding:14px 16px;white-space:nowrap;">
          <span style="color:#00e599;font-size:19px;font-weight:800;font-family:ui-monospace,monospace;letter-spacing:-0.5px;">
            &pound;${payoutAmountScheduled.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Official Letter Section -->
  <div style="margin:0 20px 20px;padding:22px;background-color:#08130f;border:1px solid #163627;border-left:4px solid #00e599;border-radius:8px;">
    <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${safeSalutation}
    </h3>
    
    ${paragraphsHtml}

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #142a1f;font-size:13px;line-height:20px;color:#94a3b8;">
      ${safeSignoff}
    </div>
  </div>

  <!-- Mad CTA Button -->
  <div style="text-align:center;padding:6px 20px 24px;">
    <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="background-color:#00e599;border-radius:8px;box-shadow:0 6px 24px rgba(0,229,153,0.45);padding:15px 36px;">
          <a href="https://www.nscaptures.com/account?tab=payouts" style="color:#021c12;font-size:14.5px;font-weight:800;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:0.8px;text-transform:uppercase;display:inline-block;">
            Settle Clearance &amp; Release Payout &rarr;
          </a>
        </td>
      </tr>
    </table>
    <div style="color:#64748b;font-size:10.5px;margin-top:12px;font-family:ui-monospace,monospace;letter-spacing:0.5px;">
      256-BIT ENCRYPTED AUDIT CHANNEL &bull; INSTANT CLEARANCE ROUTING
    </div>
  </div>

  <!-- Cryptographic Footer Seal -->
  <div style="background-color:#050907;border-top:1px solid #132b1f;padding:12px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#475569;font-family:ui-monospace,monospace;font-size:10px;">
            CRYPTOGRAPHIC HASH: <span style="color:#94a3b8;">SHA256:8842-SETTLE-OK</span>
          </span>
        </td>
        <td align="right">
          <span style="color:#00e599;font-family:ui-monospace,monospace;font-size:10px;font-weight:700;">
            &#9679; AUTHENTICATED DISPATCH
          </span>
        </td>
      </tr>
    </table>
  </div>

</div>
`;

  await send(
    to,
    `AUTOMATED NOTIFICATION: Payout Settlement Breakdown — £${approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    body,
  );
}

/**
 * The invitation itself. Deliberately short: the proposal is a document, and it
 * lives at the link rather than being pasted into an email body, where it could
 * be neither tracked nor answered.
 */
export async function sendContributorProposal(
  email: string,
  name: string,
  reference: string,
  link: string,
) {
  const safeName = escapeHtml(name);
  const safeRef = escapeHtml(reference);
  const safeLink = escapeHtml(link);

  await send(
    email,
    "An invitation from NS CAPTURES",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">You are invited to join the NS CAPTURES contributor programme</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Dear ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your photographic work has been identified as potentially suitable for the NS CAPTURES International Contributor &amp; Photographic Acquisition Programme.</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">The full invitation sets out how photographs may be acquired, the indicative acquisition categories, bonuses and publication opportunities, and how rights are handled. Accepting it creates your contributor account &mdash; it transfers no rights in your photographs.</p>
<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Invitation reference:</strong> ${safeRef}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;"><strong>Status:</strong> Awaiting your response</p>
</div>
<p style="margin:16px 0 0;">${btn(link, "Read your invitation")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">This link is personal to you. If the button does not work, copy this address into your browser:<br/><span style="word-break:break-all;color:#1e4a3f;">${safeLink}</span></p>
<p style="margin:16px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">The invitation expires in 30 days. If it lapses, reply to this email and we will reissue it.</p>`,
  );
}

/**
 * Sent when someone is admitted to the contributor programme. They may not be
 * logged in — and in the case of an admin changing their role, may not be
 * expecting it at all — so the email has to carry the whole message rather
 * than relying on them noticing a notification.
 */
export async function sendContributorWelcome(email: string, name: string, contributorId?: string) {
  const safeName = escapeHtml(name);
  const safeId = contributorId ? escapeHtml(contributorId) : "";

  await send(
    email,
    "You are now an NS CAPTURES contributor",
    `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Welcome to the contributor programme</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Hi ${safeName},</p>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">Your NS CAPTURES account is now part of the International Contributor &amp; Photographic Acquisition Programme. Alongside selling through the marketplace, your work can now be considered for direct acquisition, bonuses and publication.</p>
${
  safeId
    ? `<div style="background-color:#f8f9f7; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #dce8df;">
  <p style="margin:0; font-size:14px; color:#1e4a3f;"><strong>Your contributor ID:</strong> ${safeId}</p>
  <p style="margin:8px 0 0 0; font-size:14px; color:#1e4a3f;">Quote it on any correspondence about acquisitions or payments.</p>
</div>`
    : ""
}
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;"><strong>One thing to do:</strong> your International Contributor Agreement is waiting to be reviewed and signed. Nothing is transferred until you sign it.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=agreements", "Review your agreement")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">If you were not expecting this, reply to this email and we will put it right.</p>`,
  );
}

const P = `margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;`;
const H1 = `margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;`;
const CARD = `background-color:#f8f9f7;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #dce8df;`;

/**
 * Tells a contributor an agreement is waiting for them.
 *
 * Until now the only signal was an in-app notification, so the way to learn
 * that something needed signing was to log in and notice it.
 */
export async function sendAgreementIssued(
  email: string,
  name: string,
  agreement: { title: string; reference: string; version: string },
) {
  const safeName = escapeHtml(name);
  const title = escapeHtml(agreement.title);

  await send(
    email,
    `Action needed: ${agreement.title}`,
    `
<h1 style="${H1}">An agreement is waiting for you</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">Your <strong>${title}</strong> is ready to review and sign. Nothing is transferred, licensed or acquired under it until you have signed it.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:14px;color:#1e4a3f;"><strong>Agreement:</strong> ${title}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#1e4a3f;"><strong>Reference:</strong> ${escapeHtml(agreement.reference)}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#1e4a3f;"><strong>Version:</strong> ${escapeHtml(agreement.version)}</p>
</div>
<p style="${P}">You can read it in full, sign it, or decline it — declining is a normal answer and costs you nothing else on the platform.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=agreements", "Review the agreement")}</p>
<p style="${P}">If you were not expecting this, reply to this email and we will look into it.</p>`,
  );
}

/**
 * The contributor's own copy of what they just signed.
 *
 * send-email carries no attachments, so the agreement travels as the body of
 * the message — which is what makes it a record they hold rather than one
 * they must log in to see.
 */
export async function sendAgreementSigned(
  email: string,
  name: string,
  agreement: {
    title: string;
    reference: string;
    version: string;
    body: string;
    signedName: string;
    signedAt: string;
  },
) {
  const safeName = escapeHtml(name);
  const title = escapeHtml(agreement.title);
  const signedOn = new Date(agreement.signedAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // The stored body is plain text with blank lines between paragraphs.
  const rendered = escapeHtml(agreement.body || "")
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p style="${P}">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  await send(
    email,
    `Your signed copy: ${agreement.title}`,
    `
<h1 style="${H1}">Signed, and here is your copy</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">This confirms you signed the <strong>${title}</strong>. Keep this email — it is your copy of what you agreed to and when.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:14px;color:#1e4a3f;"><strong>Reference:</strong> ${escapeHtml(agreement.reference)}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#1e4a3f;"><strong>Version:</strong> ${escapeHtml(agreement.version)}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#1e4a3f;"><strong>Signed by:</strong> ${escapeHtml(agreement.signedName)}</p>
  <p style="margin:8px 0 0 0;font-size:14px;color:#1e4a3f;"><strong>Signed on:</strong> ${escapeHtml(signedOn)}</p>
</div>
${rendered ? `<hr style="border:none;border-top:1px solid #e4e2da;margin:28px 0;"/><p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#758078;font-family:inherit;">${title}</p>${rendered}<hr style="border:none;border-top:1px solid #e4e2da;margin:28px 0;"/>` : ""}
<p style="${P}">A printable version is always available in your account, where you can save it as a PDF.</p>
<p style="margin:16px 0 0;">${btn("https://www.nscaptures.com/account?tab=agreements", "View in your account")}</p>`,
  );
}

/**
 * Notifies a photographer when their work is chosen as the Featured Photographer / Spotlight.
 */
export async function sendFeaturedSpotlightNotification(
  to: string,
  photographerName: string,
  photoTitle: string,
  headline: string = "Featured Photographer",
  quote?: string,
  story?: string,
) {
  const safeName = escapeHtml(photographerName);
  const safeTitle = escapeHtml(photoTitle);
  const safeHeadline = escapeHtml(headline);
  const safeQuote = quote ? escapeHtml(quote) : "";
  const safeStory = story ? escapeHtml(story) : "";

  await send(
    to,
    `Congratulations! You're featured on NS CAPTURES`,
    `
<h1 style="${H1}">You're in the Spotlight!</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">We are delighted to share that our editorial curation team has selected your work to be showcased as our <strong>${safeHeadline}</strong> on the NS CAPTURES homepage.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">${safeHeadline}</p>
  <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#18211f;">${safeTitle}</p>
  ${safeStory ? `<p style="margin:10px 0 0;font-size:14px;line-height:20px;color:#555555;">${safeStory}</p>` : ""}
  ${safeQuote ? `<p style="margin:12px 0 0;font-size:13px;line-height:18px;font-style:italic;color:#6b716d;">"${safeQuote}"</p>` : ""}
</div>
<p style="${P}">Your featured craft and artist profile are now prominent on the front page for collectors, creative directors, and our global photography community.</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com", "View Your Feature Live")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">Thank you for sharing your vision with NS CAPTURES. Keep capturing the extraordinary.</p>`,
  );
}

/**
 * Notifies a user when they join the Web3 Early Access Waitlist.
 */
export async function sendWeb3WaitlistConfirmation(to: string, name?: string, role?: string) {
  const safeName = name ? escapeHtml(name) : "Creator";
  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : "Collector & Creator";

  await send(
    to,
    `Welcome to the NS CAPTURES Web3 Early Access Waitlist`,
    `
<h1 style="${H1}">You're on the list!</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">Thank you for securing your early access spot for the upcoming <strong>NS CAPTURES Web3 & On-Chain Photography</strong> rollout.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">Your Waitlist Registration</p>
  <p style="margin:6px 0 0;font-size:15px;color:#18211f;">Role: <strong>${escapeHtml(roleLabel)}</strong></p>
  <p style="margin:4px 0 0;font-size:13px;color:#555555;">Status: <span style="color:#1e4a3f;font-weight:600;">Priority Access Confirmed</span></p>
</div>
<p style="${P}">Here is a glimpse of what's coming soon to NS CAPTURES on the decentralized web:</p>
<ul style="margin:12px 0 0 20px;padding:0;color:#444444;font-size:14px;line-height:22px;">
  <li><strong>On-Chain Provenance & Licensing:</strong> Immutable cryptographic copyright stamps, proof of authorship, and metadata preservation.</li>
  <li><strong>Perpetual Creator Royalties:</strong> Smart contract-governed secondary royalties dispatched directly to photographer wallets.</li>
  <li><strong>Decentralized Master Archival:</strong> Permanent IPFS & Arweave storage protecting full-resolution RAW masters.</li>
  <li><strong>Curated Digital Editions:</strong> Token-gated limited collector editions alongside legal commercial acquisition.</li>
</ul>
<p style="${P}">We will notify you the moment early access invitations and genesis mint slots become available.</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com", "Explore NS CAPTURES")}</p>`,
  );
}

/**
 * Notifies a user and the platform when an on-chain crypto deposit arrives in their Web3 vault.
 */
export async function sendCryptoDepositNotification({
  to,
  userName,
  coin,
  network,
  amount,
  fiatValue,
  vaultAddress,
  txHash,
}: {
  to: string;
  userName?: string;
  coin: string;
  network: string;
  amount: number | string;
  fiatValue?: string;
  vaultAddress: string;
  txHash?: string;
}) {
  const safeName = escapeHtml(userName || "Collector");
  const safeCoin = escapeHtml(coin.toUpperCase());
  const safeNetwork = escapeHtml(network.toUpperCase());
  const safeAddress = escapeHtml(vaultAddress);
  const safeTx = txHash ? escapeHtml(txHash) : "";

  const subject = `Deposit Confirmed: ${amount} ${safeCoin} (${safeNetwork}) — NS CAPTURES`;
  const html = `
<h1 style="${H1}">Crypto Deposit Confirmed</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">Your on-chain deposit has been confirmed and credited to your <strong>NS CAPTURES Web3 Vault</strong>.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">Deposit Summary</p>
  <p style="margin:8px 0 0 0;font-size:26px;font-weight:600;color:#18211f;">${amount} ${safeCoin}</p>
  ${fiatValue ? `<p style="margin:4px 0 0 0;font-size:14px;color:#1e4a3f;font-weight:500;">≈ ${escapeHtml(fiatValue)}</p>` : ""}
  <hr style="border:none;border-top:1px solid #dce8df;margin:16px 0;"/>
  <p style="margin:0;font-size:13px;color:#555555;"><strong>Network:</strong> ${safeNetwork}</p>
  <p style="margin:6px 0 0 0;font-size:13px;color:#555555;"><strong>Destination Vault Address:</strong></p>
  <p style="margin:4px 0 0 0;font-size:12px;font-family:monospace;color:#18211f;word-break:break-all;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #dce8df;">${safeAddress}</p>
  ${
    safeTx
      ? `
  <p style="margin:10px 0 0 0;font-size:13px;color:#555555;"><strong>Blockchain Transaction ID (TxHash):</strong></p>
  <p style="margin:4px 0 0 0;font-size:12px;font-family:monospace;color:#18211f;word-break:break-all;">${safeTx}</p>`
      : ""
  }
</div>
<p style="${P}">Your live vault balance is updated and ready to be used for platform settlements, photo licensing, and digital acquisitions.</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com/account?tab=web3", "View Web3 Vault")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">This is an automated on-chain deposit notification from NS CAPTURES Non-Custodial Infrastructure.</p>`;

  return send(to, subject, html);
}

/**
 * Notifies a user when a crypto withdrawal / transfer has been executed from their Web3 vault.
 */
export async function sendCryptoWithdrawalNotification({
  to,
  userName,
  coin,
  network,
  amount,
  fiatValue,
  destinationAddress,
  txHash,
  reference,
}: {
  to: string;
  userName?: string;
  coin: string;
  network: string;
  amount: number | string;
  fiatValue?: string;
  destinationAddress: string;
  txHash?: string;
  reference?: string;
}) {
  const safeName = escapeHtml(userName || "Collector");
  const safeCoin = escapeHtml(coin.toUpperCase());
  const safeNetwork = escapeHtml(network.toUpperCase());
  const safeAddress = escapeHtml(destinationAddress);
  const safeTx = txHash ? escapeHtml(txHash) : "";
  const safeRef = reference ? escapeHtml(reference) : "";

  const subject = `Withdrawal Dispatched: ${amount} ${safeCoin} (${safeNetwork}) — NS CAPTURES`;
  const html = `
<h1 style="${H1}">Crypto Withdrawal Dispatched</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">A crypto transfer has been executed from your <strong>NS CAPTURES Web3 Vault</strong> to an external wallet address.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">Transfer Details</p>
  <p style="margin:8px 0 0 0;font-size:26px;font-weight:600;color:#18211f;">${amount} ${safeCoin}</p>
  ${fiatValue ? `<p style="margin:4px 0 0 0;font-size:14px;color:#1e4a3f;font-weight:500;">≈ ${escapeHtml(fiatValue)}</p>` : ""}
  <hr style="border:none;border-top:1px solid #dce8df;margin:16px 0;"/>
  <p style="margin:0;font-size:13px;color:#555555;"><strong>Network:</strong> ${safeNetwork}</p>
  <p style="margin:6px 0 0 0;font-size:13px;color:#555555;"><strong>Recipient External Address:</strong></p>
  <p style="margin:4px 0 0 0;font-size:12px;font-family:monospace;color:#18211f;word-break:break-all;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #dce8df;">${safeAddress}</p>
  ${safeRef ? `<p style="margin:10px 0 0 0;font-size:13px;color:#555555;"><strong>Reference ID:</strong> ${safeRef}</p>` : ""}
  ${
    safeTx
      ? `
  <p style="margin:10px 0 0 0;font-size:13px;color:#555555;"><strong>Blockchain Transaction ID:</strong></p>
  <p style="margin:4px 0 0 0;font-size:12px;font-family:monospace;color:#18211f;word-break:break-all;">${safeTx}</p>`
      : ""
  }
</div>
<p style="${P}">The transaction has been submitted to the blockchain network and will confirm within minutes.</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com/account?tab=web3", "View Web3 Vault")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">If you did not authorize this withdrawal, please contact security immediately.</p>`;

  return send(to, subject, html);
}

/**
 * Notifies a user when an administrator has gifted / airdropped NSC tokens to their Web3 Vault.
 */
export async function sendNscGiftNotification({
  to,
  userName,
  amount,
  reason,
  fiatValue,
  newNscBalance,
}: {
  to: string;
  userName?: string;
  amount: number | string;
  reason?: string;
  fiatValue?: string;
  newNscBalance?: number | string;
}) {
  const safeName = escapeHtml(userName || "Collector");
  const safeReason = escapeHtml(reason || "Platform Contributor Gift");
  const safeFiat = fiatValue ? escapeHtml(fiatValue) : `£${Number(amount).toFixed(2)}`;

  const subject = `🎁 You Received ${amount} NSC Tokens from NS CAPTURES`;
  const html = `
<h1 style="${H1}">You Received a Token Gift!</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">Congratulations! NS CAPTURES has credited your <strong>Web3 Settlement Vault</strong> with native <strong>NSC (NS Captures Coin)</strong> tokens.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">Gift Summary</p>
  <p style="margin:8px 0 0 0;font-size:28px;font-weight:600;color:#18211f;">+${amount} NSC</p>
  <p style="margin:4px 0 0 0;font-size:14px;color:#1e4a3f;font-weight:500;">≈ ${safeFiat} (1:1 Value)</p>
  <hr style="border:none;border-top:1px solid #dce8df;margin:16px 0;"/>
  <p style="margin:0;font-size:13px;color:#555555;"><strong>Reason / Note:</strong> ${safeReason}</p>
  ${
    newNscBalance !== undefined
      ? `<p style="margin:8px 0 0 0;font-size:13px;color:#555555;"><strong>Updated Total NSC Balance:</strong> ${newNscBalance} NSC</p>`
      : ""
  }
</div>
<p style="${P}">Your tokens are immediately available in your self-custodial vault. You can use your NSC tokens across NS CAPTURES for exclusive print releases, platform licensing, or withdraw them to your external wallet (Trust Wallet, MetaMask).</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com/account?tab=web3", "Open Web3 Vault")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">Thank you for being an essential part of the NS CAPTURES community.</p>`;

  return send(to, subject, html);
}

/**
 * Notifies a user when they convert Web2 earnings to Web3 NSC tokens.
 */
export async function sendNscConversionNotification({
  to,
  userName,
  fiatAmount,
  currency = "GBP",
  nscAmount,
  vaultAddress: _vaultAddress,
}: {
  to: string;
  userName?: string;
  fiatAmount: number | string;
  currency?: string;
  nscAmount: number | string;
  vaultAddress?: string;
}) {
  const safeName = escapeHtml(userName || "Collector");
  const safeCurrency = escapeHtml(currency);

  const subject = `Web2 to Web3 Conversion: ${nscAmount} NSC Credited — NS CAPTURES`;
  const html = `
<h1 style="${H1}">Conversion Confirmed</h1>
<p style="${P}">Hi ${safeName},</p>
<p style="${P}">Your Web2 platform earnings have been successfully converted into <strong>NSC (NS Captures Coin)</strong> tokens in your Web3 Vault.</p>
<div style="${CARD}">
  <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#1e4a3f;">Conversion Breakdown</p>
  <p style="margin:8px 0 0 0;font-size:26px;font-weight:600;color:#18211f;">${nscAmount} NSC Credited</p>
  <p style="margin:4px 0 0 0;font-size:13px;color:#758078;">Deducted from Web2 Balance: ${safeCurrency} ${fiatAmount}</p>
  <hr style="border:none;border-top:1px solid #dce8df;margin:16px 0;"/>
  <p style="margin:0;font-size:13px;color:#555555;"><strong>Exchange Rate:</strong> 1.00 ${safeCurrency} = 1.00 NSC (1:1 Web3 Bridge)</p>
  <p style="margin:8px 0 0 0;font-size:13px;color:#555555;"><strong>Destination:</strong> Web3 Settlement Vault</p>
</div>
<p style="${P}">Your live Web3 vault balance is updated and ready to be used or transferred.</p>
<p style="margin:24px 0 0;">${btn("https://www.nscaptures.com/account?tab=web3", "View Web3 Vault")}</p>
<p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#888888;font-family:inherit;">This is an automated transaction receipt from NS CAPTURES Web3 Infrastructure.</p>`;

  return send(to, subject, html);
}
