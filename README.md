# NS CAPTURES — Full-Spectrum Email & Contributor System

## Overview

A complete email-first system that bridges independent photographers and NS CAPTURES' acquisition pipeline. Every contributor submission triggers immediate automated emails and is tracked across our entire workflow.

## Features

### **Email Automation**
- [x] Contributor → Instant acknowledgment email
- [x] Contributor → Admin notification (support@nscaptures.com)
- [x] Purchase receipt + license confirmation
- [x] Contributor status updates (application received)
- [x] Admin notifications for all contributor actions
- [x] Email notifications for verification (approve/reject)

### **Core Email Templates**
- `
- [`sendPurchaseReceipt.ts`](src/lib/email.ts)
- `sendLicenseConfirmation.ts`
- `sendContributorAcknowledgment.ts`
- `sendVerificationStatus.ts`
- `sendAdminNotification.ts`

### **Email Service**
- `
- [`supabase/functions/send-email/`](supabase/functions/send-email/)
- PrivateEmail SMTP integration (`mail.privateemail.com`)
- NS CAPTURES branding (logo, colors, email footer)
- JSON REST API endpoint

### **Integration Points**
- `
- [`Navbar.tsx`](src/app/components/Navbar.tsx)
- Purchase/license creation → automated emails
- [`Contribute.tsx`](src/app/pages/Contribute.tsx)
- Contributor application → auto-ack + admin alert
- [`Admin.tsx`](src/app/pages/Admin.tsx)
- Verification approve/reject → email status update

## Technical Architecture

### **Email Service**
```bash
SEND_HOST=mail.privateemail.com
SEND_PORT=465
SEND_USER=support@nscaptures.com
SEND_PASS=[PrivateEmail password]
```

### **Email Content**
- Logo: [`image 109 [Vectorized].svg`](image%20109%20[Vectorized].svg)
- Brand colors: #1e4a3f (green), white, black
- Address: London, United Kingdom
- Theme: Confidentiality notice on every email

### **Email Types**

#### 1. Contributor Acknowledgment (`sendContributorAcknowledgment`)
- Auto-sent when contributor submits application
- Confirms application received, timeline expectations
- Includes "Explore NS CAPTURES" button

#### 2. Admin Contributor Notification (`sendAdminNotification`)
- Sent to support@nscaptures.com
- Lists new application details
- Admin can click to review immediately

#### 3. Purchase Receipt (`sendPurchaseReceipt`)
- Sent to buyer after successful payment
- Itemized list with total
- "My Account" button to dashboard

#### 4. License Confirmation (`sendLicenseConfirmation`)
- Sent after license is issued
- Includes license type and image title
- "View License" button

#### 5. Verification Status (`sendVerificationStatus`)
- Sent when verification status changes (approved/rejected)
- Different messaging for approve vs reject
- Action buttons for next steps

### **Workflow Integration**

#### Contributor Application
1. User fills application form
2. `logActivity` stored locally
3. *SendContributorAcknowledgment* → user
4. *SendAdminNotification* → admin
5. Admin reviews, takes action (approve/reject)
6. If verification processed → *sendVerificationStatus*

#### Purchase Flow
1. User clicks checkout
2. Transaction processed
3. *sendPurchaseReceipt* → buyer
4. *sendLicenseConfirmation* → buyer (one per license)

### **Email Address Management**

#### Current Configuration
- Admin support email: `support@nscaptures.com`
- Domain: `nscaptures.com` (formerly `ns-captures.com`)
- SPF/DKIM: Configured for PrivateEmail
- Reply-to: Various based on email type (e.g., photographer@example.com for license confirmations)

#### Admin Panel Settings
- Site URL: https://www.nscaptures.com
- Privacy notice: Standard NDRG-compliant confidential communications policy
- Email formatting: Mobile-optimized, responsive

## Deployment

### Prerequisites
```bash
# PrivateEmail SMTP credentials
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_USER=support@nscaptures.com
SMTP_PASS=[your-privateemail-password]
```

### Environment Variables
```bash
# Supabase Edge Function configuration
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_USER=support@nscaptures.com
SMTP_PASS=[privateemailPassword]
```

### Installation
```bash
# Nuxt 3/Native App
uenv add SMTP_HOST=mail.privateemail.com
env add SMTP_PORT=465
evn add SMTP_USER=support@nscaptures.com
env add SMTP_PASS=[yourPassword]

# Build & Deploy
npm run build
vercel deploy --prod
```

## API Endpoints

### Send Email
```http
POST /api/send-email
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Your Email Subject",
  "body": "<p>Your email content with <strong>HTML</strong></p>"
}
```

### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true
}
```

## Testing

### Manual Testing
1. Use *SendAdminNotification* to verify email flow
2. Submit a contributor application
3. Verify receipt received by user
4. Check admin email for notification

### Test via Terminal
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"to": "support@nscaptures.com", "subject": "Test Email", "body": "<p>Test email content</p>"}'
```

## Troubleshooting

### Common Issues

#### Email Not Received
- Check PrivateEmail SPF/DKIM for domain
- Verify SMTP credentials are correct
- Confirm domain email routing

#### HTML Rendering Issues
- Use inline styles only (emails strip external CSS)
- Test in Apple Mail (most compliant)
- Avoid complex tables or framesets

#### Authentication Failures
- Restart edge function if stuck
- Check environment variables
- Ensure SMTP login credentials are current

## Maintenance

### Regular Tasks
1. Monitor email delivery rates
2. Update email templates with new campaigns
3. Review admin notification filtering
4. Perform quarterly SMTP credential rotations

### Updates
```bash
# Update email template
vim src/lib/email.ts

# Deploy updated function
vercel deploy --prod
```

## Security Notes

- All emails contain confidentiality notices
- SMTP credentials are server-only (not in client code)
- User data encryption follows NDRG standards
- Email content is validated before sending

## Future Enhancements

1. **Template System**: Content management for email templates
2. **Analytics**: Email open/click tracking
3. **A/B Testing**: Subject line optimization
4. **Multi-language**: Non-English support
5. **Webhook Integration**: Third-party tool connections

---

*Last updated: $(date)*
*Email service version: 1.0.0*