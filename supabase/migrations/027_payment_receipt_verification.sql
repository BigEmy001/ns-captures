-- Add payment receipt and payment method columns to verification_documents
ALTER TABLE public.verification_documents ADD COLUMN IF NOT EXISTS payment_receipt_url text;
ALTER TABLE public.verification_documents ADD COLUMN IF NOT EXISTS payment_method_name text;

-- Add receipt_url to purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS receipt_url text;
