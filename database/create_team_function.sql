-- Create a function to create teams during signup (bypasses RLS)
-- This is needed because the session might not be fully established yet during signup

CREATE OR REPLACE FUNCTION public.create_team_for_user(
  p_user_id UUID,
  p_name TEXT,
  p_league_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_league_id UUID;
  v_current_season TEXT;
  v_league_name TEXT;
BEGIN
  -- If no league selected, get Unassigned league
  IF p_league_id IS NULL THEN
    SELECT id INTO v_league_id
    FROM leagues
    WHERE name = 'Unassigned'
    LIMIT 1;

    IF v_league_id IS NULL THEN
      RAISE EXCEPTION 'Unassigned league not found';
    END IF;
  ELSE
    v_league_id := p_league_id;
  END IF;

  -- Get league to get current season
  SELECT current_season, name INTO v_current_season, v_league_name
  FROM leagues
  WHERE id = v_league_id;

  IF v_current_season IS NULL THEN
    v_current_season := 'Season 1';
  END IF;

  IF v_league_name IS NULL THEN
    v_league_name := '';
  END IF;

  -- Create team (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO teams (user_id, name, league_id, league, current_season, is_enabled)
  VALUES (p_user_id, p_name, v_league_id, v_league_name, v_current_season, true)
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
