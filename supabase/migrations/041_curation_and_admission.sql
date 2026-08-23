-- ============================================================
-- 041_curation_and_admission.sql
--
-- The last pieces of admin the programme brief asks for:
--   * featuring a photograph
--   * curating marketplace collections
--   * turning an approved application into an actual account
-- ============================================================

-- ------------------------------------------------------------
-- 1. FEATURING A PHOTOGRAPH
-- ------------------------------------------------------------

ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS featured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_photos_featured
  ON public.photos (featured_at DESC)
  WHERE featured;

-- ------------------------------------------------------------
-- 2. COLLECTION CURATION
-- ------------------------------------------------------------
-- The collections table predates this and has no ownership or timestamps,
-- which makes an admin list of them hard to order or attribute.

ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Admins curate; everyone reads. The original policies only covered reading.
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections are viewable by everyone" ON public.collections;
CREATE POLICY "Collections are viewable by everyone"
  ON public.collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins curate collections" ON public.collections;
CREATE POLICY "Admins curate collections"
  ON public.collections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

ALTER TABLE public.collection_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collection contents are viewable by everyone" ON public.collection_photos;
CREATE POLICY "Collection contents are viewable by everyone"
  ON public.collection_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins curate collection contents" ON public.collection_photos;
CREATE POLICY "Admins curate collection contents"
  ON public.collection_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO authenticated, service_role;
GRANT SELECT ON public.collection_photos TO anon, authenticated;
GRANT ALL ON public.collection_photos TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3. APPLICATION TO ACCOUNT
-- ------------------------------------------------------------
-- Approving an application creates the contributor's account. Recording which
-- account it produced keeps the two connected, and stops a second approval
-- creating a duplicate.

ALTER TABLE public.contributor_submissions
  ADD COLUMN IF NOT EXISTS created_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_created_at timestamptz;

NOTIFY pgrst, 'reload schema';
