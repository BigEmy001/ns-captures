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
  ADD COLUMN IF NOT EXISTS converted_amount numeric;

COMMENT ON COLUMN public.payout_requests.conversion_rate IS
  'Units of payout_currency per 1 GBP, as applied at conversion time.';
COMMENT ON COLUMN public.payout_requests.conversion_fee_percent IS
  'Conversion charge applied to the converted amount. Platform default is 3.7%.';
COMMENT ON COLUMN public.payout_requests.converted_amount IS
  'What the contributor receives in payout_currency, after the conversion charge.';

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
