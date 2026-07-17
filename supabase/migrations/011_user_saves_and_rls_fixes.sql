-- ============================================================
-- Create user_saves table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_saves (
  user_id uuid references auth.users(id) on delete cascade,
  photo_id text not null,
  created_at timestamptz default now()
);

-- Safely ensure user_id is uuid in case it was manually created as text earlier
ALTER TABLE public.user_saves ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add primary key if it doesn't exist (ignoring errors if it does)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_saves_pkey'
  ) THEN
    ALTER TABLE public.user_saves ADD PRIMARY KEY (user_id, photo_id);
  END IF;
END $$;

ALTER TABLE public.user_saves ENABLE ROW LEVEL SECURITY;

-- Grant API access to user_saves
GRANT ALL ON TABLE public.user_saves TO anon, authenticated, service_role;

-- RLS Policies for user_saves
DROP POLICY IF EXISTS "Users can view own saves" ON public.user_saves;
CREATE POLICY "Users can view own saves" 
  ON public.user_saves FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saves" ON public.user_saves;
CREATE POLICY "Users can insert own saves" 
  ON public.user_saves FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saves" ON public.user_saves;
CREATE POLICY "Users can delete own saves" 
  ON public.user_saves FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================
-- Fix missing grants for verification_documents
-- ============================================================

GRANT ALL ON TABLE public.verification_documents TO anon, authenticated, service_role;
