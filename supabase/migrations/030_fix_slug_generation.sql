-- 030_fix_slug_generation.sql
-- Forward fix for the slug generator in handle_new_user.
--
-- 021 introduced two regressions against the 003/006/007 versions:
--   1. The character class was '[^a-z0-9]+' instead of '[^a-zA-Z0-9]+', and
--      lower() was applied AFTER regexp_replace. Every capital letter — i.e.
--      the first letter of each name part — was therefore replaced with '-'.
--      "Junghoon Sung" produced "-unghoon-ung"; an all-caps name produced an
--      empty base and a slug of just "--<id8>".
--   2. The trim(both '-' ...) / nullif() guard from 003 was dropped, so the
--      leading dash survived into the stored slug.
--
-- This restores correct generation and adds an email-local-part fallback so a
-- name with no alphanumerics can never yield an empty base again. Everything
-- else in the function is carried over from 021 unchanged.
--
-- This only affects accounts created from here on. Existing mangled slugs are
-- repaired separately in 031.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_name text;
  user_role text;
  user_slug text;
  base_slug text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'name', 'User');
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'Buyer');

  -- Generate slug for Photographers
  IF user_role = 'Photographer' THEN
    base_slug := trim(both '-' from
      lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g')));

    -- Fall back to the email local part, then to a constant, so the base is
    -- never empty (e.g. a name written entirely in non-Latin characters).
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := trim(both '-' from
        lower(regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1),
                             '[^a-zA-Z0-9]+', '-', 'g')));
    END IF;
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'photographer';
    END IF;

    user_slug := base_slug || '-' || substr(NEW.id::text, 1, 8);
  ELSE
    user_slug := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, name, email, role, slug, plan, avatar, member_since,
    downloads_left, verification_status, status
  ) VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_role,
    user_slug,
    'Starter',
    NULL,
    to_char(now(), 'Mon YYYY'),
    '10',
    'unverified',
    'Active'
  );

  -- Also create photographers row for Photographer role
  IF user_role = 'Photographer' THEN
    INSERT INTO public.photographers (id, name, avatar)
    VALUES (user_slug, user_name, NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
