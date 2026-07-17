-- Add email to profiles so admin panel can query it client-side
alter table public.profiles add column if not exists email text;

-- Sync email from auth.users on every sign-in via the existing trigger
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_slug text;
begin
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  ));

  insert into public.profiles (id, name, role, slug, plan, email, avatar, member_since, downloads_left)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Buyer'),
    case when coalesce(new.raw_user_meta_data ->> 'role', 'Buyer') = 'Photographer'
    then nullif(trim(both '-' from base_slug), '') || '-' || left(new.id::text, 8) else null end,
    coalesce(new.raw_user_meta_data ->> 'plan', 'Starter'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150'),
    to_char(now(), 'Mon YYYY'),
    '50'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill email for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
and p.email is null;

create or replace function public.sync_profile_email()
returns trigger as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
