-- DATA ISOLATION & SECURITY FIX
-- Run this in Supabase SQL Editor to restore multi-tenancy

BEGIN;

-- 1. FIX CHECK CONSTRAINTS (Crucial for Admin Promotion)
-- The initial schema might have 'clinic_admin'/'superadmin', but the app uses 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'doctor', 'staff'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'frozen', 'banned'));

-- 2. Drop the "leaky" policy that allows everyone to see everything
DROP POLICY IF EXISTS "enable_all_for_authenticated_users" ON patients;
DROP POLICY IF EXISTS "enable_all_for_authenticated_users" ON profiles;

-- 2. Restore Secure Patient Isolation
-- Users only see patients where the patient's account_id matches the user's profile account_id
CREATE POLICY "Users can only access their own clinic patients"
ON patients
FOR ALL
TO authenticated
USING (
  account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())
);

-- 3. Restore Secure Profile Isolation
-- Users can see all profiles (for lookups/admin) but can ONLY update their own
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Use the security function we created earlier for admin checks if available, 
-- otherwise use raw check. To be safe, we use the raw check here.
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Admin Override for Patients (God Mode)
-- Admins should see ALL patients
CREATE POLICY "Admins can see all patients"
ON patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

COMMIT;
