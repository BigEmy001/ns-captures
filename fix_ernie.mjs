import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gonuhcxbwuuqnlmwysiw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbnVoY3hid3V1cW5sbXd5c2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk5MDEwNywiZXhwIjoyMDk5NTY2MTA3fQ.WCkeWXLqxeacM1jM_AmpalZx3QjD_taOP1wex102BNM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const userId = '45620e9f-397b-4b2c-ae04-b6b70cbcac49';
const email = 'ernieblackrixx@gmail.com';
const name = 'Ernie Blarinckx';
const slug = 'ernie-blarinckx-45620e9f';

async function fixUser() {
  console.log("1. Updating profile...");
  const { error: pErr } = await supabase
    .from('profiles')
    .update({ email, slug })
    .eq('id', userId);
    
  if (pErr) {
    console.error("Profile update failed:", pErr);
    return;
  }
  console.log("Profile updated successfully!");

  console.log("2. Inserting photographer record...");
  const { error: phErr } = await supabase
    .from('photographers')
    .upsert({ id: slug, name });
    
  if (phErr) {
    console.error("Photographer insert failed:", phErr);
  } else {
    console.log("Photographer record inserted successfully!");
  }

  console.log("3. Constructing welcome email...");
  const body = `
<h1 style="margin:0;font-size:24px;line-height:26px;font-weight:400;color:#333333;font-family:inherit;">Welcome, Ernie Blarinckx!</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:22px;color:#333333;font-family:inherit;">We've received your contributor application. Our team will review your submission and get back to you within 3-5 business days.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#888888;font-family:inherit;">In the meantime, feel free to explore the platform and familiarize yourself with our licensing standards.</p>
<p style="margin:16px 0 0;"><table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background-color:#1e4a3f;border-radius:44px;padding:12px 32px;">
<a href="https://www.nscaptures.com" style="display:block;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;font-family:inherit;">Explore NS CAPTURES</a>
</td></tr></table></p>
`;

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

  console.log("4. Triggering send-email edge function...");
  const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("send-email", {
    body: {
      to: email,
      subject: "Application Received — NS CAPTURES",
      body: fullHtml
    }
  });

  if (edgeErr) {
    console.error("Email send failed:", edgeErr);
  } else {
    console.log("Email sent successfully! Response:", edgeData);
  }
}

fixUser();
