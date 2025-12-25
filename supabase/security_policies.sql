-- ==========================================
-- BANK-GRADE SECURITY POLICIES (ZERO TRUST)
-- ==========================================

-- 1. FORCE RLS ON ALL TABLES
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. STRICT ISOLATION (ACCOUNT-BASED TENANCY)
-- Users can ONLY access data belonging to their assigned account (Clinic).

-- PATIENTS TABLE
DROP POLICY IF EXISTS "Users can view patients of their account" ON patients;
CREATE POLICY "Users can view patients of their account" 
ON patients FOR SELECT 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert patients for their account" ON patients;
CREATE POLICY "Users can insert patients for their account" 
ON patients FOR INSERT 
WITH CHECK (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update patients of their account" ON patients;
CREATE POLICY "Users can update patients of their account" 
ON patients FOR UPDATE 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete patients of their account" ON patients;
CREATE POLICY "Users can delete patients of their account" 
ON patients FOR DELETE 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

-- PROFILES TABLE (Self-Management Only)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (id = auth.uid());
