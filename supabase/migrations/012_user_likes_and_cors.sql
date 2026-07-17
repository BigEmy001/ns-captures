-- ============================================================
-- Create user_likes table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_likes (
  user_id uuid references auth.users(id) on delete cascade,
  photo_id text not null,
  created_at timestamptz default now()
);

-- Safely ensure user_id is uuid in case it was manually created as text earlier
ALTER TABLE public.user_likes ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add primary key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_likes_pkey'
  ) THEN
    ALTER TABLE public.user_likes ADD PRIMARY KEY (user_id, photo_id);
  END IF;
END $$;

ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;

-- Grant API access to user_likes
GRANT ALL ON TABLE public.user_likes TO anon, authenticated, service_role;

-- RLS Policies for user_likes
DROP POLICY IF EXISTS "Users can view own likes" ON public.user_likes;
CREATE POLICY "Users can view own likes" 
  ON public.user_likes FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own likes" ON public.user_likes;
CREATE POLICY "Users can insert own likes" 
  ON public.user_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own likes" ON public.user_likes;
CREATE POLICY "Users can delete own likes" 
  ON public.user_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================
-- Force PostgREST schema reload
-- ============================================================
-- This ensures that the GRANT statements from our previous migration
-- for verification_documents actually take effect immediately.
NOTIFY pgrst, 'reload schema';
