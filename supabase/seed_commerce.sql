-- ============================================================
-- SEED: Purchases, Licenses, Payouts, Activity Log, Site Settings
-- Run in Supabase Dashboard SQL editor AFTER run_all.sql
-- ============================================================

-- First, get the actual user IDs from auth.users
-- We'll use subqueries to reference real auth users

-- ============================================================
-- 1. SITE SETTINGS (upsert singleton)
-- ============================================================

-- Insert Divine Effiong into photographers
INSERT INTO public.photographers (id, name, location, specialty, followers, avatar, bio, verified, gear) VALUES ('divine-effiong', 'Divine Effiong', 'Calabar, Nigeria', 'Portrait', '1.2k', 'https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150', 'Portrait photographer capturing stories of identity and expression.', FALSE, ARRAY['Canon EOS R6']) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_settings (id, site_name, site_url, support_email, platform_fee, default_commission, min_price, max_file_size, maintenance_mode, signup_enabled, moderation_required)
VALUES (1, 'NS CAPTURES', 'https://nscaptures.com', 'support@nscaptures.com', 20, 70, 1000, 100, false, true, true)
ON CONFLICT (id) DO UPDATE SET
  site_name = EXCLUDED.site_name,
  site_url = EXCLUDED.site_url,
  support_email = EXCLUDED.support_email,
  platform_fee = EXCLUDED.platform_fee,
  default_commission = EXCLUDED.default_commission,
  min_price = EXCLUDED.min_price,
  max_file_size = EXCLUDED.max_file_size,
  maintenance_mode = EXCLUDED.maintenance_mode,
  signup_enabled = EXCLUDED.signup_enabled,
  moderation_required = EXCLUDED.moderation_required;

-- ============================================================
-- 2. PURCHASES (sample historical data)
-- ============================================================
-- Uses subqueries to get real user IDs from auth.users
INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2041',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'lagos-skyline',
  'COMMERCIAL',
  1200,
  'Jul 09, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2038',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'smiling-black-top',
  'EXTENDED',
  2400,
  'Jul 02, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2033',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'orange-headdress',
  'EDITORIAL',
  1000,
  'Jun 21, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2029',
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'flower-ear',
  'COMMERCIAL',
  1000,
  'Jun 15, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2025',
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'man-wall',
  'EXTENDED',
  2080,
  'Jun 08, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2020',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'black-tank',
  'EXCLUSIVE',
  4800,
  'May 30, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (id, user_id, photo_id, license, price, date)
SELECT
  'INV-2015',
  (SELECT id FROM auth.users WHERE email = 'divine@studio.ng' LIMIT 1),
  'afro-earrings',
  'COMMERCIAL',
  1000,
  'May 22, 2026'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'divine@studio.ng')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. LICENSES (matching purchases)
-- ============================================================
INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-001',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'lagos-skyline',
  'Light on Lagos',
  'COMMERCIAL',
  1200,
  '2026-07-09T10:30:00Z',
  'Perpetual',
  3
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-002',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'smiling-black-top',
  'The in-between',
  'EXTENDED',
  2400,
  '2026-07-02T14:15:00Z',
  'Perpetual',
  1
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-003',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'orange-headdress',
  'Orange headdress',
  'EDITORIAL',
  1000,
  '2026-06-21T09:00:00Z',
  'Perpetual',
  2
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-004',
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'flower-ear',
  'Bloom study',
  'COMMERCIAL',
  1000,
  '2026-06-15T11:45:00Z',
  'Perpetual',
  0
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-005',
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'man-wall',
  'Against the wall',
  'EXTENDED',
  2080,
  '2026-06-08T16:20:00Z',
  'Perpetual',
  1
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-006',
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'black-tank',
  'Quiet confidence',
  'EXCLUSIVE',
  4800,
  '2026-05-30T08:10:00Z',
  'Perpetual',
  5
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.licenses (id, user_id, photo_id, title, license_type, price, purchased_at, expires_at, downloads)
SELECT
  'LIC-007',
  (SELECT id FROM auth.users WHERE email = 'divine@studio.ng' LIMIT 1),
  'afro-earrings',
  'Afro, in gold',
  'COMMERCIAL',
  1000,
  '2026-05-22T13:30:00Z',
  'Perpetual',
  1
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'divine@studio.ng')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. PAYOUTS (photographer earnings)
-- ============================================================
INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-9042',
  'patrick-watson-quine',
  (SELECT id FROM auth.users WHERE email = 'patrick@ns.co' LIMIT 1),
  'Jul 16, 2026',
  'Zenith Bank Transfer',
  150,
  'PENDING'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'patrick@ns.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-9043',
  'lexmond-dennis',
  (SELECT id FROM auth.users WHERE email = 'lexmond@ns.co' LIMIT 1),
  'Jul 16, 2026',
  'Zenith Bank Transfer',
  240,
  'PENDING'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'lexmond@ns.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-9041',
  'namnso',
  (SELECT id FROM auth.users WHERE email = 'namnso@ns.co' LIMIT 1),
  'Jul 01, 2026',
  'Zenith Bank Transfer',
  3600,
  'SUCCESSFUL'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'namnso@ns.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-8038',
  'divine-effiong',
  (SELECT id FROM auth.users WHERE email = 'divine@studio.ng' LIMIT 1),
  'Jun 01, 2026',
  'Zenith Bank Transfer',
  2850,
  'SUCCESSFUL'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'divine@studio.ng')
ON CONFLICT DO NOTHING;

INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-7033',
  'prince-akachi',
  (SELECT id FROM auth.users WHERE email = 'prince@ns.co' LIMIT 1),
  'May 01, 2026',
  'Access Bank',
  3120,
  'SUCCESSFUL'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'prince@ns.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.payouts (id, photographer_id, user_id, date, method, amount, status)
SELECT
  'PAY-6021',
  'godfred-kwakye',
  (SELECT id FROM auth.users WHERE email = 'godfred@ns.co' LIMIT 1),
  'Apr 01, 2026',
  'GTBank',
  1950,
  'SUCCESSFUL'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'godfred@ns.co')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. ACTIVITY LOG (user actions)
-- ============================================================
INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'purchase',
  'License purchased: Light on Lagos',
  'COMMERCIAL license for $1,200'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'purchase',
  'License purchased: The in-between',
  'EXTENDED license for $2,400'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'download',
  'Downloaded: Light on Lagos',
  'File downloaded successfully'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'collection',
  'Created collection: Brand Refresh 2026',
  '24 images curated'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'like',
  'Liked: Bloom study',
  'Added to favorites'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'amara@mainlandstudio.co' LIMIT 1),
  'login',
  'New sign-in from Lagos, Nigeria',
  'Chrome on macOS'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'amara@mainlandstudio.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'purchase',
  'License purchased: Bloom study',
  'COMMERCIAL license for $1,000'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'daniel@paystack.co' LIMIT 1),
  'purchase',
  'License purchased: Against the wall',
  'EXTENDED license for $2,080'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel@paystack.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'patrick@ns.co' LIMIT 1),
  'upload',
  'Uploaded: 47 new photos',
  'Portfolio expanded'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'patrick@ns.co');

INSERT INTO public.activity_log (user_id, type, title, "desc")
SELECT
  (SELECT id FROM auth.users WHERE email = 'lexmond@ns.co' LIMIT 1),
  'upload',
  'Uploaded: 201 new photos',
  'Portfolio expanded'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'lexmond@ns.co');


-- ============================================================
-- 5b. COLLECTIONS (insert brand-2026)
-- ============================================================
INSERT INTO public.collections (id, title, curator, count, description, cover) VALUES ('brand-2026', 'Brand Refresh 2026', 'Amara Okafor', 24, 'Images curated for Mainland Studio brand refresh.', ARRAY['https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1080']) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. COLLECTION PHOTOS (junction — link first 20 photos to first collection)
-- ============================================================
INSERT INTO public.collection_photos (collection_id, photo_id, position)
SELECT
  'brand-2026',
  id,
  ROW_NUMBER() OVER (ORDER BY id) - 1
FROM (
  SELECT id FROM public.photos LIMIT 20
) sub
ON CONFLICT DO NOTHING;

-- Update collection count
UPDATE public.collections SET count = (
  SELECT COUNT(*) FROM public.collection_photos WHERE collection_id = 'brand-2026'
) WHERE id = 'brand-2026';

-- ============================================================
-- Done! All tables now have real data.
-- ============================================================
