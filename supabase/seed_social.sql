-- ============================================================
-- 002_social_features.sql — Likes, Saves, Follows
-- Run this in the Supabase Dashboard SQL Editor.
-- ============================================================

-- USER LIKES (photo likes)
CREATE TABLE IF NOT EXISTS user_likes (
  user_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, photo_id)
);

ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user_likes" ON user_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated insert user_likes" ON user_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated delete user_likes" ON user_likes FOR DELETE USING (true);

-- USER SAVES (bookmarks / collections)
CREATE TABLE IF NOT EXISTS user_saves (
  user_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, photo_id)
);

ALTER TABLE user_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user_saves" ON user_saves FOR SELECT USING (true);
CREATE POLICY "Authenticated insert user_saves" ON user_saves FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated delete user_saves" ON user_saves FOR DELETE USING (true);

-- USER FOLLOWS (photographer follows)
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user_follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated insert user_follows" ON user_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated delete user_follows" ON user_follows FOR DELETE USING (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_likes_photo ON user_likes (photo_id);
CREATE INDEX IF NOT EXISTS idx_user_saves_photo ON user_saves (photo_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id);

-- ============================================================
-- Done. Next run: seed_social_data.sql (optional sample data)
-- ============================================================
