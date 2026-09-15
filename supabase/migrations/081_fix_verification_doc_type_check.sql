-- ============================================================
-- 081_fix_verification_doc_type_check.sql
-- Relax check constraint on verification_documents to accept
-- both 'drivers_license' and 'driver_license', plus 'other'.
-- ============================================================

ALTER TABLE public.verification_documents
  DROP CONSTRAINT IF EXISTS verification_documents_document_type_check;

ALTER TABLE public.verification_documents
  ADD CONSTRAINT verification_documents_document_type_check
  CHECK (document_type IN ('passport', 'drivers_license', 'driver_license', 'national_id', 'other'));

NOTIFY pgrst, 'reload schema';

