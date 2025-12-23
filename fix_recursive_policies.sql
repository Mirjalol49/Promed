-- God Mode: RLS RECURSION FIX
-- This script resolves the "infinite recursion detected in policy" error

-- 1. Create a Security Definer function
-- This function runs with the privileges of the creator (owner),
-- bypassing RLS checks on the profiles table itself.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Re-create them using the safety function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (public.is_admin());

-- 4. Clean up other tables for consistency (IF THEY EXIST)
DO $$ 
BEGIN 
    -- Handling system_alerts
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_alerts') THEN
        DROP POLICY IF EXISTS "Admins can manage alerts" ON public.system_alerts;
        EXECUTE 'CREATE POLICY "Admins can manage alerts" ON public.system_alerts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;

    -- Handling billing_history
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'billing_history') THEN
        DROP POLICY IF EXISTS "Admins can view all billing history" ON public.billing_history;
        EXECUTE 'CREATE POLICY "Admins can view all billing history" ON public.billing_history FOR SELECT USING (public.is_admin())';
        
        DROP POLICY IF EXISTS "Admins can manage billing history" ON public.billing_history;
        EXECUTE 'CREATE POLICY "Admins can manage billing history" ON public.billing_history FOR ALL USING (public.is_admin())';
    END IF;
END $$;

-- 5. Ensure basic user policies still work
-- (Users should already have policies to view/update their own profile by ID)
-- If not, you can run these:
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
-- CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
