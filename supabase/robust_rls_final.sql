-- =============================================
-- FINAL STABILITY FIX: GHOST PATIENT PERSISTENCE
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Ensure user_id column exists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Backfill user_id for existing rows where possible
-- If the row has an account_id matching a profile, we can backfill the user_id
DO $$
BEGIN
    UPDATE patients p
    SET user_id = pr.id
    FROM profiles pr
    WHERE p.account_id = pr.account_id
    AND p.user_id IS NULL;
END $$;

-- 3. DROP ALL OLD POLICIES (Cleaning the slate)
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can view patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert patients for their account" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can update patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete patients of their account" ON patients;
DROP POLICY IF EXISTS "enable_all_for_authenticated_users" ON patients;
DROP POLICY IF EXISTS "robust_select_patients" ON patients;
DROP POLICY IF EXISTS "robust_insert_patients" ON patients;
DROP POLICY IF EXISTS "robust_update_patients" ON patients;
DROP POLICY IF EXISTS "robust_delete_patients" ON patients;

-- 4. CREATE ROBUST, MULTI-LAYERED POLICIES

-- SELECT: Most important for visibility after refresh
CREATE POLICY "robust_select_patients" ON patients
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    account_id = (SELECT account_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- INSERT: Ensure we tag both ID versions
CREATE POLICY "robust_insert_patients" ON patients
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- UPDATE: Allow editors who own or share the account
CREATE POLICY "robust_update_patients" ON patients
FOR UPDATE TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    account_id = (SELECT account_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- DELETE: Same as update
CREATE POLICY "robust_delete_patients" ON patients
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    account_id = (SELECT account_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- 5. VERIFY
SELECT COUNT(*) FROM patients; -- Should see your patients now
