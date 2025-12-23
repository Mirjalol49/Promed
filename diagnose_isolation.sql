-- DATA ISOLATION & ADMIN ACCESS DIAGNOSTIC
-- Run this to see what is happening under the hood

-- 1. Check all current policies on the patients table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'patients';

-- 2. Check the current user's profile and account isolation
-- (Replace with a known user email if running manually)
SELECT 
    id, 
    email, 
    role, 
    status, 
    account_id 
FROM profiles;

-- 3. Check for Account ID Collisions
-- If this returns results, multiple users share the same account_id!
SELECT account_id, COUNT(*) 
FROM profiles 
GROUP BY account_id 
HAVING COUNT(*) > 1;

-- 4. Check if RLS is actually enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('patients', 'profiles');

-- 5. Force specific multi-tenancy check
-- Ensure patients have their account_id set
SELECT id, full_name, account_id 
FROM patients 
LIMIT 10;
