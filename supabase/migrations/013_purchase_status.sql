-- ============================================================
-- Add status column to purchases
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='purchases' AND column_name='status'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN status text DEFAULT 'PENDING';
  END IF;
END $$;
