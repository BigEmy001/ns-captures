-- ============================================================
-- 083_minting_fee_activities.sql
--
-- Update edition_activities check constraint to permit 'mint_fee_paid'
-- type for platform minting fee collection and treasury records.
-- ============================================================

ALTER TABLE public.edition_activities DROP CONSTRAINT IF EXISTS edition_activities_type_check;

ALTER TABLE public.edition_activities ADD CONSTRAINT edition_activities_type_check
  CHECK (type IN ('minted', 'listed', 'purchased', 'transferred', 'royalty_paid', 'mint_fee_paid'));

COMMENT ON CONSTRAINT edition_activities_type_check ON public.edition_activities IS
  'Allowed activity types including provenance events and platform minting fee transactions.';

