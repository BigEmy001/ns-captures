-- Real sizes for the curated collections.
--
-- collections.count is a stored number that nothing keeps in step with
-- collection_photos. Every collection on the site overstates itself: "West
-- Africa, Now" claims 148 photographs and holds 30; "New Perspectives" claims
-- 210 and holds 30. A buyer opening one finds a fifth of what the card promised.
--
-- Counting membership instead, the same way photographer_photo_counts does.
-- Only published photographs count — a collection should not advertise work
-- that is still in review.

create or replace function public.collection_photo_counts()
returns table (collection_id text, photo_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select cp.collection_id, count(*)::bigint
    from public.collection_photos cp
    join public.photos p on p.id = cp.photo_id
   where p.status = 'published'
   group by cp.collection_id;
$$;

comment on function public.collection_photo_counts is
  'Published photograph count per collection. collections.count is not maintained.';

revoke all on function public.collection_photo_counts() from public;
grant execute on function public.collection_photo_counts() to anon, authenticated;
