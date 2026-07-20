-- 023_balance_ledger_and_atomic_update.sql
-- Atomic balance adjustment function + ledger table for audit trail

-- 1. Ledger table to record every balance adjustment with reason/note
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Only admins can read; inserts are done via function (security definer)
CREATE POLICY "Admins can read balance_adjustments"
  ON public.balance_adjustments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Service role can insert balance_adjustments"
  ON public.balance_adjustments FOR INSERT
  WITH CHECK (true);

-- 2. Atomic RPC function: adjusts payout_balance and logs to ledger
CREATE OR REPLACE FUNCTION public.adjust_payout_balance(
  p_user_id UUID,
  p_adjustment NUMERIC,
  p_reason TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current NUMERIC;
  v_new NUMERIC;
BEGIN
  -- Lock the row to prevent concurrent read-then-write races
  SELECT payout_balance INTO v_current
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_new := COALESCE(v_current, 0) + p_adjustment;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Balance cannot go below zero (current: %, adjustment: %)', v_current, p_adjustment;
  END IF;

  UPDATE public.profiles
  SET payout_balance = v_new
  WHERE id = p_user_id;

  INSERT INTO public.balance_adjustments (user_id, admin_id, amount, balance_after, reason)
  VALUES (p_user_id, p_admin_id, p_adjustment, v_new, p_reason);

  RETURN v_new;
END;
$$;

-- Grant execute to authenticated users (admin-only enforced in app + RLS)
GRANT EXECUTE ON FUNCTION public.adjust_payout_balance(UUID, NUMERIC, TEXT, UUID) TO authenticated;
