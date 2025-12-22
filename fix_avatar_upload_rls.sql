-- COMPLETE STORAGE FIX
-- Run this ENTIRE script in Supabase Dashboard -> SQL Editor

-- ============================================
-- STEP 1: Create the avatars bucket if missing
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880;

-- ============================================
-- STEP 2: Delete ALL existing avatar policies
-- ============================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname ILIKE '%avatar%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Create fresh RLS policies
-- ============================================

-- Allow anyone to VIEW avatars (public)
CREATE POLICY "avatars_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to INSERT (upload)
CREATE POLICY "avatars_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to UPDATE (overwrite)
CREATE POLICY "avatars_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to DELETE
CREATE POLICY "avatars_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- ============================================
-- STEP 4: Verify storage.objects RLS is enabled
-- ============================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Done! Try uploading again.
