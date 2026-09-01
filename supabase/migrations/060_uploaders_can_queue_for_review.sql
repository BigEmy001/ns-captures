-- ============================================================
-- 060_uploaders_can_queue_for_review.sql
--
-- A photograph uploaded while moderation is on was disappearing.
--
-- The upload writes the photograph with status 'pending_review' and then calls
-- submitPhotoForReview, which inserts the row the admin's review screen reads.
-- authenticated holds the INSERT grant on moderation_queue, but the only
-- policy on the table is "Admins can manage moderation queue" — an ALL policy
-- whose USING expression also governs the check. A contributor is not an
-- admin, so their insert was refused.
--
-- The refusal went nowhere. submitPhotoForReview logs to console and returns
-- false, and the caller ignores the return value, so the wizard reported a
-- successful submission. The photograph was then in a state no one could act
-- on: not published, so no buyer saw it; not in the queue, so no admin saw it.
-- Only the uploader saw it, marked "Under Review", indefinitely.
--
-- Junghoon Sung's "Workshop After Hours" (upload-1787495107835) is the one
-- that reached us this way.
--
-- The policy below lets a contributor queue a photograph that is theirs and
-- no one else's, matching ownership the same way the photos INSERT policy
-- does — photographer_id against the caller's profile slug. It deliberately
-- grants nothing else: reading, approving and rejecting stay with the admin.
-- ============================================================

DROP POLICY IF EXISTS "Uploaders can queue their own photograph" ON public.moderation_queue;

CREATE POLICY "Uploaders can queue their own photograph"
  ON public.moderation_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.photos p
      WHERE p.id = moderation_queue.photo_id
        AND p.photographer_id = (SELECT profiles.slug FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

COMMENT ON POLICY "Uploaders can queue their own photograph" ON public.moderation_queue IS
  'Lets a contributor put their own photograph in front of the review team. Ownership matches the photos INSERT policy: photographer_id against the caller profile slug. Reading and deciding the queue remain with administrators.';

NOTIFY pgrst, 'reload schema';
