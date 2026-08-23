-- ============================================================
-- 040_notifications.sql
--
-- In-app notifications, with the three priority tiers the programme brief
-- describes:
--
--   high   — needs action: an acquisition offer, an agreement awaiting
--            signature, a payment problem, a security alert. Emailed too.
--   normal — worth knowing: approved, licensed, paid, awarded.
--   low    — ambient: general marketplace activity. In-app only.
--
-- Preferences live on the profile so a contributor can turn categories off
-- without a separate table to keep in step.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  category   text NOT NULL DEFAULT 'account'
             CHECK (category IN ('earnings', 'photography', 'acquisitions', 'publications', 'account')),
  priority   text NOT NULL DEFAULT 'normal'
             CHECK (priority IN ('high', 'normal', 'low')),

  title      text NOT NULL,
  body       text,
  /** Where clicking it should take the contributor, e.g. /account?tab=payouts */
  link       text,

  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_id, created_at DESC);

-- The unread count is read on every page, so it gets its own partial index.
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "People read their own notifications" ON public.notifications;
CREATE POLICY "People read their own notifications"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Marking as read is the only change someone makes to their own notifications.
DROP POLICY IF EXISTS "People mark their own notifications read" ON public.notifications;
CREATE POLICY "People mark their own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins write notifications" ON public.notifications;
CREATE POLICY "Admins write notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ------------------------------------------------------------
-- PREFERENCES
-- ------------------------------------------------------------
-- Null means "everything on". Stored as {category: {email: bool, inApp: bool}}
-- so a new category defaults to on rather than silently off.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
