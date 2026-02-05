-- Migration: Change player deletion from CASCADE to SET NULL
-- This preserves team game history when players are deleted
-- Their games will remain but player_id will be set to NULL

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE games
DROP CONSTRAINT IF EXISTS games_player_id_fkey;

-- Step 2: Add the new foreign key constraint with ON DELETE SET NULL
-- Note: This requires player_id to be nullable, which we'll handle in the app layer
ALTER TABLE games
ADD CONSTRAINT games_player_id_fkey
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;

-- Note: The player_id column is currently NOT NULL, so we need to make it nullable first
-- However, we'll keep it NOT NULL for now and handle nulls in the application layer
-- If you want to make it nullable in the database, uncomment the following:
-- ALTER TABLE games ALTER COLUMN player_id DROP NOT NULL;

-- For now, we'll use a trigger approach to set player_id to NULL when a player is deleted
-- This is safer than making the column nullable immediately

-- Create a function to handle player deletion
CREATE OR REPLACE FUNCTION handle_player_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Set player_id to NULL for all games belonging to the deleted player
  UPDATE games
  SET player_id = NULL
  WHERE player_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires BEFORE deletion
-- This way we can set player_id to NULL before the foreign key constraint would fail
DROP TRIGGER IF EXISTS before_player_delete ON players;
CREATE TRIGGER before_player_delete
BEFORE DELETE ON players
FOR EACH ROW
EXECUTE FUNCTION handle_player_deletion();

-- However, since player_id is NOT NULL, we need to make it nullable first
-- Let's do that:
ALTER TABLE games ALTER COLUMN player_id DROP NOT NULL;

-- Now the trigger will work properly
-- When a player is deleted, their games will have player_id = NULL
-- This preserves team game history while removing the player from active stats
