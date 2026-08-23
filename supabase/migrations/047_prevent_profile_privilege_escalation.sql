-- ============================================================
-- 047_prevent_profile_privilege_escalation.sql
--
-- CRITICAL. Any signed-in user could make themselves an administrator and
-- credit themselves any balance they liked.
--
-- profiles carries two UPDATE policies, and RLS ORs them together:
--
--     "Admins can update all profiles"   role = 'Admin'
--     "Users can update own profile"     auth.uid() = id
--
-- The second is needed — people edit their own name, bio and payout currency.
-- But RLS is row-level, not column-level: permission to update the row is
-- permission to update every column in it, and role, payout_balance, status,
-- slug, contributor_id and contributor_level all live on that row.
--
-- Verified against production before writing this: an ordinary Buyer set
-- role = 'Admin' on themselves, then payout_balance = 999999, then edited
-- another person's profile with the admin rights they had just granted
-- themselves.
--
-- Column-level GRANTs cannot express the rule, because an admin is also
-- `authenticated` and would be caught by the same restriction. A trigger can:
-- it holds the privileged columns at their existing values for everyone except
-- an administrator, so an ordinary self-update simply cannot move them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.caller_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Work done by the service role or inside a SECURITY DEFINER routine has no
  -- auth.uid(); those paths are trusted and set these columns deliberately.
  IF auth.uid() IS NULL OR public.caller_is_admin() THEN
    RETURN NEW;
  END IF;

  -- Nobody promotes themselves, pays themselves, or unsuspends themselves.
  NEW.role              := OLD.role;
  NEW.payout_balance    := OLD.payout_balance;
  NEW.status            := OLD.status;
  NEW.slug              := OLD.slug;
  NEW.contributor_id    := OLD.contributor_id;
  NEW.contributor_level := OLD.contributor_level;

  -- Verification may be started by the contributor but never granted by them:
  -- submitting documents moves it to 'pending', and only an admin can decide
  -- the outcome.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status <> 'pending' THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

GRANT EXECUTE ON FUNCTION public.caller_is_admin() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
