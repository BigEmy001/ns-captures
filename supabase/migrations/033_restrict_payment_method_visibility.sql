-- 033_restrict_payment_method_visibility.sql
-- Payout details are readable by the public.
--
-- 002 created photographer_payment_methods with:
--     create policy "Payment methods viewable by everyone"
--       on public.photographer_payment_methods for select using (true);
--
-- Combined with the anon grant, that means the anon key shipped inside the
-- public frontend bundle can read every photographer's payout details -
-- crypto wallet addresses, PayPal emails and bank fields - without logging in.
-- Verified against production: 11 rows readable unauthenticated.
--
-- No application code needs public read. Both readers are authenticated-only:
-- fetchPaymentMethods() is called from the admin panel and from the creator's
-- own settings tab, and fetchAllPaymentMethods() is called only from the admin
-- panel's payments tab. Nothing on a public page touches this table.
--
-- Restrict SELECT to the owning photographer and to admins. The existing
-- "Photographers can manage own payment methods" and "Admins can manage all
-- payment methods" FOR ALL policies already cover write access.

DROP POLICY IF EXISTS "Payment methods viewable by everyone"
  ON public.photographer_payment_methods;

CREATE POLICY "Owner or admin can view payment methods"
  ON public.photographer_payment_methods FOR SELECT
  USING (
    photographer_id = (SELECT slug FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Revoke the anon grant outright: no unauthenticated flow uses this table.
REVOKE ALL ON public.photographer_payment_methods FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographer_payment_methods TO authenticated;
