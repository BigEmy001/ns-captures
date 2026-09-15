-- Migration 082: Fix Web3 Waitlist RLS policy, grant table permissions, and sync/populate assigned wallets

-- 1. Ensure table permissions are granted to client roles
GRANT ALL ON TABLE public.web3_waitlist TO anon, authenticated, service_role;

-- 2. Drop legacy RLS policies on web3_waitlist
DROP POLICY IF EXISTS "Admins full access to web3_waitlist" ON public.web3_waitlist;
DROP POLICY IF EXISTS "Public can insert into web3_waitlist" ON public.web3_waitlist;
DROP POLICY IF EXISTS "Users can read own waitlist entry" ON public.web3_waitlist;
DROP POLICY IF EXISTS "Public can update own waitlist entry" ON public.web3_waitlist;

-- 3. Re-create robust case-insensitive Admin policy
-- In profiles table, admin role is stored as 'Admin' (TitleCase), whereas migration 079 checked lowercase/uppercase only.
CREATE POLICY "Admins full access to web3_waitlist"
  ON public.web3_waitlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        lower(profiles.role) IN ('admin', 'superadmin')
        OR profiles.role = 'Admin'
        OR profiles.role ILIKE 'admin%'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        lower(profiles.role) IN ('admin', 'superadmin')
        OR profiles.role = 'Admin'
        OR profiles.role ILIKE 'admin%'
      )
    )
  );

-- 4. Public / Anon users can insert or update (upsert) waitlist entries
CREATE POLICY "Public can insert into web3_waitlist"
  ON public.web3_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

CREATE POLICY "Public can update own waitlist entry"
  ON public.web3_waitlist
  FOR UPDATE
  TO anon, authenticated
  USING (
    email = auth.jwt() ->> 'email'
    OR user_id = auth.uid()
    OR auth.uid() IS NULL -- allows anon upsert by email
  )
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

-- 5. Users can read own waitlist entry
CREATE POLICY "Users can read own waitlist entry"
  ON public.web3_waitlist
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' = email
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        lower(profiles.role) IN ('admin', 'superadmin')
        OR profiles.role = 'Admin'
        OR profiles.role ILIKE 'admin%'
      )
    )
  );

-- 6. Synchronize and populate existing waitlist rows and platform users with assigned crypto wallets

-- A. Update existing waitlist entries with actual names, roles, and assigned wallets
UPDATE public.web3_waitlist
SET
  name = COALESCE(NULLIF(web3_waitlist.name, ''), 'Emy Jnr (Abraham)'),
  role = 'photographer',
  wallet_address = COALESCE(web3_waitlist.wallet_address, '0x9D5F6FDa6be22B9bD005fA62d50B401B448A0F73'),
  status = 'approved',
  notes = COALESCE(web3_waitlist.notes, 'Platform Contributor - Multi-chain vault active')
WHERE email = 'emyjnr01@gmail.com';

UPDATE public.web3_waitlist
SET
  name = COALESCE(NULLIF(web3_waitlist.name, ''), 'Ernie Blarinckx'),
  role = 'photographer',
  wallet_address = COALESCE(web3_waitlist.wallet_address, '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
  status = 'approved',
  notes = COALESCE(web3_waitlist.notes, 'Platform Contributor - ERC20 payout wallet & multi-chain vault')
WHERE email = 'ernieblackrixx@gmail.com';

UPDATE public.web3_waitlist
SET
  name = COALESCE(NULLIF(web3_waitlist.name, ''), 'Roberto Rinaldi'),
  role = 'photographer',
  status = 'pending',
  notes = COALESCE(web3_waitlist.notes, 'Platform Photographer - Underwater & Mediterranean provenance')
WHERE email = 'rinaldixroberto@gmail.com';

-- Also sync profiles.wallet_address for Ernie and Emy if not already set
UPDATE public.profiles
SET wallet_address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
WHERE email = 'ernieblackrixx@gmail.com' AND (wallet_address IS NULL OR wallet_address = '');

UPDATE public.profiles
SET wallet_address = '0x9D5F6FDa6be22B9bD005fA62d50B401B448A0F73'
WHERE email = 'emyjnr01@gmail.com' AND (wallet_address IS NULL OR wallet_address = '');

-- B. Populate additional platform creators and collectors who have assigned wallets or requested Web3 access
INSERT INTO public.web3_waitlist (email, name, role, wallet_address, status, notes)
VALUES
  (
    'dennis.rs6.lexmond@gmail.com',
    'Lexmond Dennis',
    'photographer',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
    'approved',
    'Platform Photographer - Amsterdam Canals & Namibian Horizons collection creator'
  ),
  (
    'haru@ns.co',
    'Haru Tanaka',
    'photographer',
    '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    'approved',
    'Platform Photographer - Kyoto Nocturnes collection creator'
  ),
  (
    'zkhoon@gmail.com',
    'Junghoon Sung',
    'photographer',
    '0xbd16e4ebF708EF94E8e89496ecbdEF648922E18d',
    'approved',
    'Platform Contributor - Multi-chain vault assigned'
  ),
  (
    'daniel@paystack.co',
    'Daniel',
    'collector',
    '0x3B9F28E52A7b28D1B3674d8902A633F9C7D491a2',
    'approved',
    'Fine-art photography collector & early Web3 patron'
  ),
  (
    'amara@mainlandstudio.co',
    'Amara',
    'collector',
    '0x8D24bA7E30Ea1F44D8738F6b22A43F88c81443f8',
    'approved',
    'Enterprise Art Buyer & curatorial collector'
  ),
  (
    'clive.varley@nscaptures.com',
    'Clive Varley',
    'photographer',
    NULL,
    'pending',
    'Platform Photographer - UK Maritime & coastal landscapes'
  ),
  (
    'ian.dandribe@nscaptures.com',
    'Ian Dandribe',
    'photographer',
    NULL,
    'pending',
    'Platform Photographer - Architectural minimalism'
  ),
  (
    'ryusei.yamada@nscaptures.com',
    'Ryusei Yamada',
    'photographer',
    NULL,
    'pending',
    'Platform Photographer - Tokyo urban geometry'
  ),
  (
    'eunji.lee@nscaptures.com',
    'Eunji Lee',
    'photographer',
    NULL,
    'pending',
    'Platform Photographer - Seoul street documentation'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  wallet_address = COALESCE(public.web3_waitlist.wallet_address, EXCLUDED.wallet_address),
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- Also update profiles.wallet_address for Lexmond Dennis, Haru Tanaka, Junghoon Sung
UPDATE public.profiles
SET wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78'
WHERE email = 'dennis.rs6.lexmond@gmail.com' AND (wallet_address IS NULL OR wallet_address = '');

UPDATE public.profiles
SET wallet_address = '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12'
WHERE email = 'haru@ns.co' AND (wallet_address IS NULL OR wallet_address = '');

UPDATE public.profiles
SET wallet_address = '0xbd16e4ebF708EF94E8e89496ecbdEF648922E18d'
WHERE email = 'zkhoon@gmail.com' AND (wallet_address IS NULL OR wallet_address = '');

