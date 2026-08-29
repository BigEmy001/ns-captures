-- Photographs people are actually looking at.
--
-- Real views have been recorded since the counters were fixed, and nothing in
-- the product surfaces them. This is the one signal on the platform that is not
-- a baseline someone set — it is worth showing, and it is the only ordering
-- that gets more convincing over time rather than less.
--
-- Deliberately reads photos.views alone and ignores custom_views. A trending
-- row driven by the Hype Engine would just be a list of whatever an admin
-- boosted, which nobody needs a query for.

create or replace function public.trending_photos(p_limit int default 12)
returns table (
  id text, title text, image text, photographer_id text, photographer_name text,
  price numeric, license text, category text, ratio text, orientation text,
  color text, real_views integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.image, p.photographer_id, p.photographer_name,
         p.price, p.license, p.category, p.ratio, p.orientation, p.color,
         coalesce(p.views, 0)
    from public.photos p
   where p.status = 'published'
     and coalesce(p.views, 0) > 0
   order by coalesce(p.views, 0) desc, p.uploaded_at desc
   limit greatest(1, least(p_limit, 48));
$$;

comment on function public.trending_photos is
  'Most-viewed published photographs by real traffic only. Ignores custom_views.';

revoke all on function public.trending_photos(int) from public;
grant execute on function public.trending_photos(int) to anon, authenticated;
