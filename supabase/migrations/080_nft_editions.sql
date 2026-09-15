-- ============================================================
-- 080_nft_editions.sql
--
-- Digital Editions, Collections, Ownerships (COA), and Activity Trail
-- for the NS CAPTURES Web3 / NFT fine-art platform.
-- ============================================================

-- 1. COLLECTIONS
CREATE TABLE IF NOT EXISTS public.edition_collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  curator_statement TEXT,
  banner_image TEXT NOT NULL,
  avatar_image TEXT NOT NULL,
  photographer_id TEXT NOT NULL,
  photographer_name TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'Ethereum',
  contract_address TEXT NOT NULL,
  royalty_percent NUMERIC NOT NULL DEFAULT 10,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  socials JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_edition_collections_photographer ON public.edition_collections(photographer_id);
CREATE INDEX IF NOT EXISTS idx_edition_collections_created_at ON public.edition_collections(created_at DESC);

-- 2. DIGITAL EDITIONS
CREATE TABLE IF NOT EXISTS public.digital_editions (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL UNIQUE,
  photo_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  photographer_id TEXT NOT NULL,
  photographer_name TEXT NOT NULL,
  photographer_slug TEXT,
  photographer_avatar TEXT,
  image TEXT NOT NULL,
  master_hash TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('genesis_1_of_1', 'limited_series', 'physical_twin')),
  total_editions INTEGER NOT NULL DEFAULT 1,
  available_editions INTEGER NOT NULL DEFAULT 1,
  price_gbp NUMERIC NOT NULL,
  price_usd NUMERIC NOT NULL,
  price_eth NUMERIC NOT NULL,
  price_sol NUMERIC NOT NULL,
  royalty_percent NUMERIC NOT NULL DEFAULT 10,
  has_physical_twin BOOLEAN DEFAULT false,
  physical_print_details TEXT,
  camera TEXT,
  lens TEXT,
  iso INTEGER,
  aperture TEXT,
  shutter_speed TEXT,
  location TEXT,
  year_created INTEGER,
  minted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'listed' CHECK (status IN ('minted', 'listed', 'sold_out', 'archived')),
  featured BOOLEAN DEFAULT false,
  curator_note TEXT,
  collection_id TEXT REFERENCES public.edition_collections(id) ON DELETE SET NULL,
  collection_name TEXT,
  artwork_source TEXT DEFAULT 'portfolio',
  sales_paused BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status TEXT DEFAULT 'published' CHECK (review_status IN ('draft', 'pending_review', 'published', 'rejected')),
  review_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_digital_editions_collection ON public.digital_editions(collection_id);
CREATE INDEX IF NOT EXISTS idx_digital_editions_photographer ON public.digital_editions(photographer_id);
CREATE INDEX IF NOT EXISTS idx_digital_editions_review_status ON public.digital_editions(review_status);
CREATE INDEX IF NOT EXISTS idx_digital_editions_created_by ON public.digital_editions(created_by);
CREATE INDEX IF NOT EXISTS idx_digital_editions_minted_at ON public.digital_editions(minted_at DESC);

-- 3. OWNERSHIPS & CERTIFICATES OF AUTHENTICITY (COA)
CREATE TABLE IF NOT EXISTS public.edition_ownerships (
  id TEXT PRIMARY KEY,
  edition_id TEXT NOT NULL REFERENCES public.digital_editions(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  serial_display TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_wallet_address TEXT,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  purchase_price_gbp NUMERIC NOT NULL,
  purchase_currency TEXT NOT NULL CHECK (purchase_currency IN ('GBP', 'ETH', 'USDT', 'SOL')),
  certificate_number TEXT NOT NULL UNIQUE,
  is_listed_for_resale BOOLEAN DEFAULT false,
  resale_price_gbp NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_edition_ownerships_edition ON public.edition_ownerships(edition_id);
CREATE INDEX IF NOT EXISTS idx_edition_ownerships_owner ON public.edition_ownerships(owner_id);
CREATE INDEX IF NOT EXISTS idx_edition_ownerships_cert ON public.edition_ownerships(certificate_number);

-- 4. ACTIVITY TRAIL
CREATE TABLE IF NOT EXISTS public.edition_activities (
  id TEXT PRIMARY KEY,
  edition_id TEXT NOT NULL REFERENCES public.digital_editions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('minted', 'listed', 'purchased', 'transferred', 'royalty_paid', 'mint_fee_paid')),
  from_user TEXT,
  to_user TEXT,
  price NUMERIC,
  currency TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  tx_hash TEXT NOT NULL,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_edition_activities_edition ON public.edition_activities(edition_id);
CREATE INDEX IF NOT EXISTS idx_edition_activities_timestamp ON public.edition_activities(timestamp DESC);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.edition_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edition_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edition_activities ENABLE ROW LEVEL SECURITY;

-- Helper check for admin role
CREATE OR REPLACE FUNCTION public.caller_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'Admin', 'ADMIN', 'SUPERADMIN')
  );
$$;

-- Policies for edition_collections
CREATE POLICY "Public read edition_collections"
  ON public.edition_collections FOR SELECT
  USING (true);

CREATE POLICY "Creators and admins insert edition_collections"
  ON public.edition_collections FOR INSERT
  WITH CHECK (auth.uid() = created_by OR public.caller_is_admin());

CREATE POLICY "Creators and admins update edition_collections"
  ON public.edition_collections FOR UPDATE
  USING (auth.uid() = created_by OR public.caller_is_admin());

-- Policies for digital_editions
CREATE POLICY "Public read published digital_editions"
  ON public.digital_editions FOR SELECT
  USING (review_status = 'published' OR auth.uid() = created_by OR public.caller_is_admin());

CREATE POLICY "Creators and admins insert digital_editions"
  ON public.digital_editions FOR INSERT
  WITH CHECK (auth.uid() = created_by OR public.caller_is_admin());

CREATE POLICY "Creators and admins update digital_editions"
  ON public.digital_editions FOR UPDATE
  USING (auth.uid() = created_by OR public.caller_is_admin());

-- Policies for edition_ownerships
CREATE POLICY "Public read edition_ownerships"
  ON public.edition_ownerships FOR SELECT
  USING (true);

CREATE POLICY "Allow insert edition_ownerships"
  ON public.edition_ownerships FOR INSERT
  WITH CHECK (true);

-- Policies for edition_activities
CREATE POLICY "Public read edition_activities"
  ON public.edition_activities FOR SELECT
  USING (true);

CREATE POLICY "Allow insert edition_activities"
  ON public.edition_activities FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 6. GRANTS
-- ============================================================

GRANT SELECT ON public.edition_collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.edition_collections TO authenticated, service_role;

GRANT SELECT ON public.digital_editions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.digital_editions TO authenticated, service_role;

GRANT SELECT, INSERT ON public.edition_ownerships TO anon, authenticated;
GRANT UPDATE, DELETE ON public.edition_ownerships TO authenticated, service_role;

GRANT SELECT, INSERT ON public.edition_activities TO anon, authenticated;
GRANT UPDATE, DELETE ON public.edition_activities TO authenticated, service_role;

-- ============================================================
-- 7. SEED DATA (Curated Collections & Editions - No Nigeria)
-- ============================================================

INSERT INTO public.edition_collections (
  id, name, description, curator_statement, banner_image, avatar_image,
  photographer_id, photographer_name, chain, contract_address, royalty_percent, created_at
) VALUES
(
  'kyoto-nocturnes',
  'Kyoto Nocturnes',
  'An intimate photographic exploration of nocturnal Kyoto. Captured between midnight and blue twilight across ancient Gion alleyways and lantern-lit stone staircases using high-precision prime lenses. Numbered editions accompanied by cryptographic Certificates of Authenticity.',
  'Featured Curatorial Highlight: Exquisite low-light isolation, unmatched analogue warmth, and historical architecture rendered in pristine dynamic range.',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=2400&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  'haru-tanaka',
  'Haru Tanaka',
  'Ethereum',
  '0x2B4a971c4D6B21Ac8F01b9E71cA71D925e019E71',
  10,
  '2026-01-15T00:00:00Z'
),
(
  'metropolitan-geometry',
  'Metropolitan Geometry',
  'A formal architectural study of brutalist rhythm, cast concrete, and shadow across iconic post-war British modernist complexes and North American skylines.',
  'Geometry, balance, and austere concrete tonality captured in crisp high-contrast monochrome and twilight tones.',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=2400&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&auto=format&fit=crop&q=80',
  'patrick-watson-quine',
  'Patrick Watson-Quine',
  'Ethereum',
  '0x3F2b810D7a1884C9B417eE6997B24d623b092A19',
  10,
  '2026-02-12T00:00:00Z'
),
(
  'amsterdam-canals',
  'Amsterdam Canals & Lowland Horizons',
  'Atmospheric twilight reflections, historic canal bridges, and dramatic North Sea cloud banks across the Netherlands. Large-format dynamic range preserved in uncompressed archival masters.',
  'Curator Spotlight: Exquisite long-exposure water stillness and classic Dutch architectural framing.',
  'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=2400&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'lexmond-dennis',
  'Lexmond Dennis',
  'Ethereum',
  '0x55EE66FF77AA88BB99CC00DD11EE22FF33AA44BB',
  10,
  '2026-02-14T00:00:00Z'
),
(
  'namibian-horizons',
  'Namibian Horizons',
  'Sculptural red dunes and minimal shadow cast in Sossusvlei, exploring transient desert light and ancient geological silence.',
  'Ultra-wide and telephoto isolation of natural ridges and deep contrast at the golden hour.',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2400&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'lexmond-dennis',
  'Lexmond Dennis',
  'Ethereum',
  '0x11A4cD6b8897E90B427F231Ac96e0019B8641a9B',
  10,
  '2026-02-20T00:00:00Z'
),
(
  'milano-form',
  'Milano Form & Shadow',
  'Architectural contrast, warm Lombardian daylight, and refined studio minimalism captured in Milan by Elena Rossi.',
  'Curatorial Feature: Flawless balance of golden hour shadows and neoclassical Italian stonework.',
  'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=2400&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&auto=format&fit=crop&q=80',
  'elena-rossi',
  'Elena Rossi',
  'Ethereum',
  '0xAA11BB22CC33DD44EE55FF66AA77BB88CC99DD00',
  10,
  '2026-02-24T00:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- Seed digital editions
INSERT INTO public.digital_editions (
  id, token_id, photo_id, title, description,
  photographer_id, photographer_name, photographer_slug, photographer_avatar,
  image, master_hash, tier, total_editions, available_editions,
  price_gbp, price_usd, price_eth, price_sol, royalty_percent,
  has_physical_twin, physical_print_details,
  camera, lens, iso, aperture, shutter_speed, location, year_created, minted_at,
  status, featured, curator_note, collection_id, collection_name, review_status
) VALUES
(
  'edn-genesis-01',
  'NSC-GEN-2026-0001',
  'p-haru-01',
  'Nocturne in Kyoto, Rain Reflection No. 4',
  'A singular 1-of-1 archival master captured in Gion during a spring downpour. Hand-printed on Japanese Washi digital master with pristine micro-contrast and tonal depth.',
  'haru-tanaka',
  'Haru Tanaka',
  'haru-tanaka',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&auto=format&fit=crop&q=85',
  'sha256-4c9b91e98d929b01f92c3008982ba3ef9104fa27f4e88e9981db89481230e9f1',
  'genesis_1_of_1',
  1, 1, 1850, 2350, 0.72, 16.5, 10,
  true, 'Includes 24x36” signed Hahnemühle Photo Rag Baryta print delivered in museum-grade archival tube.',
  'Leica M11', 'Noctilux-M 50mm f/0.95 ASPH', 400, 'f/0.95', '1/125s', 'Kyoto, Japan', 2025, '2026-02-10T14:30:00Z',
  'listed', true, 'Featured Genesis Master: Exquisite low-light isolation, unmatched analogue warmth.',
  'kyoto-nocturnes', 'Kyoto Nocturnes', 'published'
),
(
  'edn-numbered-03',
  'NSC-EDN-2026-0029',
  'p-patrick-01',
  'Solitude in Brutalism: Barbican Walkway',
  'A limited digital series exploring architectural shadow play and geometry within London''s iconic Barbican Estate.',
  'patrick-watson-quine',
  'Patrick Watson-Quine',
  'patrick-watson-quine',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=85',
  'sha256-55aa44bb33cc22dd11ee00ff99aa88bb77cc66dd55ee44ff33aa22bb11cc00dd',
  'limited_series',
  25, 19, 280, 360, 0.11, 2.6, 10,
  false, null,
  'Sony A7R V', 'FE 24-70mm f/2.8 GM II', 100, 'f/5.6', '1/250s', 'London, United Kingdom', 2025, '2026-02-25T11:00:00Z',
  'listed', false, 'Rigorous formal composition highlighting post-war British modernist architecture.',
  'metropolitan-geometry', 'Metropolitan Geometry', 'published'
),
(
  'edn-patrick-02',
  'NSC-EDN-2026-0061',
  'am-downtown-skyline-a-1',
  'AM Downtown Skyline & Cloud Elevation',
  'Archival limited series of 20 editions capturing cool dawn geometry and low stratocumulus banks sweeping through downtown towers.',
  'patrick-watson-quine',
  'Patrick Watson-Quine',
  'patrick-watson-quine',
  'https://res.cloudinary.com/odu5iecy/image/upload/v1784203446/ns-captures/AM%20Downtown%20Closeup%20C-1.jpg',
  'https://res.cloudinary.com/odu5iecy/image/upload/v1784203467/ns-captures/AM%20Downtown%20Skyline%20A-1.jpg',
  'sha256-5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344',
  'limited_series',
  20, 17, 390, 500, 0.16, 3.6, 10,
  false, null,
  'Leica M11', '28mm f/2 Summicron-M ASPH', 160, 'f/4.0', '1/500s', 'Montreal, Canada', 2025, '2026-03-06T09:00:00Z',
  'listed', false, 'Cool architectural gradation balancing glass curtain walls and northern cloud cover.',
  'metropolitan-geometry', 'Metropolitan Geometry', 'published'
),
(
  'edn-patrick-03',
  'NSC-GEN-2026-0021',
  'am-rooftop-b-1',
  'AM Rooftop Silhouette at Dawn',
  'Unique 1-of-1 Genesis edition studying architectural solitude from an elevated rooftop vantage before city transit awakens.',
  'patrick-watson-quine',
  'Patrick Watson-Quine',
  'patrick-watson-quine',
  'https://res.cloudinary.com/odu5iecy/image/upload/v1784203446/ns-captures/AM%20Downtown%20Closeup%20C-1.jpg',
  'https://res.cloudinary.com/odu5iecy/image/upload/v1784203532/ns-captures/AM%20Rooftop%20B-1.jpg',
  'sha256-66778899aabbccddeeff00112233445566778899aabbccddeeff001122334455',
  'genesis_1_of_1',
  1, 1, 1950, 2500, 0.78, 17.5, 10,
  true, 'Includes custom framed 24x36” metallic pearl archival print with artist certificate.',
  'Leica M11', '35mm f/1.4 Summilux-M ASPH', 200, 'f/2.8', '1/320s', 'Montreal, Canada', 2026, '2026-03-07T08:30:00Z',
  'listed', true, 'Genesis Master: Intimate aerial solitude over sprawling North American urban grid.',
  'metropolitan-geometry', 'Metropolitan Geometry', 'published'
),
(
  'edn-genesis-04',
  'NSC-GEN-2026-0004',
  'p-lex-01',
  'The Golden Hour at Dune 45',
  'Unique 1-of-1 Genesis fine-art digital edition. Pristine windswept red dunes of the Namib Desert captured during peak twilight illumination.',
  'lexmond-dennis',
  'Lexmond Dennis',
  'lexmond-dennis',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&auto=format&fit=crop&q=85',
  'sha256-11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
  'genesis_1_of_1',
  1, 1, 2100, 2680, 0.82, 18.9, 10,
  true, 'Includes 30x45” custom framed museum acrylic glass print signed and numbered by the artist.',
  'Nikon Z9', 'NIKKOR Z 70-200mm f/2.8 VR S', 64, 'f/8.0', '1/400s', 'Sossusvlei, Namibia', 2025, '2026-03-01T08:00:00Z',
  'listed', true, 'Remarkable sculptural minimalism created by natural shadow cast across centuries-old dunes.',
  'namibian-horizons', 'Namibian Horizons', 'published'
),
(
  'edn-lex-02',
  'NSC-EDN-2026-0033',
  'amsterdam-canal-twilight',
  'Herengracht at Blue Hour',
  'Curated series of 25 archival editions capturing calm reflections and golden lamp light along Amsterdam''s historic canal ring.',
  'lexmond-dennis',
  'Lexmond Dennis',
  'lexmond-dennis',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=1600&auto=format&fit=crop&q=85',
  'sha256-223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11',
  'limited_series',
  25, 21, 340, 435, 0.14, 3.1, 10,
  false, null,
  'Sony A7R V', 'FE 16-35mm f/2.8 GM II', 100, 'f/8.0', '15s', 'Amsterdam, Netherlands', 2025, '2026-02-14T19:20:00Z',
  'listed', true, 'Atmospheric long-exposure capturing water glassiness and Golden Age façades.',
  'amsterdam-canals', 'Amsterdam Canals & Lowland Horizons', 'published'
),
(
  'edn-elena-01',
  'NSC-GEN-2026-0019',
  'milano-duomo-light',
  'Milano Study No. 3, Duomo Marble and Dawn',
  'Unique 1-of-1 Genesis fine-art digital master capturing morning sunlight illuminating Gothic spires and pink Candoglia marble.',
  'elena-rossi',
  'Elena Rossi',
  'elena-rossi',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1600&auto=format&fit=crop&q=85',
  'sha256-3344556677889900aabbccddeeff11223344556677889900aabbccddeeff22',
  'genesis_1_of_1',
  1, 1, 1750, 2240, 0.70, 15.6, 10,
  true, 'Includes 24x36” Hahnemühle Museum Etching print signed by Elena Rossi.',
  'Canon EOS R5', 'RF 24-70mm f/2.8L IS USM', 100, 'f/5.6', '1/160s', 'Milan, Italy', 2025, '2026-02-24T07:15:00Z',
  'listed', true, 'Genesis Master: Luminous natural dawn illumination across Candoglia marble spires.',
  'milano-form', 'Milano Form & Shadow', 'published'
)
ON CONFLICT (id) DO NOTHING;

-- Seed initial ownerships
INSERT INTO public.edition_ownerships (
  id, edition_id, serial_number, serial_display, owner_id, owner_name, owner_email,
  owner_wallet_address, acquired_at, purchase_price_gbp, purchase_currency, certificate_number, is_listed_for_resale
) VALUES
(
  'own-001', 'edn-numbered-03', 1, '#01 / 25', 'collector-david', 'David Sterling', 'david@sterlingcapital.com',
  '0xbd16e4ebF708EF94E8e89496ecbdEF648922E18d', '2026-02-26T12:05:00Z', 280, 'USDT', 'COA-NSC-2026-0029-01', false
),
(
  'own-002', 'edn-patrick-02', 1, '#01 / 20', 'collector-marcus', 'Marcus Vance', 'marcus.vance@vanceart.co.uk',
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', '2026-03-06T11:45:00Z', 390, 'GBP', 'COA-NSC-2026-0061-01', false
),
(
  'own-003', 'edn-lex-02', 1, '#01 / 25', 'collector-sophia', 'Sophia Laurent', 'sophia@laurentfineart.fr',
  '0x3F2b810D7a1884C9B417eE6997B24d623b092A19', '2026-02-16T14:30:00Z', 340, 'ETH', 'COA-NSC-2026-0033-01', false
)
ON CONFLICT (id) DO NOTHING;

-- Seed initial activities
INSERT INTO public.edition_activities (
  id, edition_id, type, from_user, to_user, price, currency, timestamp, tx_hash, details
) VALUES
(
  'act-01', 'edn-genesis-01', 'minted', 'Haru Tanaka', null, null, null,
  '2026-02-10T14:30:00Z', '0x9a3e4128dfb841a029384bcda8293e8a',
  'Genesis 1-of-1 digital master certified with SHA-256 archival fingerprint.'
),
(
  'act-02', 'edn-patrick-02', 'purchased', 'Patrick Watson-Quine', 'Marcus Vance', 390, 'GBP',
  '2026-03-06T11:45:00Z', '0x55aa66bb77cc88dd99ee00ff11aa22bb',
  'Acquired Edition #01 / 20. Authenticity certificate COA-NSC-2026-0061-01 issued.'
),
(
  'act-03', 'edn-lex-02', 'purchased', 'Lexmond Dennis', 'Sophia Laurent', 340, 'ETH',
  '2026-02-16T14:30:00Z', '0x66bb77cc88dd99ee00ff11aa22bb33cc',
  'Acquired Edition #01 / 25. Authenticity certificate COA-NSC-2026-0033-01 issued.'
),
(
  'act-04', 'edn-elena-01', 'minted', 'Elena Rossi', null, null, null,
  '2026-02-24T07:15:00Z', '0x77cc88dd99ee00ff11aa22bb33cc44dd',
  'Genesis 1-of-1 master ''Milano Study No. 3'' certified with physical print twin.'
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

