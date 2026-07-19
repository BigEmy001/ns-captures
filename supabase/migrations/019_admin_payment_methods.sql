-- 1. Create admin_payment_methods table
create table public.admin_payment_methods (
  id           uuid primary key default gen_random_uuid(),
  method_type  text not null, -- 'crypto', 'bank', 'paypal'
  name         text not null, -- e.g. 'Bitcoin (BTC)'
  details      text not null, -- e.g. 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  enabled      boolean default true,
  created_at   timestamptz default now()
);

alter table public.admin_payment_methods enable row level security;

-- Everyone can view enabled payment methods
create policy "Anyone can view enabled admin payment methods"
  on public.admin_payment_methods for select
  using (enabled = true);

-- Admins can do everything
create policy "Admins can manage admin payment methods"
  on public.admin_payment_methods for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- Grant privileges
GRANT ALL ON public.admin_payment_methods TO authenticated;
GRANT ALL ON public.admin_payment_methods TO anon;
GRANT ALL ON public.admin_payment_methods TO service_role;

-- 2. Add contact_link to site_settings
alter table public.site_settings add column if not exists contact_link text;

-- Make sure authenticated users can view/update site_settings
GRANT UPDATE ON public.site_settings TO authenticated;
