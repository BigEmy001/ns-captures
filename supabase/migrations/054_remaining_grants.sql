-- ============================================================
-- 054_remaining_grants.sql
--
-- The rest of the gap 053 started on, found by comparing every table the
-- frontend touches, and how, against what the database actually permits.
--
-- The worst of them: settings could not be saved at all. updateSiteSettings
-- upserts, and INSERT ... ON CONFLICT needs the INSERT privilege whether or
-- not the row already exists. authenticated had SELECT and UPDATE but not
-- INSERT, so every save failed on the whole statement — the maintenance
-- toggle, the platform fee, the contact address, all of it.
--
-- And site_settings repeated the pattern 053 dealt with: an INSERT policy of
-- WITH CHECK (true), named for admins but checking nobody. Granting INSERT
-- against that would have let any signed-in person write the platform's
-- settings, so the check is written first.
--
-- The other two carry proper admin checks already and only lacked the grant.
-- ============================================================

-- ---- site_settings: tighten, then grant --------------------------------
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.caller_is_admin());

GRANT INSERT ON public.site_settings TO authenticated;

-- ---- Granted: policies already check who is asking ---------------------
-- Both are "Admins write ..." with a real role test on the caller.
GRANT INSERT, UPDATE, DELETE ON public.publication_entries TO authenticated;
GRANT DELETE ON public.moderation_queue TO authenticated;

NOTIFY pgrst, 'reload schema';
