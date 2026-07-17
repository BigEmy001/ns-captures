-- Reconcile legacy profile slugs with the canonical photographer IDs.
-- Run after 003_identity_and_security.sql.

-- Existing records may contain a legacy slug (for example, "namnso") while
-- photos use the canonical directory ID ("namnso-ukpanah"). Reconcile by
-- photographer name before restoring the immutable-slug trigger.
drop trigger if exists profiles_slug_immutable on public.profiles;

update public.profiles p
set slug = ph.id
from public.photographers ph
where p.role = 'Photographer'
  and lower(trim(p.name)) = lower(trim(ph.name))
  and p.slug is distinct from ph.id;

-- Ensure Haru's existing auth account has the public photographer profile
-- required by the dashboard and ownership policies.
insert into public.profiles (id, name, role, slug, plan, avatar, member_since, downloads_left)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', 'Haru Tanaka'),
  'Photographer',
  'haru-tanaka',
  coalesce(u.raw_user_meta_data ->> 'plan', 'Contributor'),
  coalesce(u.raw_user_meta_data ->> 'avatar', ''),
  to_char(coalesce(u.created_at, now()), 'Mon YYYY'),
  'N/A'
from auth.users u
where lower(u.email) = 'haru@ns.co'
  and exists (select 1 from public.photographers where id = 'haru-tanaka')
on conflict (id) do update
set role = 'Photographer', slug = 'haru-tanaka';

create trigger profiles_slug_immutable
  before update of slug on public.profiles
  for each row execute function public.prevent_profile_slug_change();
