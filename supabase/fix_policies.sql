-- ==========================================
-- PROMED: ROBUST DATA SECURITY & ISOLATION FIX
-- ==========================================
-- This script fixes the "Ghost Patient" bug by:
-- 1. Ensuring the user_id column exists for direct ownership.
-- 2. Implementing high-performance RLS policies.
-- 3. Fixing the UUID vs TEXT type mismatch error.

-- 🔧 1. COLUMN AUDIT & REPAIR
DO $$ 
BEGIN 
    -- Check if user_id exists in patients table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
        RAISE NOTICE 'Added user_id column to patients table.';
    END IF;
END $$;

-- 🛡️ 2. SECURITY INITIALIZATION
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 🧹 3. POLICY CLEANUP (Removing legacy/conflicting rules)
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;
DROP POLICY IF EXISTS "Users can view patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can insert patients for their account" ON patients;
DROP POLICY IF EXISTS "Users can update patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can delete patients of their account" ON patients;

-- 🏛️ 4. PROFESSIONAL RLS IMPLEMENTATION

-- POLICY: SELECT (Viewing Data)
-- Allows viewing if:
-- A) The user created the record (Direct Ownership)
-- B) The record belongs to the user's account (Account Isolation)
CREATE POLICY "Users can view own patients" ON patients
FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    account_id = (SELECT account_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- POLICY: INSERT (Adding Data) - CRITICAL FIX
-- Ensures user_id is set to the current user upon insertion
CREATE POLICY "Users can insert own patients" ON patients
FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- POLICY: UPDATE (Editing Data)
CREATE POLICY "Users can update own patients" ON patients
FOR UPDATE USING (
    auth.uid() = user_id
);

-- POLICY: DELETE (Removing Data)
CREATE POLICY "Users can delete own patients" ON patients
FOR DELETE USING (
    auth.uid() = user_id
);

-- 📝 5. DOCUMENTATION
COMMENT ON TABLE patients IS 'Patient records with RLS for multi-tenant and owner-based isolation.';
COMMENT ON COLUMN patients.user_id IS 'The primary owner (UID) of this patient record.';
