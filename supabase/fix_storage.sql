-- ==========================================
-- PROMED: STORAGE ACCESS & VISIBILITY FIX
-- ==========================================
-- This script ensures that patient images are visible across all devices.

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('promed-images', 'promed-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop legacy storage policies (Clean state)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

-- 3. Create Robust Storage RLS Policies

-- POLICY: SELECT (Viewing)
-- Allows any authenticated user to view images in the promed-images bucket
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'promed-images');

-- POLICY: INSERT (Uploading)
-- Allows authenticated users to upload new images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'promed-images');

-- POLICY: UPDATE (Modifying)
-- Allows authenticated users to update their own images (or any in bucket for flexibility)
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'promed-images');

-- POLICY: DELETE (Removing)
-- Allows authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'promed-images');

-- 📝 NOTE: If you have an 'avatars' bucket, repeat the public check for it
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Authenticated users can manage avatars"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars');
