-- 031_repair_mangled_photographer_slugs.sql
-- Repairs the slugs corrupted by the 021 generator (see 030).
--
-- !! This rewrites the photographer identity key, which is also the public
-- !! profile URL. Existing links to an affected photographer's page will 404
-- !! after this runs. Apply deliberately, not as part of a routine deploy.
--
-- Scope guard: only slugs that carry the corruption signature are touched —
-- a leading dash, or a doubled dash from a fully stripped name part. Legacy
-- slugs that predate the uuid suffix (e.g. 'lexmond-dennis') do not match and
-- are deliberately left alone, since recomputing them would change working
-- URLs for no reason.
--
-- Expected repairs at time of writing (6 rows):
--   -unghoon-ung-e85d599d    -> junghoon-sung-e85d599d
--   -atalia-omberg-95999c6f  -> natalia-momberg-95999c6f
--   -ana-renner-596ee386     -> jana-brenner-596ee386
--   -elsy-agemeier-748cdd17  -> kelsy-hagemeier-748cdd17
--   -evv-sdyyh-ab8db49b      -> nevv-sdyyh-ab8db49b
--   --b875339a               -> francisco-javier-valiente-mayoral-b875339a
--
-- Photographers rows with a mangled id but no linked profile are NOT covered
-- here (nothing maps them); those are orphans, handled in 032.

BEGIN;

-- 1. Build the old -> new mapping using the same rule as the fixed generator.
CREATE TEMP TABLE slug_repair ON COMMIT DROP AS
SELECT
  p.id   AS profile_id,
  p.slug AS old_slug,
  COALESCE(
    NULLIF(trim(both '-' from lower(regexp_replace(p.name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
    'photographer'
  ) || '-' || substr(p.id::text, 1, 8) AS new_slug
FROM public.profiles p
WHERE p.role = 'Photographer'
  AND p.slug IS NOT NULL
  AND (p.slug LIKE '-%' OR p.slug LIKE '%--%');

-- 2. Refuse to run if any repaired slug would collide.
DO $$
DECLARE
  conflicts int;
BEGIN
  SELECT count(*) INTO conflicts
  FROM slug_repair r
  WHERE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.slug = r.new_slug AND p.id <> r.profile_id
    )
    OR EXISTS (
      SELECT 1 FROM public.photographers g
      WHERE g.id = r.new_slug AND g.id <> r.old_slug
    );
  IF conflicts > 0 THEN
    RAISE EXCEPTION 'Aborting: % repaired slug(s) collide with existing rows', conflicts;
  END IF;

  SELECT count(*) INTO conflicts
  FROM (SELECT new_slug FROM slug_repair GROUP BY new_slug HAVING count(*) > 1) d;
  IF conflicts > 0 THEN
    RAISE EXCEPTION 'Aborting: % duplicate target slug(s) within the repair set', conflicts;
  END IF;
END $$;

-- 3. Lift the immutability trigger (003) and the payouts FK for the remap.
DROP TRIGGER IF EXISTS profiles_slug_immutable ON public.profiles;
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_photographer_id_fkey;

-- 4. Remap every table keyed on the slug.
UPDATE public.photographers g
  SET id = r.new_slug FROM slug_repair r WHERE g.id = r.old_slug;

UPDATE public.photos ph
  SET photographer_id = r.new_slug FROM slug_repair r WHERE ph.photographer_id = r.old_slug;

UPDATE public.photographer_payment_methods m
  SET photographer_id = r.new_slug FROM slug_repair r WHERE m.photographer_id = r.old_slug;

UPDATE public.payout_requests q
  SET photographer_id = r.new_slug FROM slug_repair r WHERE q.photographer_id = r.old_slug;

UPDATE public.payouts o
  SET photographer_id = r.new_slug FROM slug_repair r WHERE o.photographer_id = r.old_slug;

UPDATE public.photographer_profiles pp
  SET user_id = r.new_slug FROM slug_repair r WHERE pp.user_id = r.old_slug;

UPDATE public.profiles p
  SET slug = r.new_slug FROM slug_repair r WHERE p.id = r.profile_id;

-- 5. Restore the FK and the immutability trigger.
ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_photographer_id_fkey
  FOREIGN KEY (photographer_id) REFERENCES public.photographers(id);

CREATE TRIGGER profiles_slug_immutable
  BEFORE UPDATE OF slug ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_slug_change();

COMMIT;
