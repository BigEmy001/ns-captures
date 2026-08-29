-- Tell generated accounts apart from real ones.
--
-- Two thousand accounts were generated for testing. They are inert — between
-- them they own no purchase, licence, like, save, notification or earning — but
-- they are 99% of the profiles table, and the admin console had no way to tell
-- them from the twenty-two real accounts.
--
-- A column rather than a rule over the email domain: the domain is how these
-- particular ones were made, not what they are. A flag survives someone
-- generating the next batch differently, and can be cleared if an account
-- turns out to be real after all.

alter table public.profiles
  add column if not exists is_synthetic boolean not null default false;

comment on column public.profiles.is_synthetic is
  'Generated for testing. Hidden from the admin console and excluded from platform counts.';

-- Backfill the batch generated on 28 August 2026, identified by the address
-- their generator used. Nothing real has ever used that domain.
update public.profiles
   set is_synthetic = true
 where email like '%@ns-captures.internal';

create index if not exists profiles_is_synthetic_idx
  on public.profiles (is_synthetic)
  where is_synthetic;
