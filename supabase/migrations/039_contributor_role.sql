-- ============================================================
-- 039_contributor_role.sql
--
-- Contributor becomes a role in its own right, alongside Photographer.
--
--   Photographer — sells work through the marketplace.
--   Contributor  — a member of the International Contributor & Photographic
--                  Acquisition Programme: everything a photographer does, plus
--                  a contributor ID, recognition level, direct acquisitions,
--                  agreements, bonuses and publication consideration.
--
-- Existing photographers are deliberately left as photographers. Admission to
-- the programme is a decision NS CAPTURES makes per person, not a bulk rename.
-- ============================================================

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
      AND pg_get_constraintdef(oid) ILIKE '%Photographer%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Buyer', 'Photographer', 'Contributor', 'Enterprise', 'Admin'));

-- A contributor needs the same photographer record a photographer has: the
-- marketplace, portfolios and payouts are all keyed by slug.
CREATE OR REPLACE FUNCTION public.ensure_creator_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_slug text;
BEGIN
  IF NEW.role NOT IN ('Photographer', 'Contributor') THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := trim(both '-' from
      lower(regexp_replace(COALESCE(NEW.name, ''), '[^a-zA-Z0-9]+', '-', 'g')));

    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'contributor';
    END IF;

    NEW.slug := base_slug || '-' || substr(NEW.id::text, 1, 8);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_creator_identity ON public.profiles;
CREATE TRIGGER trg_ensure_creator_identity
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_creator_identity();

NOTIFY pgrst, 'reload schema';
