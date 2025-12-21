-- BACKFILL MISSING PROFILES
-- If you created a user BEFORE the trigger was active, they might not have a profile.
-- This script finds those users and inserts them into the profiles table.

INSERT INTO public.profiles (id, username, full_name, role, account_id, is_disabled, profile_image)
SELECT 
  id, 
  split_part(email, '@', 1) as username, -- Generate a username from email
  raw_user_meta_data->>'full_name' as full_name,
  'doctor' as role,
  'account_' || extract(epoch from created_at)::text as account_id, -- Generate ID
  false as is_disabled,
  'https://ui-avatars.com/api/?name=' || split_part(email, '@', 1) || '&background=0D8ABC&color=fff' as profile_image
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Also ensure RLS allows updates (Double Check)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );
