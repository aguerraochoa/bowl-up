-- Fix RLS policies to avoid recursion issues
-- Run this if you're getting 500 errors when querying teams

-- Step 1: Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM teams WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;
DROP POLICY IF EXISTS "Admins can update all teams" ON teams;

-- Step 3: Recreate policies using the function (avoids recursion)
CREATE POLICY "Admins can view all teams"
  ON teams FOR SELECT
  USING (
    public.is_user_admin()
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update all teams"
  ON teams FOR UPDATE
  USING (
    public.is_user_admin()
    OR auth.uid() = user_id
  );
