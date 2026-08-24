-- ============================================================
-- 051_restrict_profiles_read.sql
--
-- Closes what 050 prepared for.
--
-- "Public profiles are viewable by everyone" was USING (true), and because RLS
-- is row-level, that handed every column of every profile to anyone who asked
-- — no account needed. In practice: 20 email addresses, 6 phone numbers, and
-- every contributor's payout balance.
--
-- A profile row now belongs to the person it describes. Everyone else reads
-- public_profiles, which carries only what a stranger is meant to see.
--
-- Admin access goes through caller_is_admin(), which is SECURITY DEFINER. That
-- matters: a SELECT policy on profiles that asked "is the caller an admin?" by
-- selecting from profiles would recurse and lock the table out entirely.
--
-- Apply only once the code reading public_profiles is live.
-- ============================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read every profile"
  ON public.profiles FOR SELECT
  USING (public.caller_is_admin());

NOTIFY pgrst, 'reload schema';
