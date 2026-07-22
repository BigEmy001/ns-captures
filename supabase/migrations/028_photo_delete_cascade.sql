-- 028_photo_delete_cascade.sql
-- When a photo is deleted, cascade remove all references so no orphan rows remain.
-- Affects purchases, licenses, moderation_queue. collection_photos already cascades (see 001_initial_schema.sql).
-- user_likes and user_saves have no FK constraint; the delete-photo Edge Function cleans them explicitly.

-- purchases.photo_id: add ON DELETE CASCADE
ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_photo_id_fkey;
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_photo_id_fkey
    FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;

-- licenses.photo_id: add ON DELETE CASCADE
ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_photo_id_fkey;
ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_photo_id_fkey
    FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;

-- moderation_queue.photo_id: add ON DELETE CASCADE
ALTER TABLE public.moderation_queue
  DROP CONSTRAINT IF EXISTS moderation_queue_photo_id_fkey;
ALTER TABLE public.moderation_queue
  ADD CONSTRAINT moderation_queue_photo_id_fkey
    FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;
