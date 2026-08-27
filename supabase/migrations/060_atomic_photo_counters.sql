-- Real traffic counters.
--
-- Two problems this fixes.
--
-- First, nothing could write these columns. `photos` carries no UPDATE grant for
-- anon or authenticated (deliberately — that grant would also let a visitor
-- rewrite price and license), so every increment the client attempted came back
-- "permission denied for table photos" and was thrown away by a caller that
-- ignored the error. Views have therefore never been recorded.
--
-- Second, the client incremented by reading the row and writing back value + 1.
-- Two visitors landing together both read the same number and one of the visits
-- disappears. These functions do the arithmetic inside the UPDATE so the database
-- serialises it.
--
-- SECURITY DEFINER with a pinned search_path lets anon run exactly these three
-- statements and nothing else. Each takes only a photo id and can only ever add
-- one to a single counter.

create or replace function public.increment_photo_view(p_photo_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.photos
     set views = coalesce(views, 0) + 1
   where id = p_photo_id;
$$;

create or replace function public.increment_photo_download(p_photo_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.photos
     set downloads = coalesce(downloads, 0) + 1
   where id = p_photo_id;
$$;

-- Likes move both ways. The caller owns the user_likes row; this only keeps the
-- denormalised counter on photos in step, and refuses to go below zero.
create or replace function public.adjust_photo_likes(p_photo_id text, p_delta int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.photos
     set likes = greatest(coalesce(likes, 0) + p_delta, 0)
   where id = p_photo_id;
$$;

revoke all on function public.increment_photo_view(text) from public;
revoke all on function public.increment_photo_download(text) from public;
revoke all on function public.adjust_photo_likes(text, int) from public;

grant execute on function public.increment_photo_view(text) to anon, authenticated;
grant execute on function public.increment_photo_download(text) to anon, authenticated;
-- Liking requires an account, so authenticated only.
grant execute on function public.adjust_photo_likes(text, int) to authenticated;
