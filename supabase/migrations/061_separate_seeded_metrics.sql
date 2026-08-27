-- Move seeded numbers out of the real-traffic columns.
--
-- views/likes/downloads were populated by import scripts, not by visitors: values
-- like 142000 and 96100, many of them exact multiples of 100, concentrated in the
-- Lexmond Dennis set and the seeded accounts. Nothing organic could have written
-- them — until migration 060 there was no grant that allowed it.
--
-- Leaving them there makes "Total = Hype + Real" add invented numbers to invented
-- numbers, and leaves nobody able to answer whether a photograph has been looked
-- at. So the seeded values move to the custom_* columns, where the platform
-- already keeps admin-set baselines, and the real columns start from zero.
--
-- This is deliberately display-neutral. A photo showing max(142000, 0) today
-- shows 142000 + 0 afterwards. Exactly one row in the library has both columns
-- populated (lexmond-dennis-photo-84), and summing is the correct handling for it
-- under the additive model that follows.

update public.photos
   set custom_views = coalesce(custom_views, 0) + coalesce(views, 0),
       views = 0
 where coalesce(views, 0) > 0;

update public.photos
   set custom_likes = coalesce(custom_likes, 0) + coalesce(likes, 0),
       likes = 0
 where coalesce(likes, 0) > 0;

update public.photos
   set custom_downloads = coalesce(custom_downloads, 0) + coalesce(downloads, 0),
       downloads = 0
 where coalesce(downloads, 0) > 0;

-- From here the columns mean different things, so say so.
comment on column public.photos.views is
  'Real views recorded by visitors via increment_photo_view(). Never set by hand.';
comment on column public.photos.likes is
  'Real likes, kept in step with user_likes via adjust_photo_likes(). Never set by hand.';
comment on column public.photos.downloads is
  'Real downloads recorded via increment_photo_download(). Never set by hand.';
comment on column public.photos.custom_views is
  'Admin-set Hype Engine baseline. Displayed total is custom_views + views.';
comment on column public.photos.custom_likes is
  'Admin-set Hype Engine baseline. Displayed total is custom_likes + likes.';
comment on column public.photos.custom_downloads is
  'Admin-set Hype Engine baseline. Displayed total is custom_downloads + downloads.';
