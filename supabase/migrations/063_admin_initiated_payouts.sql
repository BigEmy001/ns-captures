-- Admin-initiated withdrawals, and the returned / re-initiated cycle.
--
-- Two things are added here.
--
-- 1. An admin can raise a withdrawal on a contributor's behalf — for support
--    cases where the contributor cannot reach the form themselves. The amount
--    is still checked against the contributor's real balance inside the
--    function, so an assisted request cannot be for money they do not have.
--
-- 2. A payout that a bank sends back can be marked `returned` and then
--    re-initiated. Re-initiation creates a NEW payout row linked to the one it
--    replaces, rather than rewinding the original, so the history of both
--    attempts survives. The replacement carries the original's amount: a
--    re-initiation moves a payment that already exists, it does not create a
--    new sum.

-- --------------------------------------------------------------
-- Stage vocabulary
-- --------------------------------------------------------------
alter table public.payout_requests drop constraint if exists payout_requests_stage_check;
alter table public.payout_requests add constraint payout_requests_stage_check
  check (stage = any (array[
    'requested', 'under_review', 'approved', 'processing', 'currency_conversion',
    'network_processing', 'intermediary_processing', 'recipient_bank_processing',
    'delivered', 'completed', 'rejected', 'cancelled',
    'returned', 're_initiated'
  ]));

-- --------------------------------------------------------------
-- Provenance
-- --------------------------------------------------------------
alter table public.payout_requests
  -- The admin who raised this on the contributor's behalf. NULL means the
  -- contributor raised it themselves, which is the ordinary case.
  add column if not exists initiated_by uuid references auth.users (id),
  -- The payout this one replaces, when it is a re-initiation.
  add column if not exists reinitiated_from uuid references public.payout_requests (id),
  -- Why the original came back, carried onto the replacement for context.
  add column if not exists returned_reason text,
  -- Working-day estimate shown to the contributor. Derived, not typed.
  add column if not exists estimated_arrival date;

comment on column public.payout_requests.initiated_by is
  'Admin who raised this payout for the contributor. NULL when self-requested.';
comment on column public.payout_requests.reinitiated_from is
  'The returned payout this one replaces.';

create index if not exists payout_requests_reinitiated_from_idx
  on public.payout_requests (reinitiated_from);

-- --------------------------------------------------------------
-- Raise a payout for a contributor
-- --------------------------------------------------------------
create or replace function public.admin_initiate_payout(
  p_photographer_slug text,
  p_amount numeric,
  p_method text,
  p_details jsonb default '{}'::jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_balance numeric;
  v_id uuid;
begin
  if not public.caller_is_admin() then
    raise exception 'only an admin may initiate a payout on a contributor''s behalf';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'payout amount must be greater than zero';
  end if;

  select id, coalesce(payout_balance, 0) into v_profile_id, v_balance
    from public.profiles where slug = p_photographer_slug;

  if v_profile_id is null then
    raise exception 'no contributor with slug %', p_photographer_slug;
  end if;

  -- An assisted request is still a request against real money. Raising one for
  -- more than the contributor has would put a figure on their dashboard that
  -- the ledger cannot honour.
  if p_amount > v_balance then
    raise exception 'amount % exceeds the contributor''s available balance of %',
      p_amount, v_balance;
  end if;

  insert into public.payout_requests
    (photographer_id, amount, method, details, status, stage, initiated_by, admin_note)
  values
    (p_photographer_slug, p_amount, p_method, coalesce(p_details, '{}'::jsonb),
     'PENDING', 'requested', auth.uid(), p_note)
  returning id into v_id;

  insert into public.payout_events (payout_request_id, stage, note, created_by)
  values (v_id, 'requested',
          coalesce(p_note, 'Raised by NS CAPTURES on the contributor''s behalf.'),
          auth.uid());

  return v_id;
end;
$$;

-- --------------------------------------------------------------
-- Re-initiate a returned payout
-- --------------------------------------------------------------
create or replace function public.reinitiate_payout(
  p_payout_id uuid,
  p_method text default null,
  p_details jsonb default null,
  p_reason text default null,
  p_estimated_arrival date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.payout_requests%rowtype;
  v_id uuid;
begin
  if not public.caller_is_admin() then
    raise exception 'only an admin may re-initiate a payout';
  end if;

  select * into o from public.payout_requests where id = p_payout_id;
  if not found then
    raise exception 'no payout with id %', p_payout_id;
  end if;

  if o.stage not in ('returned', 'cancelled') then
    raise exception 'only a returned or cancelled payout can be re-initiated (this one is %)', o.stage;
  end if;

  if exists (select 1 from public.payout_requests where reinitiated_from = p_payout_id) then
    raise exception 'this payout has already been re-initiated';
  end if;

  -- The replacement carries the original amount. A re-initiation re-sends money
  -- that has already been accounted for; it must not become a way to enter a
  -- new figure. It also inherits debited_at, so approving it cannot debit the
  -- balance a second time for the same money.
  insert into public.payout_requests (
    photographer_id, amount, method, details, status, stage,
    initiated_by, reinitiated_from, returned_reason, estimated_arrival,
    payout_currency, conversion_rate, conversion_fee_percent, conversion_fee_amount,
    conversion_fee_bearer, conversion_fee_gbp, conversion_fee_status, conversion_fee_paid_at,
    converted_amount, debited_at, admin_note
  ) values (
    o.photographer_id, o.amount, coalesce(p_method, o.method),
    coalesce(p_details, o.details), 'APPROVED', 're_initiated',
    auth.uid(), o.id, p_reason, p_estimated_arrival,
    o.payout_currency, o.conversion_rate, o.conversion_fee_percent, o.conversion_fee_amount,
    o.conversion_fee_bearer, o.conversion_fee_gbp, o.conversion_fee_status, o.conversion_fee_paid_at,
    o.converted_amount, o.debited_at, o.admin_note
  ) returning id into v_id;

  insert into public.payout_events (payout_request_id, stage, note, created_by)
  values (v_id, 're_initiated',
          coalesce(p_reason, 'Payout re-initiated after the previous attempt was returned.'),
          auth.uid());

  -- Close the original so it cannot also look live.
  update public.payout_requests
     set stage = 'returned',
         status = 'REJECTED',
         returned_reason = coalesce(returned_reason, p_reason),
         processed_at = now()
   where id = p_payout_id;

  return v_id;
end;
$$;

revoke all on function public.admin_initiate_payout(text, numeric, text, jsonb, text) from public;
revoke all on function public.reinitiate_payout(uuid, text, jsonb, text, date) from public;
grant execute on function public.admin_initiate_payout(text, numeric, text, jsonb, text) to authenticated;
grant execute on function public.reinitiate_payout(uuid, text, jsonb, text, date) to authenticated;
