-- =====================================================
-- EMAIL-BASED DATA LINKING MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create unique index on email (allows NULL but unique non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- 3. Backfill existing profiles with email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Update existing profiles to use email-based account_id
UPDATE profiles p
SET account_id = 'account_' || email
WHERE email IS NOT NULL AND account_id NOT LIKE 'account_%@%';

-- 5. Update the trigger to handle new users and link to existing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_profile_id UUID;
BEGIN
  -- Check if a profile already exists for this email
  SELECT id INTO existing_profile_id FROM public.profiles WHERE email = new.email;
  
  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists! Update it to link to new user ID
    UPDATE public.profiles SET
      id = new.id,
      updated_at = now()
    WHERE email = new.email;
  ELSE
    -- Create new profile with email-based account_id
    INSERT INTO public.profiles (id, email, full_name, role, account_id, is_disabled, username, profile_image)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      'doctor',
      'account_' || new.email,  -- Email-based account_id!
      false,
      split_part(new.email, '@', 1),
      'https://ui-avatars.com/api/?name=' || split_part(new.email, '@', 1) || '&background=0D8ABC&color=fff&size=128'
    );
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check the results:
SELECT id, email, account_id, full_name FROM profiles;
