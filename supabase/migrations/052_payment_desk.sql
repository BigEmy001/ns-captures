-- ============================================================
-- 052_payment_desk.sql
--
-- Someone settling a conversion charge may not be able to use any of the
-- published methods — wrong region, no crypto, a bank that will not send. Up
-- to now the only way to say so was to name a payment method "CONTACT SUPPORT"
-- and hope they read it, which is why the method list had grown into a message
-- board.
--
-- The payment desk is that route, made explicit: an address to write to, a
-- WhatsApp number to message, and a line of guidance the admin can edit.
--
-- All three are optional. Empty email and WhatsApp fall back to the general
-- support address and contact link, so the desk works before anyone has
-- configured it.
-- ============================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payment_desk_email text,
  ADD COLUMN IF NOT EXISTS payment_desk_whatsapp text,
  ADD COLUMN IF NOT EXISTS payment_desk_note text;

COMMENT ON COLUMN public.site_settings.payment_desk_email IS
  'Where to write about settling a charge. Falls back to support_email when empty.';
COMMENT ON COLUMN public.site_settings.payment_desk_whatsapp IS
  'WhatsApp link or number for the payment desk. Falls back to contact_link when empty.';
COMMENT ON COLUMN public.site_settings.payment_desk_note IS
  'A line of guidance shown beside the desk, editable by the admin.';

NOTIFY pgrst, 'reload schema';
