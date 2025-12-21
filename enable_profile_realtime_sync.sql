-- Realtime Profile Sync Fix
-- Run this in Supabase Dashboard -> SQL Editor

-- Allow any logged-in user to see everyone's profile
-- (Required for "Team Sync" - so User B sees User A's updated photo instantly)
DROP POLICY IF EXISTS "Allow all authenticated to view profiles" ON public.profiles;
CREATE POLICY "Allow all authenticated to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ( true );

-- Note: Realtime for profiles table is already enabled!
-- The "relation already member of publication" error confirms this.
