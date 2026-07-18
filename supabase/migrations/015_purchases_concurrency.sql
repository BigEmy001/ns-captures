-- ============================================================
-- Add idempotency constraint to prevent duplicate purchases
-- ============================================================

-- This partial unique index ensures that a user cannot have two 'PENDING' 
-- purchases for the exact same photo and license at the same time.
-- This effectively mitigates the double-click/concurrent request race condition.

CREATE UNIQUE INDEX IF NOT EXISTS purchases_pending_idempotency_idx 
ON public.purchases (user_id, photo_id, license) 
WHERE status = 'PENDING';

-- ============================================================
-- Secure purchases UPDATE policy for Admins
-- ============================================================

-- Ensure only users with the 'Admin' role can update the purchases table
-- (which is required to approve or reject a purchase).

DROP POLICY IF EXISTS "Admins can update purchases" ON public.purchases;
CREATE POLICY "Admins can update purchases"
  ON public.purchases FOR UPDATE
  USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin'));

-- Ensure service_role can still manage everything
-- (Handled by Supabase defaults, but good practice to verify)
