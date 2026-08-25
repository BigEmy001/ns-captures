-- ============================================================
-- 059_respond_to_acquisition.sql
--
-- "Awaiting You" was a status nothing on the contributor's side could move.
-- The card told them the offer was waiting on their response and gave them
-- expand and collapse.
--
-- In practice the binding answer comes through the agreement issued at
-- agreement_pending, which they can now sign or decline. But that leaves an
-- offer they have not yet been sent an agreement for with no way to say either
-- yes or no, and an admin with no way to tell the difference between someone
-- thinking about it and someone who never opened it.
--
-- Built the way decline_agreement is: SECURITY DEFINER, so the contributor
-- needs no write access to a table that holds prices, and gated on the row
-- being theirs and still open to an answer. Accepting moves it to
-- agreement_pending — the contributor agreeing in principle is what prompts
-- the agreement, and nothing is transferred until that agreement is signed.
-- ============================================================

ALTER TABLE public.acquisitions ADD COLUMN IF NOT EXISTS response_note text;

COMMENT ON COLUMN public.acquisitions.response_note IS
  'What the contributor said when they answered the offer, in their words. Optional.';

CREATE OR REPLACE FUNCTION public.respond_to_acquisition(
  p_acquisition_id uuid,
  p_accept boolean,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_owner  uuid;
  v_status text;
BEGIN
  SELECT user_id, status INTO v_owner, v_status
  FROM public.acquisitions
  WHERE id = p_acquisition_id
  FOR UPDATE;

  IF NOT FOUND OR v_owner <> auth.uid() THEN
    RETURN false;
  END IF;

  -- Only an offer actually put to them can be answered. Anything already
  -- agreed, paid, withdrawn or still under consideration is not theirs to move.
  IF v_status NOT IN ('offer_made', 'awaiting_contributor') THEN
    RETURN false;
  END IF;

  UPDATE public.acquisitions
  SET status = CASE WHEN p_accept THEN 'agreement_pending' ELSE 'declined' END,
      response_note = NULLIF(btrim(coalesce(p_note, '')), ''),
      responded_at = now()
  WHERE id = p_acquisition_id;

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.respond_to_acquisition(uuid, boolean, text) IS
  'Lets a contributor accept or refuse an acquisition offer that has been put to them. Accepting moves it to agreement_pending; nothing is transferred until the agreement is signed.';

REVOKE ALL ON FUNCTION public.respond_to_acquisition(uuid, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.respond_to_acquisition(uuid, boolean, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
