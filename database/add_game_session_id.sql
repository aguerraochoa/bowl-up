-- Add game_session_id column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS game_session_id UUID;

-- Create index for better query performance
-- Drop index first if it exists, then create it
DROP INDEX IF EXISTS idx_games_game_session_id;
CREATE INDEX idx_games_game_session_id ON games(game_session_id);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games' AND column_name = 'game_session_id';
