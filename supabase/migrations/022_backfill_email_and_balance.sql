-- ============================================================
-- 022_backfill_email_and_balance.sql
-- Backfill profile emails from auth.users for accounts created
-- during the email-column regression (migrations 009/020)
-- ============================================================

-- 1. Backfill email for profiles where it is NULL
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 2. Add payout_balance column (manual admin ledger adjustments)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_balance numeric DEFAULT 0;
