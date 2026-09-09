-- Use the security-definer admin check for settings writes. The original
-- policy queried profiles directly, which can be filtered by profiles RLS.

DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;

CREATE POLICY "Admins can update settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.caller_is_admin())
  WITH CHECK (public.caller_is_admin());

GRANT UPDATE ON public.site_settings TO authenticated;

NOTIFY pgrst, 'reload schema';