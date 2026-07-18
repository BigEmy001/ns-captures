create table if not exists public.contributor_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  country text not null,
  preferred_channel text not null,
  invitation_code text,
  portfolio_link text not null,
  gear_description text not null,
  social_handle text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected', 'blocked')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contributor_submissions enable row level security;

drop policy if exists "Public can create contributor submissions" on public.contributor_submissions;
create policy "Public can create contributor submissions"
  on public.contributor_submissions for insert
  with check (true);

drop policy if exists "Admins can view contributor submissions" on public.contributor_submissions;
create policy "Admins can view contributor submissions"
  on public.contributor_submissions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin'));

drop policy if exists "Admins can update contributor submissions" on public.contributor_submissions;
create policy "Admins can update contributor submissions"
  on public.contributor_submissions for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin'));

grant insert on public.contributor_submissions to anon;
grant select, update on public.contributor_submissions to authenticated;
