-- Follower growth as actual rows, from the community pool.
--
-- automate_follower_growth previously moved a counter, because the pool's
-- avatars were photographs of real, identifiable people and a browsable list
-- would have put their faces against actions they never took. Those avatars are
-- now illustrated and depict nobody, so the follows can be real rows: the count
-- is derived rather than asserted, and the list can be opened.
--
-- Only accounts flagged is_synthetic are ever used as followers. A real
-- member's account is never made to follow anyone on their behalf.

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
  v_inserted int;
begin
  select * into s from public.site_settings where id = 1;

  if not p_force and not coalesce(s.hype_engine_auto, false) then
    return 'skipped: automation is off';
  end if;

  -- Followers accrue far more slowly than views. Someone following a
  -- photographer has made a decision; a view is a glance.
  case coalesce(s.hype_engine_intensity, 'active')
    when 'subtle'     then v_share := 0.10; v_ceiling := 1;
    when 'aggressive' then v_share := 0.35; v_ceiling := 4;
    else                   v_share := 0.20; v_ceiling := 2;
  end case;

  for r in
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

    -- Draw from the pool, skipping anyone already following this photographer.
    -- ON CONFLICT covers the race; the NOT EXISTS keeps the sample useful.
    -- user_follows.follower_id is text while profiles.id is uuid, so the
    -- comparison and the insert both go through an explicit cast.
    with picked as (
      select p.id::text as follower_id
        from public.profiles p
       where p.is_synthetic
         and not exists (
               select 1 from public.user_follows f
                where f.follower_id = p.id::text and f.following_id = r.id
             )
       order by random()
       limit v_add
    )
    insert into public.user_follows (follower_id, following_id, created_at)
    select follower_id,
           r.id,
           -- Scatter across the hour rather than landing on one timestamp.
           now() - (random() * interval '55 minutes')
      from picked
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      v_moved := v_moved + 1;
      v_added := v_added + v_inserted;
    end if;
  end loop;

  return format('%s photographers · +%s followers', v_moved, v_added);
end;
$$;

comment on function public.automate_follower_growth is
  'One pass of follower growth. Inserts user_follows rows from the is_synthetic pool only.';

revoke all on function public.automate_follower_growth(boolean) from public;
