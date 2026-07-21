-- Fix: Grant anon/authenticated access to all public tables
-- Then seed data

-- GRANTs for anon (public read) on browsable tables
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.photographers TO anon;
GRANT SELECT ON public.photos TO anon;
GRANT SELECT ON public.collections TO anon;
GRANT SELECT ON public.collection_photos TO anon;
GRANT SELECT ON public.briefs TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.moderation_queue TO anon;

-- GRANTs for authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.photographers TO authenticated;
GRANT SELECT ON public.photos TO authenticated;
GRANT SELECT ON public.collections TO authenticated;
GRANT SELECT ON public.collection_photos TO authenticated;
GRANT SELECT ON public.briefs TO authenticated;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.licenses TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moderation_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payouts TO authenticated;
GRANT ALL ON public.verification_documents TO anon, authenticated, service_role;
GRANT ALL ON public.user_saves TO anon, authenticated, service_role;
GRANT ALL ON public.user_likes TO anon, authenticated, service_role;

-- Allow authenticated photographers to insert/update photos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
