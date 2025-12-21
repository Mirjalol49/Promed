-- Add lock_enabled column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lock_enabled BOOLEAN DEFAULT false;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'lock_enabled';
