-- ============================================================
-- 036_payout_timeline.sql
--
-- A payout moves through ten stages, and the contributor can see where theirs
-- has got to. payout_requests.status stays as the coarse state the rest of the
-- platform already reads; stage is the detailed position, and payout_events is
-- the dated trail behind it.
-- ============================================================

-- ------------------------------------------------------------
-- 1. STAGE ON THE REQUEST
-- ------------------------------------------------------------

ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS stage text DEFAULT 'requested';

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.payout_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%stage%'
  LOOP
    EXECUTE format('ALTER TABLE public.payout_requests DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_stage_check
  CHECK (stage IN (
    'requested',
    'under_review',
    'approved',
    'processing',
    'currency_conversion',
    'network_processing',
    'intermediary_processing',
    'recipient_bank_processing',
    'delivered',
    'completed',
    'rejected',
    'cancelled'
  ));

-- Existing requests get the stage that matches the status they already hold.
UPDATE public.payout_requests
SET stage = CASE status
  WHEN 'PAID' THEN 'completed'
  WHEN 'APPROVED' THEN 'approved'
  WHEN 'REJECTED' THEN 'rejected'
  ELSE 'requested'
END
WHERE stage IS NULL OR stage = 'requested';

CREATE INDEX IF NOT EXISTS idx_payout_requests_stage ON public.payout_requests (stage);

-- ------------------------------------------------------------
-- 2. THE TRAIL
-- ------------------------------------------------------------
-- One row per stage the payout actually reached, so the contributor sees when
-- each step happened rather than just where it is now.

CREATE TABLE IF NOT EXISTS public.payout_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  stage             text NOT NULL,
  note              text,
  notified          boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_events_request
  ON public.payout_events (payout_request_id, created_at);

ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;

-- A contributor sees the trail for their own payouts. payout_requests keys the
-- photographer by profile slug, so the check joins through profiles.
DROP POLICY IF EXISTS "Contributors read own payout events" ON public.payout_events;
CREATE POLICY "Contributors read own payout events"
  ON public.payout_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.payout_requests r
      JOIN public.profiles p ON p.slug = r.photographer_id
      WHERE r.id = payout_events.payout_request_id
        AND p.id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Admins write payout events" ON public.payout_events;
CREATE POLICY "Admins write payout events"
  ON public.payout_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT ON public.payout_events TO authenticated;
GRANT ALL ON public.payout_events TO service_role;

-- Seed the trail for payouts that already exist, so their timelines are not
-- blank. One entry, dated when the request was made.
INSERT INTO public.payout_events (payout_request_id, stage, note, created_at)
SELECT r.id, 'requested', 'Withdrawal request submitted.', r.requested_at
FROM public.payout_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM public.payout_events e WHERE e.payout_request_id = r.id
);

NOTIFY pgrst, 'reload schema';
