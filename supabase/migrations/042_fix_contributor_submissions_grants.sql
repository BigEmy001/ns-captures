-- ============================================================
-- 042_fix_contributor_submissions_grants.sql
--
-- contributor_submissions was granted INSERT to anon and SELECT/UPDATE to
-- authenticated, but service_role got neither — it holds only Dxtm. Anything
-- running with the service key (edge functions, maintenance scripts) is
-- refused before RLS is even considered.
--
-- Same class of bug as 029 fixed for balance_adjustments. The admin console is
-- unaffected either way: it reads and writes as an authenticated admin.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributor_submissions TO service_role;

-- An admin approving an application needs to write back which account it
-- produced. authenticated already holds UPDATE; this makes the intent explicit
-- alongside the existing "Admins can update contributor submissions" policy.
GRANT SELECT, UPDATE ON public.contributor_submissions TO authenticated;

NOTIFY pgrst, 'reload schema';
