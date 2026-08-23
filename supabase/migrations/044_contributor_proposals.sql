-- ============================================================
-- 044_contributor_proposals.sql
--
-- The first stage of the programme: the invitation and acquisition proposal
-- NS CAPTURES sends to a photographer it has identified. It precedes the
-- contributor agreement, and it precedes the account — the recipient has no
-- login when they read it.
--
-- Two identifiers, deliberately:
--
--   reference — NSC-INV-00001, human readable, used in correspondence.
--   token     — unguessable, used in the URL. A sequential reference in a
--               public link would let anyone count upward and read every
--               proposal issued, including the names and addresses of people
--               being courted.
--
-- The public page never reads this table directly. RLS admits admins only;
-- the recipient goes through an edge function that validates the token with
-- the service role.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.proposal_ref_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.next_proposal_reference()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'NSC-INV-' || lpad(nextval('public.proposal_ref_seq')::text, 5, '0');
$$;

CREATE TABLE IF NOT EXISTS public.contributor_proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference   text UNIQUE NOT NULL DEFAULT public.next_proposal_reference(),
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),

  -- Who it is being sent to. They have no profile yet, so this is all we hold.
  email       text NOT NULL,
  name        text NOT NULL,
  location    text,
  occupation  text,

  -- The exact text they were shown, kept so a later revision of the template
  -- never rewrites what someone actually accepted.
  body        text,

  status      text NOT NULL DEFAULT 'issued'
              CHECK (status IN ('issued', 'viewed', 'accepted', 'declined', 'expired')),

  issued_at    timestamptz NOT NULL DEFAULT now(),
  viewed_at    timestamptz,
  responded_at timestamptz,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- The account acceptance produced, so the invitation and the contributor
  -- stay connected.
  created_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON public.contributor_proposals (status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_email
  ON public.contributor_proposals (lower(email));

ALTER TABLE public.contributor_proposals ENABLE ROW LEVEL SECURITY;

-- Admins only. The recipient reaches theirs through the edge function, which
-- uses the service role after checking the token.
DROP POLICY IF EXISTS "Admins manage proposals" ON public.contributor_proposals;
CREATE POLICY "Admins manage proposals"
  ON public.contributor_proposals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

GRANT SELECT, INSERT, UPDATE ON public.contributor_proposals TO authenticated;
GRANT ALL ON public.contributor_proposals TO service_role;

-- Deliberately no grant to anon: a proposal is never readable straight from
-- the API, only through the token-checked edge function.

NOTIFY pgrst, 'reload schema';
