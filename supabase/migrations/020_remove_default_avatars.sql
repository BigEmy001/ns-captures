-- Update handle_new_user to use empty string for avatar instead of unsplash image
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, role, plan, avatar, member_since, downloads_left, verification_status
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'role', 'Buyer'),
    COALESCE(new.raw_user_meta_data ->> 'plan', 'Starter'),
    COALESCE(new.raw_user_meta_data ->> 'avatar', ''),
    TO_CHAR(NOW(), 'Mon YYYY'),
    '50',
    'unverified'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing default avatars
UPDATE public.profiles 
SET avatar = '' 
WHERE avatar LIKE '%1534528741775%';

UPDATE public.photographers 
SET avatar = '' 
WHERE avatar LIKE '%1534528741775%';
