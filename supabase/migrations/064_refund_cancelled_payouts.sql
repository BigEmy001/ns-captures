-- Give the money back when a payout is called off.
--
-- The balance is debited in full the moment a payout is approved. Nothing in
-- the platform ever credited it back: cancelling or rejecting an approved
-- payout changed its status, sent the contributor a notification, and left the
-- money gone. One contributor has already lost £10,000 this way.
--
-- `returned` is deliberately NOT refunded here. A returned transfer is expected
-- to be re-initiated, and reinitiate_payout carries debited_at onto the
-- replacement so the money is not debited twice. Refunding on return would
-- force the replacement to debit again and open a window for a double debit.
-- The money comes back when a returned payout is finally cancelled instead.

alter table public.payout_requests
  -- Set when the debit has been given back. Its presence stops a second refund,
  -- exactly as debited_at stops a second debit.
  add column if not exists refunded_at timestamptz;

comment on column public.payout_requests.refunded_at is
  'When the debited amount was returned to the balance. Prevents a double refund.';

create or replace function public.refund_payout(
  p_payout_id uuid,
  p_reason text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.payout_requests%rowtype;
  v_user uuid;
begin
  if not public.caller_is_admin() then
    raise exception 'only an admin may refund a payout';
  end if;

  select * into o from public.payout_requests where id = p_payout_id for update;
  if not found then
    raise exception 'no payout with id %', p_payout_id;
  end if;

  -- Only a payout that is actually over, and actually took money.
  if o.stage not in ('cancelled', 'rejected') then
    raise exception 'only a cancelled or rejected payout can be refunded (this one is %)', o.stage;
  end if;

  if o.debited_at is null then
    -- Nothing was ever taken, so there is nothing to give back. Not an error:
    -- most payouts end before approval and this is the ordinary case.
    return 0;
  end if;

  if o.refunded_at is not null then
    return 0;
  end if;

  select id into v_user from public.profiles where slug = o.photographer_id;
  if v_user is null then
    raise exception 'no contributor with slug %', o.photographer_id;
  end if;

  perform public.adjust_payout_balance(
    v_user,
    o.amount,
    coalesce(p_reason, 'Payout cancelled, amount returned: request ' || o.id::text),
    auth.uid()
  );

  update public.payout_requests
     set refunded_at = now(),
         -- The money is back on the balance, so this payout no longer holds a
         -- debit. Clearing it keeps the two flags telling the same story.
         debited_at = null
   where id = p_payout_id;

  insert into public.payout_events (payout_request_id, stage, note, created_by)
  values (p_payout_id, o.stage,
          coalesce(p_reason, 'Amount returned to the available balance.'),
          auth.uid());

  return o.amount;
end;
$$;

revoke all on function public.refund_payout(uuid, text) from public;
grant execute on function public.refund_payout(uuid, text) to authenticated;
