-- ============================================================
-- 053_missing_table_grants.sql
--
-- Several features have never once worked in production, and the tables show
-- it: agreements 0 rows, acquisitions 0, notifications 0. Not because anything
-- rejected them — because nothing could reach the table at all.
--
-- RLS policies and table grants are separate gates. A policy decides which
-- rows you may touch; a grant decides whether you may touch the table. Tables
-- created with policies but no GRANT are unreachable from PostgREST no matter
-- how permissive the policy reads, and the failure is a bare "permission
-- denied for table", which the callers log and swallow.
--
-- Granting blindly would be worse than the bug. Three of these tables carry an
-- INSERT policy of WITH CHECK (true) — named "Service role writes earnings"
-- and the like, but checking nothing. They are harmless today only because the
-- grant is missing. Hand out INSERT and any signed-in person could mint their
-- own earnings. So each table is treated on its own terms:
--
--   granted           - the policy already carries a real check
--   tightened, then granted - the check was true and had to be written first
--   tightened, not granted  - writes go through a SECURITY DEFINER RPC, so
--                             the table needs no direct access at all
-- ============================================================

-- ---- Granted: policies already check who is asking ---------------------
-- Both are admin-only via a role test on the caller's own profile row.
GRANT INSERT, UPDATE ON public.agreements TO authenticated;
GRANT INSERT, UPDATE ON public.acquisitions TO authenticated;
GRANT INSERT ON public.payout_events TO authenticated;

-- Scoped to the follower themselves: WITH CHECK (auth.uid() = follower_id).
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT ON public.user_follows TO anon;

-- Deliberately open: the programme application form is public.
GRANT INSERT ON public.contributor_submissions TO anon, authenticated;

-- ---- Tightened, then granted -------------------------------------------
-- notify() runs in the browser and raises a notification for someone else,
-- which is an admin act. A person may also be notified about their own
-- doing, so self-addressed notifications stay allowed. The old policy was
-- called "Admins write notifications" but checked nothing at all.
DROP POLICY IF EXISTS "Admins write notifications" ON public.notifications;

CREATE POLICY "Admins raise notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.caller_is_admin() OR user_id = auth.uid());

GRANT INSERT ON public.notifications TO authenticated;

-- photographer_profiles had owner-scoped policies sitting beside a pair of
-- blanket ones. Policies are OR'd, so the blanket pair decided everything:
-- with a grant, anyone could have written anyone's settings.
DROP POLICY IF EXISTS "Authenticated upsert photographer_profiles" ON public.photographer_profiles;
DROP POLICY IF EXISTS "Authenticated update photographer_profiles" ON public.photographer_profiles;

GRANT SELECT, INSERT, UPDATE ON public.photographer_profiles TO authenticated;
GRANT SELECT ON public.photographer_profiles TO anon;

-- ---- Tightened, not granted --------------------------------------------
-- These two hold money. Every write goes through record_contributor_earning
-- or adjust_payout_balance, both SECURITY DEFINER, which run as the owner and
-- do not consult these policies. Dropping the blanket INSERT costs nothing
-- and removes a trap that a future GRANT would spring.
DROP POLICY IF EXISTS "Service role can insert balance_adjustments" ON public.balance_adjustments;
DROP POLICY IF EXISTS "Service role writes earnings" ON public.contributor_earnings;

NOTIFY pgrst, 'reload schema';
