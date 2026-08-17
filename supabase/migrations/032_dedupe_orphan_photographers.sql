-- 032_dedupe_orphan_photographers.sql
-- Removes duplicate public.photographers rows that share a display name with a
-- real photographer but carry no data of their own.
--
-- !! Deletes rows. Review the SELECT below against production before applying.
--
-- Two such duplicates exist at time of writing:
--   '-exmond-ennis-94b4631a'  duplicate of 'lexmond-dennis'  (0 photos, no profile)
--   'namnso'                  duplicate of 'namnso-ukpanah'  (0 photos, no profile)
--
-- These are why the admin user modal could cross-attribute photos when it
-- matched on display name. The application-side fix (matching strictly on
-- profiles.slug) already removes that behaviour; this migration cleans up the
-- rows so the duplicate names stop appearing in admin lists at all.
--
-- The delete is conservative by construction: a row is only removed when it has
-- no photos, no linked profile, no payment methods, no payout history, and at
-- least one other photographer row shares its name. Anything holding data is
-- left in place for a manual merge.

BEGIN;

CREATE TEMP TABLE orphan_photographers ON COMMIT DROP AS
SELECT g.id, g.name
FROM public.photographers g
WHERE NOT EXISTS (SELECT 1 FROM public.photos p WHERE p.photographer_id = g.id)
  AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.slug = g.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.photographer_payment_methods m WHERE m.photographer_id = g.id
  )
  AND NOT EXISTS (SELECT 1 FROM public.payout_requests q WHERE q.photographer_id = g.id)
  AND NOT EXISTS (SELECT 1 FROM public.payouts o WHERE o.photographer_id = g.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.photographer_profiles pp WHERE pp.user_id = g.id
  )
  -- only when a namesake row still exists to inherit the identity
  AND EXISTS (
    SELECT 1 FROM public.photographers other
    WHERE lower(trim(other.name)) = lower(trim(g.name))
      AND other.id <> g.id
  );

-- Inspect before committing:
--   SELECT * FROM orphan_photographers;

DELETE FROM public.photographers g
USING orphan_photographers o
WHERE g.id = o.id;

COMMIT;
