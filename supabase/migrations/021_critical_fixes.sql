-- ============================================================
-- 021_critical_fixes.sql
-- Fixes: user_follows table, handle_new_user trigger,
-- RLS policies, site_settings INSERT, security grants
-- ============================================================

-- 1. Create user_follows table (follow/unfollow was completely broken)
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid()::text = follower_id);

CREATE POLICY "Users can follow"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid()::text = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid()::text = follower_id);

-- 2. Fix handle_new_user trigger to include slug and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_name text;
  user_role text;
  user_slug text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'name', 'User');
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'Buyer');

  -- Generate slug for Photographers
  IF user_role = 'Photographer' THEN
    user_slug := lower(regexp_replace(user_name, '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(NEW.id::text, 1, 8);
  ELSE
    user_slug := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, name, email, role, slug, plan, avatar, member_since,
    downloads_left, verification_status, status
  ) VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_role,
    user_slug,
    'Starter',
    NULL,
    to_char(now(), 'Mon YYYY'),
    '10',
    'unverified',
    'Active'
  );

  -- Also create photographers row for Photographer role
  IF user_role = 'Photographer' THEN
    INSERT INTO public.photographers (id, name, avatar)
    VALUES (user_slug, user_name, NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add RLS policies for collection_photos (INSERT/DELETE were blocked)
CREATE POLICY "Authenticated users can add photos to collections"
  ON public.collection_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can remove photos from collections"
  ON public.collection_photos FOR DELETE
  TO authenticated
  USING (true);

-- 4. Add RLS policies for collections (UPDATE was blocked)
CREATE POLICY "Authenticated users can update their collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (true);

-- 5. Add RLS policies for briefs (INSERT/UPDATE were blocked)
CREATE POLICY "Authenticated users can create briefs"
  ON public.briefs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update briefs"
  ON public.briefs FOR UPDATE
  TO authenticated
  USING (true);

-- 6. Add INSERT policy for site_settings (upsert fails without it)
CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. Fix admin_payment_methods: remove overly permissive GRANT to anon
REVOKE ALL ON public.admin_payment_methods FROM anon;
GRANT SELECT ON public.admin_payment_methods TO anon;

-- 8. Fix overly-permissive SELECT policies on purchases, licenses, activity_log
-- Drop the overly broad "any authenticated user can read all rows" policies
DROP POLICY IF EXISTS "Authenticated can view purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated can view licenses" ON public.licenses;
DROP POLICY IF EXISTS "Authenticated can view activity" ON public.activity_log;

-- 9. Create increment_collection_count RPC (referenced in db.ts but never defined)
CREATE OR REPLACE FUNCTION public.increment_collection_count(collection_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.collections SET count = count + 1 WHERE id = collection_id;
$$;

-- 10. Add allowed_licenses column to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS allowed_licenses text[] DEFAULT array['COMMERCIAL', 'EDITORIAL', 'ROYALTY FREE', 'EXCLUSIVE'];

-- 11. Create delete_user_by_admin RPC
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify executor is Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  DELETE FROM auth.users WHERE id = target_uid;
END;
$$;

-- 12. Create trigger to update photographer balance on purchase approval
CREATE OR REPLACE FUNCTION public.on_purchase_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_photographer_id text;
  v_commission_pct integer;
  v_payout_amount integer;
BEGIN
  -- Only execute on transition to APPROVED status
  IF (NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED')) THEN
    -- If there's no photo_id, it is a verification fee purchase - do not credit a photographer
    IF NEW.photo_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get photographer ID of the photo
    SELECT photographer_id INTO v_photographer_id FROM public.photos WHERE id = NEW.photo_id;

    IF v_photographer_id IS NOT NULL THEN
      -- Get commission percentage
      SELECT COALESCE(default_commission, 70) INTO v_commission_pct FROM public.site_settings WHERE id = 1;

      -- Calculate photographer share
      v_payout_amount := round(NEW.price * (v_commission_pct / 100.0));

      -- Update photographer balance and earnings
      UPDATE public.photographers
      SET earnings = COALESCE(earnings, 0) + v_payout_amount,
          balance = COALESCE(balance, 0) + v_payout_amount
      WHERE id = v_photographer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_purchase_approved ON public.purchases;
CREATE TRIGGER tr_on_purchase_approved
  AFTER UPDATE OF status ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.on_purchase_approved();

-- 13. Create trigger to deduct photographer balance on payout approval
CREATE OR REPLACE FUNCTION public.on_payout_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only execute on transition to APPROVED/PAID status
  IF ((NEW.status = 'APPROVED' OR NEW.status = 'PAID') AND (OLD.status = 'PENDING')) THEN
    UPDATE public.photographers
    SET balance = COALESCE(balance, 0) - NEW.amount
    WHERE id = NEW.photographer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_payout_approved ON public.payout_requests;
CREATE TRIGGER tr_on_payout_approved
  AFTER UPDATE OF status ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_payout_approved();

