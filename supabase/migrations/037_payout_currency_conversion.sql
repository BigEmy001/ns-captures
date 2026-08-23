-- ============================================================
-- 037_payout_currency_conversion.sql
--
-- Contributors are paid in their own currency. The default comes from the
-- country they registered from; the contributor or an admin can override it.
-- When a payout is converted, the rate and charge applied are recorded on the
-- request so the contributor can see exactly how the figure was reached.
--
-- Depends on 036_payout_timeline.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. THE CONTRIBUTOR'S PAYOUT CURRENCY
-- ------------------------------------------------------------
-- Null means "use the currency of my country", resolved in the application so
-- that moving country updates the default without rewriting stored data.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_currency text;

-- ------------------------------------------------------------
-- 2. CONVERSION APPLIED TO A PAYOUT
-- ------------------------------------------------------------

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS payout_currency text,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric,
  ADD COLUMN IF NOT EXISTS conversion_fee_percent numeric,
  ADD COLUMN IF NOT EXISTS conversion_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS conversion_fee_bearer text,
  ADD COLUMN IF NOT EXISTS conversion_fee_gbp numeric,
  ADD COLUMN IF NOT EXISTS conversion_fee_status text,
  ADD COLUMN IF NOT EXISTS conversion_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_fee_receipt_url text,
  ADD COLUMN IF NOT EXISTS conversion_fee_method text,
  ADD COLUMN IF NOT EXISTS converted_amount numeric;

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.payout_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%conversion_fee_bearer%'
  LOOP
    EXECUTE format('ALTER TABLE public.payout_requests DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_fee_bearer_check
  CHECK (conversion_fee_bearer IS NULL OR conversion_fee_bearer IN ('contributor', 'company'));

ALTER TABLE public.payout_requests
  DROP CONSTRAINT IF EXISTS payout_requests_fee_status_check;

ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_fee_status_check
  CHECK (conversion_fee_status IS NULL
      OR conversion_fee_status IN ('outstanding', 'paid', 'waived'));

COMMENT ON COLUMN public.payout_requests.conversion_rate IS
  'Units of payout_currency per 1 GBP, as applied at conversion time.';
COMMENT ON COLUMN public.payout_requests.conversion_fee_percent IS
  'Conversion charge applied to the converted amount. Platform default is 3.7%.';
COMMENT ON COLUMN public.payout_requests.conversion_fee_bearer IS
  'contributor = the charge comes out of their payout; company = NS CAPTURES absorbs it and the contributor receives the full converted amount.';
COMMENT ON COLUMN public.payout_requests.conversion_fee_status IS
  'outstanding = the contributor owes the charge separately; paid = settled; waived = NS CAPTURES absorbed it.';
COMMENT ON COLUMN public.payout_requests.converted_amount IS
  'What the contributor receives in payout_currency. The conversion charge is never taken out of this.';

-- ------------------------------------------------------------
-- 3. THE DEFAULT CHARGE
-- ------------------------------------------------------------
-- Held in site settings so finance can change it without a deploy. The admin
-- can still override it on an individual conversion.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS conversion_fee_percent numeric DEFAULT 3.7;

UPDATE public.site_settings
SET conversion_fee_percent = 3.7
WHERE conversion_fee_percent IS NULL;

NOTIFY pgrst, 'reload schema';
