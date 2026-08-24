-- ============================================================
-- 049_payout_debited_marker.sql
--
-- An admin must be able to correct a mistake by moving a payout back a stage
-- and forward again. Today that debits the balance twice.
--
-- The guard asks whether the payout is *currently* approved or paid. Move it
-- back to Under Review and that becomes false, so approving a second time
-- takes the money out again. Nothing in the row remembers that it already
-- happened.
--
-- A timestamp does. It is set the first time the balance is debited and never
-- cleared, so the debit happens once however many times the stage moves.
--
-- Backfilled only where there is evidence in balance_adjustments that money
-- actually left — the debit carries the request id in its reason. Payouts that
-- were approved while the old debit was broken are deliberately left unmarked,
-- because for those the money never moved and marking them would hide it.
-- ============================================================

ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS debited_at timestamptz;

COMMENT ON COLUMN public.payout_requests.debited_at IS
  'When the contributor balance was debited for this payout. Set once; its presence is what stops a second debit if the stage is moved back and forward again.';

UPDATE public.payout_requests r
SET debited_at = b.created_at
FROM (
  SELECT DISTINCT ON (user_id, reason) reason, created_at
  FROM public.balance_adjustments
  WHERE amount < 0 AND reason ILIKE '%request %'
  ORDER BY user_id, reason, created_at
) b
WHERE r.debited_at IS NULL
  AND b.reason ILIKE '%' || r.id::text || '%';

NOTIFY pgrst, 'reload schema';
