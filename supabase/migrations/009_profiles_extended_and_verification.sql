-- ============================================================
-- Extended profile fields + identity verification system
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb default '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_references jsonb default '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text default 'unverified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- ============================================================
-- Verification documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  document_type   text not null check (document_type in ('passport', 'drivers_license', 'national_id', 'other')),
  document_number text,
  file_url        text not null,
  status          text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note      text,
  submitted_at    timestamptz default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id)
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.verification_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents"
  ON public.verification_documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));

CREATE POLICY "Admins can view all documents"
  ON public.verification_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));

-- Update handle_new_user to also set verification_status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, role, plan, avatar, member_since, downloads_left, verification_status
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'role', 'Buyer'),
    COALESCE(new.raw_user_meta_data ->> 'plan', 'Starter'),
    COALESCE(new.raw_user_meta_data ->> 'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150'),
    TO_CHAR(NOW(), 'Mon YYYY'),
    '50',
    'unverified'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
