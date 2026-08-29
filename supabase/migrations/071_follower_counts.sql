-- Follower counts that grow on the same schedule as views and likes.
--
-- photographers.custom_followers already exists as a baseline column, the same
-- shape as photos.custom_views. This makes it move on its own and adds the
-- counting function the profile header needs.
--
-- The count is a baseline plus real follows, so an actual visitor pressing
-- Follow moves the number they see. No row is written to user_follows: those
-- rows name a person, and the accounts available to name carry photographs of
-- real, identifiable people under invented names. A number on a profile is a
-- number; a browsable list of faces is a claim about who those people are.
--
-- The practical consequence is deliberate: the count can grow, and the list
-- cannot be opened.

-- photographers.custom_followers already exists, but as text holding display
-- strings like '14.8k' rather than a number. A separate integer column is used
-- for arithmetic rather than coercing that one, which would break on any value
-- that was never meant to be parsed.
alter table public.photographers
  add column if not exists follower_baseline integer not null default 0;

comment on column public.photographers.follower_baseline is
  'Follower baseline, a real integer. Displayed total is follower_baseline + real user_follows rows.';

-- --------------------------------------------------------------
-- Displayed follower counts
-- --------------------------------------------------------------
create or replace function public.photographer_follower_counts()
returns table (photographer_id text, follower_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         (coalesce(p.follower_baseline, 0) + count(f.follower_id))::bigint
    from public.photographers p
    left join public.user_follows f on f.following_id = p.id
   group by p.id, p.follower_baseline;
$$;

comment on function public.photographer_follower_counts is
  'Baseline plus real follows, per photographer. Used by the profile header.';

revoke all on function public.photographer_follower_counts() from public;
grant execute on function public.photographer_follower_counts() to anon, authenticated;

-- --------------------------------------------------------------
-- One pass of follower growth
-- --------------------------------------------------------------
create or replace function public.automate_follower_growth(p_force boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s          record;
  v_ceiling  int;
  v_share    numeric;
  v_moved    int := 0;
  v_added    int := 0;
  r          record;
  v_add      int;
begin
  select * into s from public.site_settings where id = 1;

  if not p_force and not coalesce(s.hype_engine_auto, false) then
    return 'skipped: automation is off';
  end if;

  -- Followers accrue far more slowly than views. Someone who follows a
  -- photographer has made a decision; a view is a glance.
  case coalesce(s.hype_engine_intensity, 'active')
    when 'subtle'     then v_share := 0.10; v_ceiling := 1;
    when 'aggressive' then v_share := 0.35; v_ceiling := 4;
    else                   v_share := 0.20; v_ceiling := 2;
  end case;

  for r in
    -- Only photographers with published work, weighted toward smaller
    -- followings so the gap between the biggest and smallest does not widen
    -- every hour forever.
    select ph.id
      from public.photographers ph
     where exists (
             select 1 from public.photos p
              where p.photographer_id = ph.id and p.status = 'published'
           )
       and random() < v_share
     order by random() / (1.0 + coalesce(ph.follower_baseline, 0) / 500.0)
  loop
    v_add := floor(power(random(), 2.2) * (v_ceiling + 1))::int;
    if v_add = 0 then
      continue;
    end if;

    update public.photographers
       set follower_baseline = coalesce(follower_baseline, 0) + v_add
     where id = r.id;

    v_moved := v_moved + 1;
    v_added := v_added + v_add;
  end loop;

  return format('%s photographers · +%s followers', v_moved, v_added);
end;
$$;

comment on function public.automate_follower_growth is
  'One pass of follower growth. Moves a count only — never writes to user_follows.';

revoke all on function public.automate_follower_growth(boolean) from public;
