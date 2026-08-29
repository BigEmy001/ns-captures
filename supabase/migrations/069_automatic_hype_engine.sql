-- Scheduled view and like activity.
--
-- The Hype Engine sets a display baseline on a photograph by hand. Doing that
-- across a library of this size is not practical, so this applies it on a
-- schedule instead.
--
-- Two things it deliberately does not do.
--
-- It never touches custom_downloads. That column credits the contributor
-- ledger as immediately withdrawable money — at the rates discussed, an hourly
-- job would mint six figures a day against £1,247 of real sales. Downloads are
-- absent here by design, not behind a toggle.
--
-- It never writes to user_likes or user_follows. Those rows name a person, and
-- the only accounts available to name are generated ones. A count on a
-- photograph is a number; a name and a face beside it is a claim about someone
-- who exists.

alter table public.site_settings
  add column if not exists hype_engine_auto boolean not null default false,
  add column if not exists hype_engine_intensity text not null default 'active',
  add column if not exists hype_engine_last_run timestamptz,
  add column if not exists hype_engine_last_summary text;

alter table public.site_settings drop constraint if exists site_settings_hype_intensity_check;
alter table public.site_settings add constraint site_settings_hype_intensity_check
  check (hype_engine_intensity in ('subtle', 'active', 'aggressive'));

comment on column public.site_settings.hype_engine_auto is
  'Whether the scheduled view/like activity runs. Never affects downloads.';
comment on column public.site_settings.hype_engine_intensity is
  'subtle | active | aggressive — scales the subset size and the view ceiling.';

-- --------------------------------------------------------------
-- One pass of activity
-- --------------------------------------------------------------
create or replace function public.automate_hype_engine(p_force boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s              record;
  v_share_lo     numeric;
  v_share_hi     numeric;
  v_ceiling      int;
  v_subset       int;
  v_total        int;
  v_photos       int := 0;
  v_views        int := 0;
  v_likes        int := 0;
  r              record;
  v_add_views    int;
  v_add_likes    int;
  v_summary      text;
begin
  select * into s from public.site_settings where id = 1;

  -- p_force is the admin's "run now" button. The schedule respects the toggle.
  if not p_force and not coalesce(s.hype_engine_auto, false) then
    return 'skipped: automation is off';
  end if;

  case coalesce(s.hype_engine_intensity, 'active')
    when 'subtle'     then v_share_lo := 0.08; v_share_hi := 0.12; v_ceiling := 6;
    when 'aggressive' then v_share_lo := 0.30; v_share_hi := 0.40; v_ceiling := 28;
    else                   v_share_lo := 0.15; v_share_hi := 0.25; v_ceiling := 15;
  end case;

  select count(*) into v_total from public.photos where status = 'published';
  if v_total = 0 then
    return 'skipped: nothing published';
  end if;

  v_subset := greatest(1, round(v_total * (v_share_lo + random() * (v_share_hi - v_share_lo))));

  for r in
    -- A weighted sample, so a different slice moves each run. Recent and
    -- featured work surfaces more often, which is how a front page behaves.
    with pool as (
      select id,
             random() / (
               1.0
               + case when uploaded_at > now() - interval '45 days' then 0.8 else 0 end
               + case when coalesce(featured, false) then 0.5 else 0 end
             ) as sort_key
        from public.photos
       where status = 'published'
    )
    select id from pool order by sort_key limit v_subset
  loop
    -- Long-tailed rather than uniform: most photographs get almost nothing and
    -- a few get a lot. A flat spread averages the ceiling in half on every row,
    -- which is the shape that gives a script away.
    v_add_views := floor(power(random(), 2.6) * v_ceiling)::int;

    -- Likes are far rarer, and can never outrun the views they came with.
    v_add_likes := case
                     when v_add_views = 0 or random() > 0.35 then 0
                     else least(v_add_views, floor(power(random(), 3.0) * 3)::int)
                   end;

    if v_add_views = 0 and v_add_likes = 0 then
      continue;
    end if;

    update public.photos
       set custom_views = coalesce(custom_views, 0) + v_add_views,
           custom_likes = coalesce(custom_likes, 0) + v_add_likes
     where id = r.id;

    v_photos := v_photos + 1;
    v_views  := v_views + v_add_views;
    v_likes  := v_likes + v_add_likes;
  end loop;

  v_summary := format('%s photographs · +%s views · +%s likes', v_photos, v_views, v_likes);

  update public.site_settings
     set hype_engine_last_run = now(),
         hype_engine_last_summary = v_summary
   where id = 1;

  return v_summary;
end;
$$;

comment on function public.automate_hype_engine is
  'One pass of scheduled view/like activity. Never touches downloads, user_likes or user_follows.';

revoke all on function public.automate_hype_engine(boolean) from public;
-- The admin console calls it directly for the "run now" button; the guard is
-- inside the function's caller check below.
grant execute on function public.automate_hype_engine(boolean) to authenticated;

-- --------------------------------------------------------------
-- Admin-only wrapper for the "run now" button
-- --------------------------------------------------------------
create or replace function public.run_hype_engine_now()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.caller_is_admin() then
    raise exception 'only an admin may run the hype engine';
  end if;
  return public.automate_hype_engine(true);
end;
$$;

revoke all on function public.run_hype_engine_now() from public;
grant execute on function public.run_hype_engine_now() to authenticated;

-- Only the scheduler and admins should reach the unguarded one.
revoke execute on function public.automate_hype_engine(boolean) from authenticated;
