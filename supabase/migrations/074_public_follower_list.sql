-- The follower list a profile page can show, and letting members follow.
--
-- user_follows has one SELECT policy — auth.uid() = follower_id — so you can
-- see follows you made and nothing else. That is right for the table, but it
-- means a photographer's follower list cannot be read by anyone, the
-- photographer included.
--
-- A function rather than a looser policy: this returns a name and an avatar,
-- not the row, so opening one list does not also expose who else somebody
-- follows across the platform.

create or replace function public.photographer_followers(
  p_photographer_id text,
  p_limit int default 24
)
returns table (name text, avatar text, country text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(pr.name, 'Member'), coalesce(pr.avatar, ''), coalesce(pr.country, '')
    from public.user_follows f
    join public.profiles pr on pr.id::text = f.follower_id
   where f.following_id = p_photographer_id
   order by f.created_at desc nulls last
   limit greatest(1, least(p_limit, 60));
$$;

comment on function public.photographer_followers is
  'Recent followers of one photographer — display fields only, never the follow rows.';

revoke all on function public.photographer_followers(text, int) from public;
grant execute on function public.photographer_followers(text, int) to anon, authenticated;

-- --------------------------------------------------------------
-- Members following members
-- --------------------------------------------------------------
-- The INSERT policy allowed any authenticated caller to write any row,
-- including one attributing the follow to somebody else. Tightened to the
-- caller's own id, which is what the DELETE policy already required.
drop policy if exists "Users can follow" on public.user_follows;
create policy "Users can follow" on public.user_follows
  for insert to authenticated
  with check (auth.uid()::text = follower_id);

-- A member needs to know whether they already follow someone before the button
-- can render correctly, and the SELECT policy above already covers that: it
-- returns their own follow rows. Nothing further is needed for the button.
