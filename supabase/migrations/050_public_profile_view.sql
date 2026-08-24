-- ============================================================
-- 050_public_profile_view.sql
--
-- profiles is readable by everyone, including anonymous visitors, and RLS is
-- row-level: permission to read the row is permission to read every column of
-- it. So the whole table is public — every email address, every phone number,
-- and every payout balance.
--
-- The table has to stay reachable, because a handful of genuinely public
-- things are keyed off it: a photographer's page shows their level and
-- specialties, a purchase resolves the contributor who earns from the photo,
-- and follower lists show names and avatars.
--
-- This view is that public face, and only that. It carries the columns a
-- stranger is meant to see and none of the ones they are not. It runs as its
-- owner, so it keeps working once the table itself stops being world-readable
-- in 051 — which is the migration that actually closes the door, and which
-- must not be applied until the code reading this view is live.
-- ============================================================

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  name,
  slug,
  avatar,
  bio,
  location,
  occupation,
  company,
  specialties,
  contributor_level,
  contributor_id,
  member_since,
  created_at
FROM public.profiles;

-- Deliberately not security_invoker: the point of the view is to serve callers
-- who have no read access to the underlying table.
ALTER VIEW public.public_profiles SET (security_invoker = false);

COMMENT ON VIEW public.public_profiles IS
  'The publicly visible part of a profile. Anything absent here — email, phone, dob, balance, status, verification, preferences — is absent on purpose.';

GRANT SELECT ON public.public_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
