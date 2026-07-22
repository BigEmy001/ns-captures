-- 027_add_local_bank_method.sql
-- Add 'local_bank' to the CHECK constraints on method columns
-- so photographers can save local bank payment methods and request payouts via local bank

-- Fix photographer_payment_methods: add 'local_bank' to allowed methods
ALTER TABLE public.photographer_payment_methods
  DROP CONSTRAINT IF EXISTS photographer_payment_methods_method_check;
ALTER TABLE public.photographer_payment_methods
  ADD CONSTRAINT photographer_payment_methods_method_check
  CHECK (method in ('card', 'local_bank', 'crypto', 'paypal'));

-- Fix payout_requests: add 'local_bank' to allowed methods
ALTER TABLE public.payout_requests
  DROP CONSTRAINT IF EXISTS payout_requests_method_check;
ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_method_check
  CHECK (method in ('card', 'local_bank', 'crypto', 'paypal'));
