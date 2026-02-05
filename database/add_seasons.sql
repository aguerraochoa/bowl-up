-- Migration: Add season support to the application
-- This allows teams to manage multiple seasons and view historical stats

-- Step 1: Add season column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'Season 1';

-- Step 2: Add current_season to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS current_season TEXT DEFAULT 'Season 1';

-- Step 3: Add deleted_at to players table (for soft deletion)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_season ON games(team_id, season);
CREATE INDEX IF NOT EXISTS idx_games_team_season ON games(team_id, season, date);

-- Step 5: Migrate existing data to Season 1
-- All existing games get assigned to Season 1
UPDATE games 
SET season = 'Season 1' 
WHERE season IS NULL OR season = '';

-- All existing teams get Season 1 as current season
UPDATE teams 
SET current_season = 'Season 1' 
WHERE current_season IS NULL OR current_season = '';

-- Step 6: Verify the migration
SELECT 
  'Games with season assigned' as check_type,
  COUNT(*) as count
FROM games 
WHERE season IS NOT NULL
UNION ALL
SELECT 
  'Teams with current_season set' as check_type,
  COUNT(*) as count
FROM teams 
WHERE current_season IS NOT NULL;
