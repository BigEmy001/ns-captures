-- 018_fix_table_privileges.sql
-- Grant INSERT and UPDATE privileges to the 'authenticated' role on all necessary tables
-- so that RLS policies can function properly without hitting "permission denied for table" errors.

GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photographers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collection_photos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.briefs TO authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photos TO authenticated;
