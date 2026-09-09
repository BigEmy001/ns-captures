ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS allowed_licenses text[]
  DEFAULT ARRAY['COMMERCIAL', 'EDITORIAL', 'ROYALTY FREE', 'EXCLUSIVE'];

NOTIFY pgrst, 'reload schema';