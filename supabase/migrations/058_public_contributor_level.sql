-- ============================================================
-- 058_public_contributor_level.sql
--
-- Every public photographer page was badged "INTERNATIONAL CONTRIBUTOR",
-- including the thirteen photographers who are not in the contributor
-- programme at all. The badge announced a membership they do not hold.
--
-- Two things caused it together. profiles.contributor_level carries a column
-- default of 'international', so every account is given one on creation
-- whatever its role; and contributorLevelLabel() fell back to the same value
-- when none was set, so there was no state in which the badge was absent.
--
-- The view is the right place to settle it: a programme level is published
-- only for someone in the programme, and is null for everybody else. Doing it
-- here rather than by exposing role keeps the role itself private — the page
-- needs to know the standing, not the account type.
--
-- The stored column is left exactly as it is. Nothing is rewritten; what
-- changes is who it is published to.
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
  -- Only a member of the programme has a programme standing to show.
  CASE
    WHEN role IN ('Contributor', 'Admin') THEN contributor_level
    ELSE NULL
  END AS contributor_level,
  contributor_id,
  member_since,
  created_at
FROM public.profiles;

COMMENT ON VIEW public.public_profiles IS
  'The publicly visible part of a profile. Anything absent here — email, phone, dob, balance, status, verification, preferences — is absent on purpose. contributor_level is published only for programme members.';

GRANT SELECT ON public.public_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
