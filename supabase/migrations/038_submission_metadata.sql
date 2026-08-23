-- ============================================================
-- 038_submission_metadata.sql
--
-- What the contributor programme asks for at upload but the platform never
-- collected: a description, releases where recognisable people or property
-- appear, and a recorded copyright declaration.
--
-- Review notes are also surfaced back to the contributor, so a declined
-- submission can say why.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SUBMISSION METADATA
-- ------------------------------------------------------------

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS model_release text,
  ADD COLUMN IF NOT EXISTS property_release text,
  ADD COLUMN IF NOT EXISTS copyright_declared_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

COMMENT ON COLUMN public.photos.model_release IS
  'none | not_required | held — whether a model release exists for recognisable people.';
COMMENT ON COLUMN public.photos.property_release IS
  'none | not_required | held — whether a property release exists.';
COMMENT ON COLUMN public.photos.copyright_declared_at IS
  'When the contributor confirmed they are the creator or authorised rights holder. Submission is blocked without it.';
COMMENT ON COLUMN public.photos.review_note IS
  'The reviewer''s note, shown to the contributor on a declined or approved submission.';

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.photos'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%model_release%'
        OR pg_get_constraintdef(oid) ILIKE '%property_release%')
  LOOP
    EXECUTE format('ALTER TABLE public.photos DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_model_release_check
  CHECK (model_release IS NULL OR model_release IN ('none', 'not_required', 'held'));

ALTER TABLE public.photos
  ADD CONSTRAINT photos_property_release_check
  CHECK (property_release IS NULL OR property_release IN ('none', 'not_required', 'held'));

-- Existing photographs predate the declaration; leaving these null records
-- honestly that no declaration was captured, rather than inventing one.

NOTIFY pgrst, 'reload schema';
