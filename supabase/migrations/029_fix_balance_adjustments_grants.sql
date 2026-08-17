-- 029_fix_balance_adjustments_grants.sql
-- 023 created public.balance_adjustments with RLS policies but never granted
-- table privileges, so every client read fails with 42501 before RLS is even
-- evaluated. 018 fixed this same class of bug for the tables that existed then;
-- balance_adjustments was added afterwards and was missed.
--
-- Symptom: fetchPhotographerMonthlyRevenue() silently drops all "Hype Engine"
-- ledger entries from the photographer revenue chart, because the query errors
-- and the result is destructured without an error check.
--
-- Inserts are unaffected either way: they go through adjust_payout_balance(),
-- which is SECURITY DEFINER. Read access stays admin-only via the existing
-- "Admins can read balance_adjustments" policy.

GRANT SELECT ON public.balance_adjustments TO authenticated;

-- service_role is used by edge functions and maintenance scripts and bypasses
-- RLS, but still needs the table grant.
GRANT SELECT, INSERT ON public.balance_adjustments TO service_role;
