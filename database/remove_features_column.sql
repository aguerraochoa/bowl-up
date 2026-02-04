-- Remove features column from teams table
-- This is safe to run - the code no longer uses this column
-- Your existing data will not be affected

-- Step 1: Check if the column exists and what data it contains (optional, for verification)
-- SELECT id, name, features FROM teams;

-- Step 2: Drop the features column
-- This will remove the column but keep all other team data intact
ALTER TABLE teams DROP COLUMN IF EXISTS features;

-- Note: If you get an error about dependencies, you may need to drop any indexes or constraints first
-- But typically this should work without issues since we're not using it in any foreign keys or constraints
