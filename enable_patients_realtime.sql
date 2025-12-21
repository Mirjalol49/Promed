-- ============================================
-- ADD PATIENTS TABLE TO REALTIME
-- ============================================

-- This will enable realtime events for the patients table
ALTER PUBLICATION supabase_realtime ADD TABLE patients;

-- Verify it worked
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('patients', 'profiles');
