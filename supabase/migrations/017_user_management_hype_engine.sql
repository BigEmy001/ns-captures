-- Add Blocked to profiles status
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('Active', 'Pending', 'Suspended', 'Blocked'));

-- Add payout_balance to profiles to track manual ledger additions
alter table public.profiles add column if not exists payout_balance numeric default 0;

-- Add custom metrics to photographers for the hype engine
alter table public.photographers add column if not exists custom_followers text;

-- Add custom metrics to photos for the hype engine
alter table public.photos add column if not exists custom_views integer default 0;
alter table public.photos add column if not exists custom_likes integer default 0;
alter table public.photos add column if not exists custom_downloads integer default 0;
