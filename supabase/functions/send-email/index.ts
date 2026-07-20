import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const encoder = new TextEncoder();

// Simple in-memory rate limiter (per-isolation, good enough for Supabase Edge Functions)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function buildHtml(body: string): string {
  return `<!DOCTYPE html>
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
<tr><td style="padding:0 0 15px 0;">
${body}
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 50px 40px 50px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="border-top:1px solid #e0e0e0;padding:30px 0 0 0;">
<p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1e4a3f;font-family:inherit;">NS CAPTURES</p>
<p style="margin:0 0 2px 0;font-size:12px;color:#555555;font-family:inherit;">Global Photography Acquisition &amp; Licensing</p>
<p style="margin:0 0 12px 0;font-size:12px;color:#888888;font-family:inherit;">&#x1F4CD; London, United Kingdom</p>
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
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  // Auth: require a valid Bearer token or Supabase auth
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Allow either service role key or a valid JWT
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    // Service role - proceed
  } else if (anonKey && authHeader === `Bearer ${anonKey}`) {
    // Anon key from client - proceed (client-side callers like email.ts use supabase.functions.invoke which auto-attaches the anon key)
  } else {
    return new Response(JSON.stringify({ error: "Invalid authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: "SMTP is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"NS CAPTURES" <${smtpUser}>`,
      to: to,
      subject: subject,
      html: buildHtml(body),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
