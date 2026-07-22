-- 026_expanded_bank_config.sql
-- Expand admin_payment_methods.details from text to jsonb
-- and migrate existing data

-- Convert details column from text to jsonb
ALTER TABLE public.admin_payment_methods
  ALTER COLUMN details TYPE jsonb
  USING CASE
    WHEN details IS NULL OR details = '' THEN '{}'::jsonb
    WHEN details ~ '^\{.*\}$' THEN details::jsonb
    ELSE json_build_object('raw', details)::jsonb
  END;

-- Set default
ALTER TABLE public.admin_payment_methods
  ALTER COLUMN details SET DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.admin_payment_methods.details IS 'Structured payment details as JSONB. For bank: {recipientName, recipientAddress, bankName, bankAddress, swift, iban, accountNumber, routingCode, routingType, intermediarySwift, intermediaryName, currency}. For crypto: {walletAddress, currency, network}. For paypal: {email}.';
