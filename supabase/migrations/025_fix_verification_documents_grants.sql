-- ============================================================
-- 025_fix_verification_documents_grants.sql
-- Ensure verification_documents, user_saves, and user_likes
-- have proper GRANTs to anon, authenticated, and service_role.
--
-- Background: migration 011 added GRANT ALL on verification_documents,
-- but if 011 was skipped during initial setup the table only ended up
-- with REFERENCES/TRIGGER/TRUNCATE privileges (not SELECT/INSERT/...).
-- This caused "permission denied for table verification_documents"
-- when authenticated photographers tried to upload verification docs.
-- ============================================================

GRANT ALL ON TABLE public.verification_documents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_saves TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_likes TO anon, authenticated, service_role;

-- Flush PostgREST schema cache so the new privileges take effect immediately.
NOTIFY pgrst, 'reload schema';
