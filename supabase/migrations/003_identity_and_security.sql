-- Stable photographer identity and production-safe ownership policies.
-- Run after 001_initial_schema.sql, seed files, and 002_payment_methods.sql.

-- A slug is an immutable application identifier. Display names may change.
create unique index if not exists profiles_slug_unique
  on public.profiles (slug)
  where slug is not null;

-- Backfill existing photographer accounts where the profile and photographer
-- records already share the same display name.
update public.profiles p
set slug = ph.id
from public.photographers ph
where p.slug is null
  and p.role = 'Photographer'
  and lower(trim(p.name)) = lower(trim(ph.name));

create or replace function public.prevent_profile_slug_change()
returns trigger as $$
begin
  if old.slug is not null and new.slug is distinct from old.slug then
    raise exception 'Photographer identity slug cannot be changed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_slug_immutable on public.profiles;
create trigger profiles_slug_immutable
  before update of slug on public.profiles
  for each row execute function public.prevent_profile_slug_change();

-- Generate a stable slug for new photographer accounts at signup.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_slug text;
begin
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  ));

  insert into public.profiles (id, name, role, slug, plan, avatar, member_since, downloads_left)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Buyer'),
    case when coalesce(new.raw_user_meta_data ->> 'role', 'Buyer') = 'Photographer'
    then nullif(trim(both '-' from base_slug), '') || '-' || left(new.id::text, 8) else null end,
    coalesce(new.raw_user_meta_data ->> 'plan', 'Starter'),
    coalesce(new.raw_user_meta_data ->> 'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150'),
    to_char(now(), 'Mon YYYY'),
    '50'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Replace permissive photo ownership rules with slug ownership checks.
drop policy if exists "Photographers can insert own photos" on public.photos;
create policy "Photographers can insert own photos"
  on public.photos for insert
  with check (
    photographer_id = (select slug from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
  );

drop policy if exists "Photographers can update own photos" on public.photos;
create policy "Photographers can update own photos"
  on public.photos for update
  using (
    photographer_id = (select slug from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
  )
  with check (
    photographer_id = (select slug from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
  );

-- Allow a photographer to change their display name without changing slug.
drop policy if exists "Photographers can update own directory profile" on public.photographers;
create policy "Photographers can update own directory profile"
  on public.photographers for update
  using (id = (select slug from public.profiles where id = auth.uid()))
  with check (id = (select slug from public.profiles where id = auth.uid()));

-- Secure photographer settings. Keep the existing text key for compatibility
-- with the current application and existing data, but restrict access by auth ID.
create table if not exists public.photographer_profiles (
  user_id text primary key,
  location text default '',
  specialty text default '',
  bio text default '',
  bank_name text default '',
  bank_account_last4 text default '',
  updated_at timestamptz default now()
);
alter table public.photographer_profiles enable row level security;

drop policy if exists "Public read photographer_profiles" on public.photographer_profiles;
drop policy if exists "Authenticated upsert photographer_profiles" on public.photographer_profiles;
drop policy if exists "Authenticated update photographer_profiles" on public.photographer_profiles;
create policy "Owners can read photographer settings"
  on public.photographer_profiles for select
  using (user_id = auth.uid()::text or exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin'));
create policy "Owners can insert photographer settings"
  on public.photographer_profiles for insert
  with check (user_id = auth.uid()::text);
create policy "Owners can update photographer settings"
  on public.photographer_profiles for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
