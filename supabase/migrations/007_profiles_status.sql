-- Add status column to profiles for admin account management
alter table public.profiles add column if not exists status text not null default 'Active' check (status in ('Active', 'Pending', 'Suspended'));

-- Sync status from handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_slug text;
begin
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  ));
  insert into public.profiles (id, name, role, slug, plan, email, avatar, member_since, downloads_left, status)
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
    '50',
    'Active'
  );
  return new;
end;
$$ language plpgsql security definer;
