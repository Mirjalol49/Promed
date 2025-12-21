-- Add lock screen password column to profiles table
-- Note: This stores the lock screen password in plaintext for UI purposes
-- This is separate from the Supabase Auth password (which is hashed)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lock_password TEXT DEFAULT 'password123';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'lock_password';
