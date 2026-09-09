-- Migration 079: Web3 Waitlist and Site Settings toggle

-- 1. Add web3_waitlist_enabled column to site_settings if not exists
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS web3_waitlist_enabled BOOLEAN DEFAULT true;

UPDATE site_settings
SET web3_waitlist_enabled = true
WHERE web3_waitlist_enabled IS NULL;

-- 2. Add wallet_address to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- 3. Create web3_waitlist table
CREATE TABLE IF NOT EXISTS web3_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'collector',
  wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup and ordering
CREATE INDEX IF NOT EXISTS idx_web3_waitlist_email ON web3_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_web3_waitlist_created_at ON web3_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web3_waitlist_status ON web3_waitlist(status);

-- Enable RLS
ALTER TABLE web3_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public / anon users to submit an entry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'web3_waitlist' AND policyname = 'Public can insert into web3_waitlist'
  ) THEN
    CREATE POLICY "Public can insert into web3_waitlist"
      ON web3_waitlist
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);
  END IF;
END $$;

-- Allow users to view own entry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'web3_waitlist' AND policyname = 'Users can read own waitlist entry'
  ) THEN
    CREATE POLICY "Users can read own waitlist entry"
      ON web3_waitlist
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = email);
  END IF;
END $$;

-- Allow admins full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'web3_waitlist' AND policyname = 'Admins full access to web3_waitlist'
  ) THEN
    CREATE POLICY "Admins full access to web3_waitlist"
      ON web3_waitlist
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'superadmin', 'ADMIN', 'SUPERADMIN')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'superadmin', 'ADMIN', 'SUPERADMIN')
        )
      );
  END IF;
END $$;

