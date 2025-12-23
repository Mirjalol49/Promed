-- God Mode Phase 1: Security & Foundation

-- 1. Modify `profiles` Table
-- Add new columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'doctor' CHECK (role IN ('admin', 'doctor', 'staff'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'banned'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial';

-- 2. Admin RLS Policies
-- Enable RLS on profiles if not already enabled (it should be)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can VIEW ALL profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy: Admins can UPDATE ALL profiles
CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy: Admins can INSERT notifications (Global Alerts)
-- Assuming a 'notifications' table exists. If not, this might fail, so wrapped in a check or omitted if strictly following prompt.
-- The prompt said "Admins can insert notifications". I'll add a policy for notifications table if it exists.
-- DO NOT RUN IF notifications TABLE DOES NOT EXIST.
-- CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));


-- 3. MANUAL ACTION: Promote yourself to Admin
-- Run this command with your actual email:
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your_email@example.com');
