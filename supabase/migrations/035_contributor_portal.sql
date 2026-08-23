-- ============================================================
-- 035_contributor_portal.sql
--
-- Tables behind the contributor portal pages: direct acquisitions,
-- agreements, publication entries, and contributor recognition level.
--
-- Depends on 034_contributor_foundation.sql (contributor_earnings, and the
-- acquisition_state column on photos).
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTRIBUTOR LEVEL
-- ------------------------------------------------------------
-- Recognition status shown on the dashboard and the public profile.
-- Admin-controlled; every contributor starts as International.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contributor_level text DEFAULT 'international';

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%contributor_level%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_contributor_level_check
  CHECK (contributor_level IN ('international', 'featured', 'collection'));

-- ------------------------------------------------------------
-- 2. DIRECT ACQUISITIONS
-- ------------------------------------------------------------
-- An acquisition is a specific offer on a specific photograph. Uploading,
-- approving or featuring a photograph never creates one: it exists only when
-- NS CAPTURES decides to acquire rights, and it carries its own terms.

CREATE SEQUENCE IF NOT EXISTS public.acquisition_ref_seq START WITH 124;

CREATE OR REPLACE FUNCTION public.next_acquisition_reference()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'ACQ-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.acquisition_ref_seq')::text, 5, '0');
$$;

CREATE TABLE IF NOT EXISTS public.acquisitions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text UNIQUE NOT NULL DEFAULT public.next_acquisition_reference(),
  photo_id       text REFERENCES public.photos(id) ON DELETE SET NULL,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  category       text NOT NULL DEFAULT 'standard'
                 CHECK (category IN ('standard', 'premium', 'signature', 'exceptional')),
  amount         numeric NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'GBP',

  -- Deliberately explicit: a licence and an assignment are different things,
  -- and only what is named here is granted.
  rights         text NOT NULL DEFAULT 'non_exclusive'
                 CHECK (rights IN ('non_exclusive', 'exclusive', 'assignment')),
  territory      text DEFAULT 'Worldwide',
  term           text,
  permitted_uses text,
  attribution    text,

  status         text NOT NULL DEFAULT 'under_consideration'
                 CHECK (status IN (
                   'under_consideration', 'offer_made', 'awaiting_contributor',
                   'agreement_pending', 'agreement_signed', 'payment_pending',
                   'paid', 'declined', 'cancelled'
                 )),

  selection_note text,
  offered_at     timestamptz,
  responded_at   timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acquisitions_user ON public.acquisitions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acquisitions_status ON public.acquisitions (status);

ALTER TABLE public.acquisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contributors read own acquisitions" ON public.acquisitions;
CREATE POLICY "Contributors read own acquisitions"
  ON public.acquisitions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Admins write acquisitions" ON public.acquisitions;
CREATE POLICY "Admins write acquisitions"
  ON public.acquisitions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT ON public.acquisitions TO authenticated;
GRANT ALL ON public.acquisitions TO service_role;

-- ------------------------------------------------------------
-- 3. AGREEMENTS
-- ------------------------------------------------------------
-- The body column stores the exact text the contributor was shown. When a
-- template is later revised, previously signed agreements keep the wording
-- that was actually agreed rather than picking up the new version.

CREATE TABLE IF NOT EXISTS public.agreements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text UNIQUE NOT NULL,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acquisition_id uuid REFERENCES public.acquisitions(id) ON DELETE SET NULL,

  kind           text NOT NULL
                 CHECK (kind IN ('contributor', 'acquisition', 'publication', 'marketplace_licence', 'bonus')),
  title          text NOT NULL,
  version        text NOT NULL DEFAULT '1.0',
  body           text,

  status         text NOT NULL DEFAULT 'awaiting_signature'
                 CHECK (status IN ('awaiting_signature', 'signed', 'active', 'declined', 'terminated')),

  -- Signature record. Kept alongside the body so what was signed, by whom and
  -- when can be reconstructed from one row.
  signed_name    text,
  signed_at      timestamptz,
  signed_ip      text,

  effective_date date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreements_user ON public.agreements (user_id, created_at DESC);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contributors read own agreements" ON public.agreements;
CREATE POLICY "Contributors read own agreements"
  ON public.agreements FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- A contributor may sign their own agreement; the signing RPC below is what
-- the app actually calls, and it refuses to alter anything except the
-- signature fields.
DROP POLICY IF EXISTS "Admins write agreements" ON public.agreements;
CREATE POLICY "Admins write agreements"
  ON public.agreements FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT ON public.agreements TO authenticated;
GRANT ALL ON public.agreements TO service_role;

-- Records a contributor's acceptance. Only the signature fields move, and only
-- on an agreement that belongs to the caller and is still awaiting signature.
CREATE OR REPLACE FUNCTION public.sign_agreement(
  p_agreement_id uuid,
  p_signed_name  text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.agreements
  WHERE id = p_agreement_id AND status = 'awaiting_signature'
  FOR UPDATE;

  IF NOT FOUND OR v_owner <> auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.agreements
  SET status = 'signed',
      signed_name = p_signed_name,
      signed_at = now()
  WHERE id = p_agreement_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_agreement(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 4. PUBLICATION ENTRIES
-- ------------------------------------------------------------
-- One row per photograph considered for a curated collection or publication.

CREATE TABLE IF NOT EXISTS public.publication_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_id        text REFERENCES public.photos(id) ON DELETE SET NULL,
  collection_name text NOT NULL,
  edition         text,
  status          text NOT NULL DEFAULT 'under_consideration'
                  CHECK (status IN ('under_consideration', 'shortlisted', 'selected', 'published', 'not_selected')),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publication_entries_user
  ON public.publication_entries (user_id, created_at DESC);

ALTER TABLE public.publication_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contributors read own publication entries" ON public.publication_entries;
CREATE POLICY "Contributors read own publication entries"
  ON public.publication_entries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Admins write publication entries" ON public.publication_entries;
CREATE POLICY "Admins write publication entries"
  ON public.publication_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT ON public.publication_entries TO authenticated;
GRANT ALL ON public.publication_entries TO service_role;

NOTIFY pgrst, 'reload schema';
