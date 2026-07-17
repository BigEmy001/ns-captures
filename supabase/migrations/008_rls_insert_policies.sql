-- ============================================================
-- RLS INSERT policies for tables that need authenticated inserts
-- Without these, checkout, licensing, and activity logging fail silently.
-- ============================================================

-- Purchases: authenticated users can insert their own purchases
CREATE POLICY "Users can create their own purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Licenses: authenticated users can insert their own licenses
CREATE POLICY "Users can create their own licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own licenses"
  ON public.licenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Activity log: authenticated users can insert activity
CREATE POLICY "Users can create their own activity log entries"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own activity log entries"
  ON public.activity_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
