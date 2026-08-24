-- ============================================================
-- 055_decline_agreement.sql
--
-- A contributor could sign an agreement or ignore it, and nothing else. The
-- UI has always been able to render a "Declined" state, but there was no way
-- to reach it: no button, and no function that would have let one work.
--
-- An agreement nobody may refuse is not really being agreed to. This is the
-- other half of sign_agreement, built the same way — SECURITY DEFINER, so the
-- contributor needs no write access to the table, and gated on the row being
-- theirs and still awaiting an answer, so it cannot overturn a signature or
-- touch anyone else's.
--
-- The reason is optional and gets its own column: agreements has no note
-- field, and plpgsql does not resolve column names until the function runs,
-- so a missing one would have failed only when a contributor first tried to
-- decline — the worst moment to discover it.
-- ============================================================

ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS declined_reason text;
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS declined_at timestamptz;

COMMENT ON COLUMN public.agreements.declined_reason IS
  'Why the contributor refused, in their words. Optional.';

CREATE OR REPLACE FUNCTION public.decline_agreement(
  p_agreement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.agreements
  WHERE id = p_agreement_id AND status = 'awaiting_signature'
  FOR UPDATE;

  -- Already answered, or not theirs to answer.
  IF NOT FOUND OR v_owner <> auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.agreements
  SET status = 'declined',
      declined_reason = NULLIF(btrim(coalesce(p_reason, '')), ''),
      declined_at = now()
  WHERE id = p_agreement_id;

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.decline_agreement(uuid, text) IS
  'Lets a contributor refuse an agreement that is still awaiting their signature. Records the optional reason in declined_reason.';

REVOKE ALL ON FUNCTION public.decline_agreement(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.decline_agreement(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
