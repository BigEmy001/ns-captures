-- ============================================================
-- 078_editorial_spotlight.sql
--
-- Editorial spotlight for Photographer of the Week on the homepage.
-- Stores the featured photographer, their spotlighted photograph,
-- and the narrative story behind the shot.
-- ============================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS featured_spotlight_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured_photographer_id text,
  ADD COLUMN IF NOT EXISTS featured_photo_id text,
  ADD COLUMN IF NOT EXISTS featured_spotlight_headline text NOT NULL DEFAULT 'Photographer of the Week',
  ADD COLUMN IF NOT EXISTS featured_spotlight_title text,
  ADD COLUMN IF NOT EXISTS featured_photo_story text,
  ADD COLUMN IF NOT EXISTS featured_photographer_quote text;

-- Seed initial spotlight with Junghoon Sung's Workshop After Hours
UPDATE public.site_settings
SET
  featured_spotlight_active = true,
  featured_photographer_id = 'junghoon-sung-e85d599d',
  featured_photo_id = 'upload-1787495107835',
  featured_spotlight_headline = 'Photographer of the Week',
  featured_spotlight_title = 'Workshop After Hours — Nocturnal Seoul',
  featured_photo_story = 'Captured at 2:00 AM in a quiet industrial alleyway of Euljiro, Seoul. The late night mist mixed with incandescent tungsten light, illuminating decades of metalcraft machinery and quiet dedication long after the city went to sleep.',
  featured_photographer_quote = 'Photography to me is about finding the moments of quiet poetry in the midst of relentless urban motion.'
WHERE id = 1;

NOTIFY pgrst, 'reload schema';
