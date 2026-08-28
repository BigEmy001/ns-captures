-- Give download earnings their own name.
--
-- `adjustment` was doing two unrelated jobs: 242 rows are downloads credited
-- against a photograph, and 6 are an admin correcting someone's balance by hand.
-- A contributor opening their earnings history saw both filed under
-- "Adjustments", which reads like the platform fiddling with their money rather
-- than like being paid for their work.
--
-- Splitting them lets each be labelled for what it is, and lets the admin side
-- and any accounting export tell a download credit from a manual correction.

alter table public.contributor_earnings drop constraint if exists contributor_earnings_type_check;
alter table public.contributor_earnings add constraint contributor_earnings_type_check
  check (type = any (array[
    'licensing', 'acquisition', 'bonus', 'award', 'adjustment', 'download'
  ]));

-- What separates the two is where the credit came from, not whether a photo id
-- was recorded: 79 of these went through the fallback path, which credits the
-- balance without attaching the photograph. The description is the reliable
-- marker, and `ledgerLabel` already rewrites it before a contributor sees it.
update public.contributor_earnings
   set type = 'download'
 where type = 'adjustment'
   and description ilike 'Hype Engine%';

comment on column public.contributor_earnings.type is
  'licensing = marketplace sale; download = credited against a photograph; '
  'acquisition/bonus/award = programme; adjustment = manual correction by an admin.';
