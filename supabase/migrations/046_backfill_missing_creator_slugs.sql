-- ============================================================
-- 046_backfill_missing_creator_slugs.sql
--
-- Two photographers created before the slug trigger existed have no slug.
-- Everything a creator owns is keyed by it — portfolio, payouts, licensed
-- work, payment methods — so without one their account is inert: they can
-- sign in and see nothing of their own.
--
-- Uses the same shape as handle_new_user and ensure_creator_identity, so a
-- backfilled slug is indistinguishable from a generated one.
-- ============================================================

DO $$
DECLARE
  r          record;
  base_slug  text;
  new_slug   text;
BEGIN
  FOR r IN
    SELECT id, name, email
    FROM public.profiles
    WHERE role IN ('Photographer', 'Contributor')
      AND (slug IS NULL OR slug = '')
  LOOP
    base_slug := trim(both '-' from
      lower(regexp_replace(COALESCE(r.name, ''), '[^a-zA-Z0-9]+', '-', 'g')));

    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := trim(both '-' from
        lower(regexp_replace(split_part(COALESCE(r.email, ''), '@', 1),
                             '[^a-zA-Z0-9]+', '-', 'g')));
    END IF;

    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'contributor';
    END IF;

    new_slug := base_slug || '-' || substr(r.id::text, 1, 8);

    UPDATE public.profiles SET slug = new_slug WHERE id = r.id;

    -- The marketplace reads photographers by slug, so the row has to exist.
    INSERT INTO public.photographers (id, name)
    VALUES (new_slug, COALESCE(r.name, 'Photographer'))
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'slug assigned: % -> %', r.name, new_slug;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
