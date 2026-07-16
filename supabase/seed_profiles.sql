-- ============================================================
-- 003_photographer_profiles.sql — Photographer settings
-- Run this in the Supabase Dashboard SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS photographer_profiles (
  user_id TEXT PRIMARY KEY,
  location TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_last4 TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE photographer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read photographer_profiles" ON photographer_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated upsert photographer_profiles" ON photographer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update photographer_profiles" ON photographer_profiles FOR UPDATE USING (true);

-- ============================================================
-- Done.
-- ============================================================
