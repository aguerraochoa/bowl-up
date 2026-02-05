-- Migration: Add leagues, admin features, and team access control
-- This enables league management, admin portal, and team enable/disable functionality

-- Step 1: Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  current_season TEXT DEFAULT 'Season 1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Step 1a: Add current_season column if table exists but column doesn't
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS current_season TEXT DEFAULT 'Season 1';

-- Step 1b: Add created_at column if it doesn't exist
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Step 1c: Add created_by column if it doesn't exist
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 1d: Update existing leagues to have default season if NULL
UPDATE leagues 
SET current_season = 'Season 1' 
WHERE current_season IS NULL;

-- Step 2: Add indexes for leagues
CREATE INDEX IF NOT EXISTS idx_leagues_name ON leagues(name);

-- Step 3: Add is_enabled and league_id to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE SET NULL;

-- Step 4: Create index for team league_id
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_enabled ON teams(is_enabled);

-- Step 5: Create "Unassigned" league (if it doesn't exist)
INSERT INTO leagues (name, current_season)
VALUES ('Unassigned', 'Season 1')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Migrate existing teams to "Unassigned" league
-- Get the Unassigned league ID and assign all teams without a league_id
UPDATE teams 
SET league_id = (SELECT id FROM leagues WHERE name = 'Unassigned' LIMIT 1)
WHERE league_id IS NULL;

-- Step 7: Set all existing teams to enabled by default
UPDATE teams 
SET is_enabled = true
WHERE is_enabled IS NULL;

-- Step 8: Enable RLS on leagues table
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS Policies for leagues
-- Admin users (users without teams) can do everything
CREATE POLICY "Admins can view all leagues"
  ON leagues FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM teams WHERE teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert leagues"
  ON leagues FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM teams WHERE teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update leagues"
  ON leagues FOR UPDATE
  USING (
    NOT EXISTS (
      SELECT 1 FROM teams WHERE teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete leagues"
  ON leagues FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM teams WHERE teams.user_id = auth.uid()
    )
  );

-- Regular users can view leagues (for signup dropdown)
CREATE POLICY "Users can view all leagues"
  ON leagues FOR SELECT
  USING (true);

-- Step 10: Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM teams WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10a: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;
DROP POLICY IF EXISTS "Admins can update all teams" ON teams;

-- Step 10b: Update teams RLS to allow admins to view/update all teams
-- Admins can view all teams
CREATE POLICY "Admins can view all teams"
  ON teams FOR SELECT
  USING (
    public.is_user_admin()
    OR auth.uid() = user_id
  );

-- Admins can update all teams (for enable/disable, league assignment)
CREATE POLICY "Admins can update all teams"
  ON teams FOR UPDATE
  USING (
    public.is_user_admin()
    OR auth.uid() = user_id
  );

-- Step 11: Modify the handle_new_user function to NOT auto-create teams
-- We'll create teams via API call in the signup page instead
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function in case we need it, but trigger is disabled
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Do nothing - teams are created via API call
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Verify the migration
SELECT 
  'Leagues created' as check_type,
  COUNT(*) as count
FROM leagues
UNION ALL
SELECT 
  'Teams with league_id assigned' as check_type,
  COUNT(*) as count
FROM teams 
WHERE league_id IS NOT NULL
UNION ALL
SELECT 
  'Teams enabled' as check_type,
  COUNT(*) as count
FROM teams 
WHERE is_enabled = true;
