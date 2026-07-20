import nodemailer from "nodemailer";
import { rateLimit } from "../lib/rate-limit";

// Supabase sends a payload like { type: "UPDATE", table: "briefs", record: { id: "...", client_email: "...", status: "accepted", ... }, old_record: { status: "OPEN" } }
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = (req.headers["x-forwarded-for"] as string) || "unknown";
  const { limited } = rateLimit(ip);
  if (limited) {
    return res.status(429).json({ error: "Too many requests" });
  }

  // Mandatory: Verify a webhook secret from Supabase
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CRITICAL: WEBHOOK_SECRET is not configured on the server.");
    return res.status(500).json({ error: "Server misconfiguration: Webhook secret missing" });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, record, old_record } = req.body;

  // Only proceed if this is an UPDATE that changed the status to "accepted"
  if (type !== "UPDATE" || record?.status !== "ACCEPTED" || old_record?.status === "ACCEPTED") {
    return res.status(200).json({ message: "Ignored: Not a status change to ACCEPTED" });
  }

  if (!record.client_email) {
    return res.status(400).json({ error: "Missing client_email on brief record" });
  }

  const email = record.client_email;
  const title = record.title || "Your photography request";

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: sans-serif; max-w-lg; margin: 0 auto; color: #18211f; padding: 20px;">
        <p style="font-size: 10px; font-family: monospace; letter-spacing: 0.1em; color: #547066;">UPDATE</p>
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Your brief has been accepted!</h1>
        <p style="margin-bottom: 16px;">Great news! A photographer from the NS Captures network has accepted your request:</p>
        <div style="background-color: #f8f6f0; padding: 16px; border-left: 4px solid #1e4a3f; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: bold;">${title}</p>
        </div>
        <p style="margin-bottom: 16px;">The photographer will be reaching out to you shortly using this email address to discuss the details, timeline, and next steps.</p>
        <p style="margin-bottom: 30px;">Thank you for trusting NS Captures with your vision.</p>
        <p style="font-size: 12px; color: #6b716d; border-top: 1px solid #ececec; padding-top: 20px;">
          NS Captures Team<br/>
          support@nscaptures.com
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "NS Captures <support@nscaptures.com>",
      to: email,
      subject: "Good news! Your Creative Brief was accepted",
      html: htmlContent,
    });

    return res.status(200).json({ success: true, message: `Notification sent to ${email}` });
  } catch (error: any) {
    console.error("Error sending brief accepted email:", error);
    return res.status(500).json({ error: "Failed to send email", details: error.message });
  }
}
