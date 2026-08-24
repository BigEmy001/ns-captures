-- ============================================================
-- 056_agreement_templates.sql
--
-- Issuing an agreement meant pasting the whole text into a textarea, once per
-- contributor. The contributor agreement is 27,756 characters. Done by hand
-- for each person, the only certainty is that two contributors eventually
-- sign subtly different documents and nobody notices which.
--
-- The text lives here instead, once, with a version. Issuing picks a template
-- rather than retyping one.
--
-- What it deliberately does not do is become the agreement itself. Each issued
-- agreement still keeps its own frozen copy of the body, because clause 37
-- (Version Control) only means anything if what someone signed stays what they
-- signed. Editing a template must never rewrite a signature that has already
-- been given, so a change here is a new version, and old agreements keep
-- pointing at their own text.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,
  title       text NOT NULL,
  version     text NOT NULL,
  body        text NOT NULL,
  -- Which version new agreements of this kind are issued from. One per kind.
  is_current  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (kind, version)
);

COMMENT ON TABLE public.agreement_templates IS
  'The text an agreement is issued from. Issued agreements keep their own copy, so editing a template never alters one already signed.';

CREATE UNIQUE INDEX IF NOT EXISTS agreement_templates_one_current
  ON public.agreement_templates (kind)
  WHERE is_current;

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

-- Only admins issue agreements, so only admins need the text.
DROP POLICY IF EXISTS "Admins read agreement templates" ON public.agreement_templates;
CREATE POLICY "Admins read agreement templates"
  ON public.agreement_templates FOR SELECT
  USING (public.caller_is_admin());

DROP POLICY IF EXISTS "Admins write agreement templates" ON public.agreement_templates;
CREATE POLICY "Admins write agreement templates"
  ON public.agreement_templates FOR ALL
  USING (public.caller_is_admin())
  WITH CHECK (public.caller_is_admin());

-- A policy without a grant is a table nobody can reach; 053 and 054 were both
-- entirely this mistake.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_templates TO authenticated;

NOTIFY pgrst, 'reload schema';
