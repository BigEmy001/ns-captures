-- ============================================================
-- 034_contributor_foundation.sql
--
-- Foundation for the NS CAPTURES contributor programme:
--   1. Contributor IDs (NSC-000184) on every photographer profile
--   2. Contributor registration fields (country, city, specialties)
--   3. Acquisition state on photos, for the submission statuses
--   4. contributor_earnings — the itemised ledger behind payout_balance
--   5. RPCs that keep the ledger and payout_balance in lockstep
--
-- Design note on money: profiles.payout_balance stays the single source of
-- truth for what a contributor can withdraw. contributor_earnings itemises
-- how that number was reached. Every write goes through the SECURITY DEFINER
-- functions below so the two can never drift.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTRIBUTOR ID
-- ------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contributor_id text UNIQUE;

-- Starts at 184 so the first assigned ID matches the NSC-000184 format the
-- programme documents use as their worked example.
CREATE SEQUENCE IF NOT EXISTS public.contributor_id_seq START WITH 184;

CREATE OR REPLACE FUNCTION public.next_contributor_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'NSC-' || lpad(nextval('public.contributor_id_seq')::text, 6, '0');
$$;

-- Assign on admission to the programme, and keep the ID for life: a
-- contributor who is later suspended or changes role keeps the same reference,
-- because it appears on their agreements and payment statements. Photographers
-- who sell on the marketplace without being in the programme have no NSC ID.
CREATE OR REPLACE FUNCTION public.assign_contributor_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role = 'Contributor' AND NEW.contributor_id IS NULL THEN
    NEW.contributor_id := public.next_contributor_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_contributor_id ON public.profiles;
CREATE TRIGGER trg_assign_contributor_id
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_contributor_id();

-- Backfill anyone already in the programme, oldest-first, so the earliest
-- contributors hold the lowest reference numbers.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
    WHERE role = 'Contributor' AND contributor_id IS NULL
    ORDER BY created_at NULLS LAST, id
  LOOP
    UPDATE public.profiles
    SET contributor_id = public.next_contributor_id()
    WHERE id = r.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. CONTRIBUTOR REGISTRATION FIELDS
-- ------------------------------------------------------------
-- profiles already carries name, email, phone, dob, occupation, bio and
-- location. The programme also asks for country, city and multi-select
-- photography specialties.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}';

-- ------------------------------------------------------------
-- 3. SUBMISSION / ACQUISITION STATE ON PHOTOS
-- ------------------------------------------------------------
-- photos.status already covers the review lifecycle
-- (draft / pending_review / published / rejected). Acquisition is orthogonal:
-- a photograph can be published on the marketplace AND acquired. Keeping it in
-- its own column means an acquisition never removes a photo from the gallery.

ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS acquisition_state text;

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.photos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%acquisition_state%'
  LOOP
    EXECUTE format('ALTER TABLE public.photos DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_acquisition_state_check
  CHECK (acquisition_state IS NULL OR acquisition_state IN ('review', 'acquired'));

CREATE INDEX IF NOT EXISTS idx_photos_acquisition_state
  ON public.photos (acquisition_state)
  WHERE acquisition_state IS NOT NULL;

-- ------------------------------------------------------------
-- 4. CONTRIBUTOR EARNINGS LEDGER
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contributor_earnings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('licensing', 'acquisition', 'bonus', 'award', 'adjustment')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid', 'cancelled')),
  photo_id      text REFERENCES public.photos(id) ON DELETE SET NULL,
  reference     text,
  description   text,
  gross_amount  numeric NOT NULL DEFAULT 0,
  platform_fee  numeric NOT NULL DEFAULT 0,
  net_amount    numeric NOT NULL,
  currency      text NOT NULL DEFAULT 'GBP',
  payout_request_id uuid REFERENCES public.payout_requests(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  available_at  timestamptz,
  paid_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contributor_earnings_user
  ON public.contributor_earnings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_earnings_status
  ON public.contributor_earnings (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributor_earnings_reference
  ON public.contributor_earnings (reference)
  WHERE reference IS NOT NULL;

ALTER TABLE public.contributor_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contributors read own earnings" ON public.contributor_earnings;
CREATE POLICY "Contributors read own earnings"
  ON public.contributor_earnings FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Writes only ever happen through the SECURITY DEFINER functions below.
DROP POLICY IF EXISTS "Service role writes earnings" ON public.contributor_earnings;
CREATE POLICY "Service role writes earnings"
  ON public.contributor_earnings FOR INSERT
  WITH CHECK (true);

GRANT SELECT ON public.contributor_earnings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contributor_earnings TO service_role;

-- ------------------------------------------------------------
-- 5. LEDGER RPCs
-- ------------------------------------------------------------

-- Record an earning. When p_status is 'available' the contributor's
-- payout_balance is credited in the same transaction, so the ledger and the
-- balance can never disagree. 'pending' records money that is earned but not
-- yet clear (an unapproved sale, an unpaid acquisition).
CREATE OR REPLACE FUNCTION public.record_contributor_earning(
  p_user_id      uuid,
  p_type         text,
  p_net_amount   numeric,
  p_gross_amount numeric DEFAULT NULL,
  p_platform_fee numeric DEFAULT 0,
  p_photo_id     text DEFAULT NULL,
  p_reference    text DEFAULT NULL,
  p_description  text DEFAULT NULL,
  p_status       text DEFAULT 'available',
  p_admin_id     uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.contributor_earnings (
    user_id, type, status, photo_id, reference, description,
    gross_amount, platform_fee, net_amount, available_at
  )
  VALUES (
    p_user_id, p_type, p_status, p_photo_id, p_reference, p_description,
    COALESCE(p_gross_amount, p_net_amount), COALESCE(p_platform_fee, 0), p_net_amount,
    CASE WHEN p_status = 'available' THEN now() ELSE NULL END
  )
  ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  -- Reference already recorded: this is a replay, not a new earning.
  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_status = 'available' AND p_net_amount <> 0 THEN
    PERFORM public.adjust_payout_balance(
      p_user_id, p_net_amount, COALESCE(p_description, p_type || ' earning'), p_admin_id
    );
  END IF;

  RETURN v_id;
END;
$$;

-- Clear a pending earning: credits the balance and stamps it available.
CREATE OR REPLACE FUNCTION public.mark_earning_available(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.contributor_earnings%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.contributor_earnings
  WHERE reference = p_reference AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.contributor_earnings
  SET status = 'available', available_at = now()
  WHERE id = v_row.id;

  IF v_row.net_amount <> 0 THEN
    PERFORM public.adjust_payout_balance(
      v_row.user_id, v_row.net_amount,
      COALESCE(v_row.description, 'Earning cleared: ' || p_reference)
    );
  END IF;

  RETURN true;
END;
$$;

-- Cancel a pending earning (a rejected sale). Only pending rows can be
-- cancelled — cleared money has already moved into the balance.
CREATE OR REPLACE FUNCTION public.cancel_earning(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.contributor_earnings
  SET status = 'cancelled'
  WHERE reference = p_reference AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Settle a completed payout against the ledger, oldest earnings first, so each
-- line shows as Paid once the money has actually gone out.
CREATE OR REPLACE FUNCTION public.settle_earnings_for_payout(
  p_user_id           uuid,
  p_amount            numeric,
  p_payout_request_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remaining numeric := p_amount;
  r           record;
BEGIN
  FOR r IN
    SELECT id, net_amount FROM public.contributor_earnings
    WHERE user_id = p_user_id AND status = 'available'
    ORDER BY available_at NULLS LAST, created_at
  LOOP
    EXIT WHEN v_remaining <= 0;

    UPDATE public.contributor_earnings
    SET status = 'paid', paid_at = now(), payout_request_id = p_payout_request_id
    WHERE id = r.id;

    v_remaining := v_remaining - r.net_amount;
  END LOOP;

  RETURN v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_contributor_earning(uuid, text, numeric, numeric, numeric, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_earning_available(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_earning(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settle_earnings_for_payout(uuid, numeric, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
