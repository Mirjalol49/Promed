-- Enable RLS on core tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Users can view patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can insert patients for their account" ON patients;
DROP POLICY IF EXISTS "Users can update patients of their account" ON patients;
DROP POLICY IF EXISTS "Users can delete patients of their account" ON patients;

-- 1. VIEW POLICY: Users can view patients of their account
CREATE POLICY "Users can view patients of their account" 
ON patients FOR SELECT 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

-- 2. INSERT POLICY: Users can insert patients for their account
CREATE POLICY "Users can insert patients for their account" 
ON patients FOR INSERT 
WITH CHECK (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

-- 3. UPDATE POLICY: Users can update patients of their account
CREATE POLICY "Users can update patients of their account" 
ON patients FOR UPDATE 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);

-- 4. DELETE POLICY: Users can delete patients of their account
CREATE POLICY "Users can delete patients of their account" 
ON patients FOR DELETE 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE id = auth.uid()
  )
);
