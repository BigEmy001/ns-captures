import nodemailer from "nodemailer";

// Supabase sends a payload like { type: "INSERT", table: "users", record: { email: "...", raw_user_meta_data: { name: "..." } } }
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional: Verify a webhook secret from Supabase to ensure security
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const authHeader = req.headers.authorization;
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, record, old_record } = req.body;
  
  // We only want to send the welcome email AFTER they verify their email address.
  // This happens when 'email_confirmed_at' changes from null to a timestamp.
  if (
    type !== "UPDATE" || 
    !record?.email_confirmed_at || 
    old_record?.email_confirmed_at !== null
  ) {
    return res.status(200).json({ message: "Ignored: User has not just confirmed their email" });
  }

  if (!record || !record.email) {
    return res.status(400).json({ error: "Missing user record or email" });
  }

  const email = record.email;
  // If the user signed up with a name, it will be in raw_user_meta_data
  const name = record.raw_user_meta_data?.name || "there";

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
