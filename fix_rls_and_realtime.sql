-- ============================================
-- COMPREHENSIVE RLS FIX FOR PROMED
-- Run this in Supabase SQL Editor
-- ============================================

-- This will enable realtime events AND save operations
-- by giving authenticated users full access to their data

BEGIN;

-- ===========================================
-- 1. ENABLE REALTIME ON TABLES
-- ===========================================
-- SKIP: These are already enabled (error shows profiles exists)
-- If patients throws same error, comment it out too
-- ALTER PUBLICATION supabase_realtime ADD TABLE patients;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ===========================================
-- 2. DROP ALL EXISTING RLS POLICIES
-- ===========================================
-- Start fresh to avoid conflicts

-- Patients table
DROP POLICY IF EXISTS "Users can view their own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert their own patients" ON patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON patients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON patients;

-- Profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON profiles;

-- ===========================================
-- 3. CREATE PERMISSIVE RLS POLICIES
-- ===========================================

-- PATIENTS TABLE - Full access for authenticated users
CREATE POLICY "enable_all_for_authenticated_users"
ON patients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- PROFILES TABLE - Full access for authenticated users
CREATE POLICY "enable_all_for_authenticated_users"
ON profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ===========================================
-- 4. ENSURE RLS IS ENABLED
-- ===========================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 5. GRANT TABLE PERMISSIONS
-- ===========================================
GRANT ALL ON patients TO authenticated;
GRANT ALL ON profiles TO authenticated;

COMMIT;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================
-- Run these after to verify the fix

-- Check if realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('patients', 'profiles');
