-- NS CAPTURES — Initial database schema
-- Run this in the Supabase SQL editor or via `supabase db push`

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'Buyer' check (role in ('Buyer','Photographer','Enterprise','Admin')),
  slug       text,
  plan       text,
  company    text,
  avatar     text,
  member_since text,
  downloads_left text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, plan, avatar, member_since, downloads_left)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Buyer'),
    coalesce(new.raw_user_meta_data ->> 'plan', 'Starter'),
    coalesce(new.raw_user_meta_data ->> 'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150'),
    to_char(now(), 'Mon YYYY'),
    '50'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. PHOTOGRAPHERS
-- ============================================================
create table public.photographers (
  id         text primary key,
  name       text not null,
  location   text,
  specialty  text,
  followers  text,
  avatar     text,
  bio        text,
  cover      text,
  verified   boolean default false,
  gear       text[],
  created_at timestamptz default now()
);

alter table public.photographers enable row level security;

create policy "Photographers are viewable by everyone"
  on public.photographers for select using (true);

create policy "Admins can manage photographers"
  on public.photographers for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- 3. PHOTOS
-- ============================================================
create table public.photos (
  id               text primary key,
  title            text not null,
  photographer_id  text,
  photographer_name text,
  license          text,
  category         text,
  location         text,
  color            text,
  orientation      text,
  ratio            text,
  price            numeric default 0,
  downloads        integer default 0,
  views            integer default 0,
  likes            integer default 0,
  camera           text,
  lens             text,
  iso              integer default 100,
  aperture         text,
  shutter_speed    text,
  focal_length     text,
  keywords         text[],
  image            text,
  created_at       timestamptz,
  uploaded_at      timestamptz default now()
);

alter table public.photos enable row level security;

create policy "Photos are viewable by everyone"
  on public.photos for select using (true);

create policy "Photographers can insert own photos"
  on public.photos for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('Photographer', 'Admin')
    )
  );

create policy "Photographers can update own photos"
  on public.photos for update
  using (
    photographer_id in (
      select id from public.photographers where id = (
        select slug from public.profiles where id = auth.uid()
      )
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'Admin'
    )
  );

create policy "Admins can delete any photo"
  on public.photos for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

create index idx_photos_photographer_id on public.photos(photographer_id);
create index idx_photos_category on public.photos(category);
create index idx_photos_license on public.photos(license);

-- ============================================================
-- 4. COLLECTIONS
-- ============================================================
create table public.collections (
  id          text primary key,
  title       text not null,
  curator     text,
  count       integer default 0,
  description text,
  cover       text[]
);

alter table public.collections enable row level security;

create policy "Collections are viewable by everyone"
  on public.collections for select using (true);

-- ============================================================
-- 5. COLLECTION_PHOTOS (junction)
-- ============================================================
create table public.collection_photos (
  collection_id text references public.collections(id) on delete cascade,
  photo_id      text references public.photos(id) on delete cascade,
  position      integer default 0,
  primary key (collection_id, photo_id)
);

alter table public.collection_photos enable row level security;

create policy "Collection photos are viewable by everyone"
  on public.collection_photos for select using (true);

-- ============================================================
-- 6. PURCHASES
-- ============================================================
create table public.purchases (
  id         text primary key,
  user_id    uuid references auth.users(id),
  photo_id   text references public.photos(id),
  license    text,
  price      numeric,
  date       timestamptz default now()
);

alter table public.purchases enable row level security;

create policy "Users can view own purchases"
  on public.purchases for select using (auth.uid() = user_id);

create policy "Admins can view all purchases"
  on public.purchases for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- 7. LICENSES
-- ============================================================
create table public.licenses (
  id           text primary key,
  user_id      uuid references auth.users(id),
  photo_id     text references public.photos(id),
  title        text,
  license_type text,
  price        numeric,
  purchased_at timestamptz default now(),
  expires_at   text,
  downloads    integer default 0
);

alter table public.licenses enable row level security;

create policy "Users can view own licenses"
  on public.licenses for select using (auth.uid() = user_id);

create policy "Admins can view all licenses"
  on public.licenses for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- 8. BRIEFS
-- ============================================================
create table public.briefs (
  id          text primary key,
  title       text not null,
  location    text,
  license     text,
  budget      numeric,
  delivery    text,
  status      text default 'MATCHING',
  description text
);

alter table public.briefs enable row level security;

create policy "Briefs are viewable by everyone"
  on public.briefs for select using (true);

-- ============================================================
-- 9. MODERATION QUEUE
-- ============================================================
create table public.moderation_queue (
  id           text primary key,
  photo_id     text references public.photos(id),
  photographer text,
  reason       text,
  submitted    text
);

alter table public.moderation_queue enable row level security;

create policy "Admins can manage moderation queue"
  on public.moderation_queue for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- 10. PAYOUTS
-- ============================================================
create table public.payouts (
  id              text primary key,
  photographer_id text references public.photographers(id),
  user_id         uuid references auth.users(id),
  date            text,
  method          text,
  amount          numeric,
  status          text
);

alter table public.payouts enable row level security;

create policy "Photographers can view own payouts"
  on public.payouts for select
  using (user_id = auth.uid());

create policy "Admins can manage all payouts"
  on public.payouts for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- 11. ACTIVITY LOG
-- ============================================================
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id),
  type       text,
  title      text,
  "desc"     text,
  created_at timestamptz default now()
);

alter table public.activity_log enable row level security;

create policy "Users can view own activity"
  on public.activity_log for select using (auth.uid() = user_id);

-- ============================================================
-- 12. SITE SETTINGS (singleton)
-- ============================================================
create table public.site_settings (
  id                    integer primary key default 1,
  site_name             text default 'NS CAPTURES',
  site_url              text,
  support_email         text,
  platform_fee          integer default 20,
  default_commission    integer default 70,
  min_price             integer default 100,
  max_file_size         integer default 100,
  maintenance_mode      boolean default false,
  signup_enabled        boolean default true,
  moderation_required   boolean default true
);

alter table public.site_settings enable row level security;

create policy "Settings viewable by everyone"
  on public.site_settings for select using (true);

create policy "Admins can update settings"
  on public.site_settings for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));
