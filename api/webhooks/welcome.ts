import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "../lib/rate-limit";

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

  // 1. Secure the endpoint by verifying the user's JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server missing Supabase environment variables" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user || !user.email) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  const email = user.email;
  const name = user.user_metadata?.name || "there";

  // 2. Dispatch the email using Nodemailer
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: sans-serif; max-w-lg; margin: 0 auto; color: #18211f; padding: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Welcome to NS Captures!</h1>
        <p style="margin-bottom: 16px;">Hi ${name},</p>
        <p style="margin-bottom: 16px;">We are thrilled to welcome you to our community of creators and visual storytellers.</p>
        <p style="margin-bottom: 16px;">Whether you're here to discover breathtaking authentic photography or to share your own unique perspective with the world, you're in exactly the right place.</p>
        <p style="margin-bottom: 30px;">Get started by exploring our curated collections, or set up your profile to begin contributing.</p>
        <a href="https://www.nscaptures.com" style="display: inline-block; background-color: #1e4a3f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; margin-bottom: 30px;">Explore the Gallery</a>
        <p style="font-size: 12px; color: #6b716d; border-top: 1px solid #ececec; padding-top: 20px;">
          NS Captures Team<br/>
          support@nscaptures.com
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "NS Captures <support@nscaptures.com>",
      to: email,
      subject: "Welcome to NS Captures!",
      html: htmlContent,
    });

    return res.status(200).json({ success: true, message: `Welcome email sent to ${email}` });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return res.status(500).json({ error: "Failed to send email", details: error.message });
  }
}
