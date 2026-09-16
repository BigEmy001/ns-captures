-- ============================================================
-- 084_nsc_presale.sql
--
-- Tables and RLS policies for the NSC Token Presale & Treasury Intake
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nsc_presale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  coin_paid TEXT NOT NULL,
  network TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  nsc_amount NUMERIC NOT NULL,
  rate_usd NUMERIC NOT NULL DEFAULT 1.0,
  fiat_value_usd NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by user and creation order
CREATE INDEX IF NOT EXISTS idx_nsc_presale_orders_user_id ON public.nsc_presale_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_nsc_presale_orders_created_at ON public.nsc_presale_orders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.nsc_presale_orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own presale purchases
CREATE POLICY "Users can read own presale orders"
  ON public.nsc_presale_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all presale orders
CREATE POLICY "Admins can read all presale orders"
  ON public.nsc_presale_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'Admin' OR profiles.role = 'admin')
    )
  );

-- Allow authenticated users to insert presale orders
CREATE POLICY "Users can insert presale orders"
  ON public.nsc_presale_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT ON public.nsc_presale_orders TO authenticated;
GRANT SELECT ON public.nsc_presale_orders TO anon;

