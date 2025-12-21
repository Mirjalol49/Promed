-- ============================================
-- DIAGNOSTIC QUERY - Check Current RLS State
-- Run this in Supabase SQL Editor to see what's blocking you
-- ============================================

-- 1. Check if realtime is enabled for tables
SELECT 
    schemaname, 
    tablename,
    'Realtime enabled ✓' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('patients', 'profiles');

-- 2. Check current RLS policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd as operation,
    CASE 
        WHEN qual = 'true' THEN 'Allows ALL ✓'
        ELSE 'Restricted: ' || qual
    END as permission_check
FROM pg_policies 
WHERE tablename IN ('patients', 'profiles')
ORDER BY tablename, policyname;

-- 3. Check if RLS is enabled on tables
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled ✓'
        ELSE 'RLS Disabled ✗'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('patients', 'profiles');

-- 4. Check table grants
SELECT 
    grantee,
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('patients', 'profiles')
AND grantee = 'authenticated'
GROUP BY grantee, table_name;
