-- Add status column to photos for staged upload workflow
-- Status: draft | pending_review | published | rejected
alter table public.photos
  add column if not exists status text default 'published'
    check (status in ('draft', 'pending_review', 'published', 'rejected'));

-- Backfill existing photos as published
update public.photos set status = 'published' where status is null;

-- Index for filtering by status (gallery only shows published)
create index if not exists idx_photos_status on public.photos (status);

-- Update RLS: anyone can view published photos, photographers manage own drafts
drop policy if exists "Anyone can view photos" on public.photos;
create policy "Anyone can view published photos"
  on public.photos for select
  using (status = 'published' or status is null);

-- Photographers can view their own drafts/pending/rejected
drop policy if exists "Photographers can view own photos" on public.photos;
create policy "Photographers can view own photos"
  on public.photos for select
  using (
    photographer_id = (select slug from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
  );
