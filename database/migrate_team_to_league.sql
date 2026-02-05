-- Migration: Migrate team data from Unassigned to Liga Martes Chitoy
-- This updates all games' season names to match the new league format

-- Step 1: Get the team ID and new league info
DO $$
DECLARE
  team_uuid UUID;
  new_league_id UUID;
  new_league_name TEXT := 'Liga Martes Chitoy';
  new_league_season TEXT;
  games_updated INTEGER;
BEGIN
  -- Find the team that was moved to Liga Martes Chitoy
  SELECT t.id INTO team_uuid
  FROM teams t
  JOIN leagues l ON t.league_id = l.id
  WHERE l.name = new_league_name
  LIMIT 1;

  IF team_uuid IS NULL THEN
    RAISE EXCEPTION 'No team found in league: %', new_league_name;
  END IF;

  -- Get the new league's current season
  SELECT l.id, l.current_season INTO new_league_id, new_league_season
  FROM leagues l
  WHERE l.name = new_league_name
  LIMIT 1;

  IF new_league_id IS NULL THEN
    RAISE EXCEPTION 'League not found: %', new_league_name;
  END IF;

  -- If league season is just "Season 1", format it as "Liga Martes Chitoy - Season 1"
  IF new_league_season = 'Season 1' OR new_league_season NOT LIKE '%- Season%' THEN
    new_league_season := new_league_name || ' - Season 1';
    -- Update the league's current_season to the proper format
    UPDATE leagues
    SET current_season = new_league_season
    WHERE id = new_league_id;
  END IF;

  -- Update all games for this team
  -- Update games that have old format seasons (Season 1, Unassigned - Season 1, etc.)
  UPDATE games
  SET season = new_league_season
  WHERE team_id = team_uuid
    AND (
      season = 'Season 1'
      OR season = 'Unassigned - Season 1'
      OR season LIKE 'Unassigned%'
      OR season NOT LIKE '%- Season%'  -- Catch any old format seasons without league name
    );

  GET DIAGNOSTICS games_updated = ROW_COUNT;

  -- Update team's current_season to match new league
  UPDATE teams
  SET current_season = new_league_season
  WHERE id = team_uuid;

  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Team ID: %', team_uuid;
  RAISE NOTICE 'New League: %', new_league_name;
  RAISE NOTICE 'New Season: %', new_league_season;
  RAISE NOTICE 'Games updated: %', games_updated;
END $$;
