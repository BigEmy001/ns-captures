-- ============================================================
-- PAYMENT METHODS — which methods each photographer accepts
-- ============================================================
create table public.photographer_payment_methods (
  id           uuid default gen_random_uuid() primary key,
  photographer_id text not null,
  method       text not null check (method in ('card', 'crypto', 'paypal')),
  enabled      boolean default true,
  -- Card: Stripe connect account ID
  -- Crypto: wallet address (BTC/ETH/USDT)
  -- PayPal: PayPal.me link or email
  details      jsonb default '{}',
  created_at   timestamptz default now(),
  unique(photographer_id, method)
);

alter table public.photographer_payment_methods enable row level security;

create policy "Payment methods viewable by everyone"
  on public.photographer_payment_methods for select using (true);

create policy "Photographers can manage own payment methods"
  on public.photographer_payment_methods for all
  using (photographer_id = (
    select slug from public.profiles where id = auth.uid()
  ));

create policy "Admins can manage all payment methods"
  on public.photographer_payment_methods for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- ADD payment_method column to purchases
-- ============================================================
alter table public.purchases add column if not exists payment_method text default 'card';

-- ============================================================
-- PAYOUT REQUESTS — photographers request, admin approves
-- ============================================================
create table public.payout_requests (
  id              uuid default gen_random_uuid() primary key,
  photographer_id text not null,
  amount          numeric not null,
  method          text not null check (method in ('card', 'crypto', 'paypal')),
  details         jsonb default '{}',
  status          text default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  admin_note      text,
  requested_at    timestamptz default now(),
  processed_at    timestamptz
);

alter table public.payout_requests enable row level security;

create policy "Photographers can view own payout requests"
  on public.payout_requests for select
  using (photographer_id = (
    select slug from public.profiles where id = auth.uid()
  ));

create policy "Photographers can create payout requests"
  on public.payout_requests for insert
  with check (photographer_id = (
    select slug from public.profiles where id = auth.uid()
  ));

create policy "Admins can manage all payout requests"
  on public.payout_requests for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  ));

-- ============================================================
-- SEED: default payment methods for existing photographers
-- ============================================================
INSERT INTO public.photographer_payment_methods (photographer_id, method, enabled, details) VALUES
('patrick-watson-quine', 'card', true, '{}'),
('patrick-watson-quine', 'paypal', true, '{"email": "patrick@paypal.me"}'),
('lexmond-dennis', 'card', true, '{}'),
('lexmond-dennis', 'crypto', true, '{"wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"}'),
('namnso-ukpanah', 'card', true, '{}'),
('haru-tanaka', 'card', true, '{}'),
('haru-tanaka', 'crypto', true, '{"wallet": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12"}'),
('haru-tanaka', 'paypal', true, '{"email": "haru@paypal.me"}')
ON CONFLICT (photographer_id, method) DO NOTHING;
