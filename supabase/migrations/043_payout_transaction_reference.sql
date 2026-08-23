-- ============================================================
-- 043_payout_transaction_reference.sql
--
-- A crypto payout's most useful fact is its transaction hash: it is the one
-- thing the recipient can check themselves, independently of anything we say.
-- The same field holds a PayPal transaction id or a bank payment reference.
-- ============================================================

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS transaction_reference text;

COMMENT ON COLUMN public.payout_requests.transaction_reference IS
  'Transaction hash for a crypto payout, transaction id for PayPal, or the payment reference for a bank transfer. Shown to the contributor so they can verify it themselves.';

NOTIFY pgrst, 'reload schema';
