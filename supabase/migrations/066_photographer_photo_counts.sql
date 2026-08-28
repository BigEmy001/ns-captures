-- Portfolio sizes for the contributors section.
--
-- fetchPhotographers returned a hardcoded `images: 0`, so every card on the
-- landing page read "0 images" no matter how much work the photographer had.
-- The singular fetchPhotographer counted properly; the list never did.
--
-- Counting in the database rather than the browser: the alternative is pulling
-- every photo's photographer_id down on each home page load, which is over a
-- thousand rows to compute thirty-five numbers.

create or replace function public.photographer_photo_counts()
returns table (photographer_id text, photo_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.photographer_id, count(*)::bigint
    from public.photos p
   where p.status = 'published'
   group by p.photographer_id;
$$;

comment on function public.photographer_photo_counts is
  'Published photograph count per photographer, for the contributors listing.';

revoke all on function public.photographer_photo_counts() from public;
grant execute on function public.photographer_photo_counts() to anon, authenticated;
