-- Launch Hardening MUSTs
-- Run this after:
--   1) schema.sql
--   2) add_leagues_and_admin.sql
--   3) add_seasons.sql
--
-- This migration:
-- - Enforces enabled-team access at the RLS layer
-- - Secures SECURITY DEFINER functions used by admin/signup paths
-- - Restores secure team creation on signup via auth trigger + metadata

-- ---------------------------------------------------------------------
-- 1) Helper functions for authorization
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_active_team(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.user_id = auth.uid()
      AND COALESCE(t.is_enabled, TRUE)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------
-- 2) Enforce active-team access in RLS policies
-- ---------------------------------------------------------------------

-- Players
DROP POLICY IF EXISTS "Users can view their team's players" ON players;
DROP POLICY IF EXISTS "Users can insert their team's players" ON players;
DROP POLICY IF EXISTS "Users can update their team's players" ON players;
DROP POLICY IF EXISTS "Users can delete their team's players" ON players;

CREATE POLICY "Users can view their team's players"
  ON players FOR SELECT
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can insert their team's players"
  ON players FOR INSERT
  WITH CHECK (public.can_access_active_team(team_id));

CREATE POLICY "Users can update their team's players"
  ON players FOR UPDATE
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can delete their team's players"
  ON players FOR DELETE
  USING (public.can_access_active_team(team_id));

-- Games
DROP POLICY IF EXISTS "Users can view their team's games" ON games;
DROP POLICY IF EXISTS "Users can insert their team's games" ON games;
DROP POLICY IF EXISTS "Users can update their team's games" ON games;
DROP POLICY IF EXISTS "Users can delete their team's games" ON games;

CREATE POLICY "Users can view their team's games"
  ON games FOR SELECT
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can insert their team's games"
  ON games FOR INSERT
  WITH CHECK (public.can_access_active_team(team_id));

CREATE POLICY "Users can update their team's games"
  ON games FOR UPDATE
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can delete their team's games"
  ON games FOR DELETE
  USING (public.can_access_active_team(team_id));

-- Debt tags
DROP POLICY IF EXISTS "Users can view their team's debt tags" ON debt_tags;
DROP POLICY IF EXISTS "Users can insert their team's debt tags" ON debt_tags;
DROP POLICY IF EXISTS "Users can update their team's debt tags" ON debt_tags;
DROP POLICY IF EXISTS "Users can delete their team's debt tags" ON debt_tags;

CREATE POLICY "Users can view their team's debt tags"
  ON debt_tags FOR SELECT
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can insert their team's debt tags"
  ON debt_tags FOR INSERT
  WITH CHECK (public.can_access_active_team(team_id));

CREATE POLICY "Users can update their team's debt tags"
  ON debt_tags FOR UPDATE
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can delete their team's debt tags"
  ON debt_tags FOR DELETE
  USING (public.can_access_active_team(team_id));

-- Debts
DROP POLICY IF EXISTS "Users can view their team's debts" ON debts;
DROP POLICY IF EXISTS "Users can insert their team's debts" ON debts;
DROP POLICY IF EXISTS "Users can update their team's debts" ON debts;
DROP POLICY IF EXISTS "Users can delete their team's debts" ON debts;

CREATE POLICY "Users can view their team's debts"
  ON debts FOR SELECT
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can insert their team's debts"
  ON debts FOR INSERT
  WITH CHECK (public.can_access_active_team(team_id));

CREATE POLICY "Users can update their team's debts"
  ON debts FOR UPDATE
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can delete their team's debts"
  ON debts FOR DELETE
  USING (public.can_access_active_team(team_id));

-- Debt split between
DROP POLICY IF EXISTS "Users can view their team's debt splits" ON debt_split_between;
DROP POLICY IF EXISTS "Users can insert their team's debt splits" ON debt_split_between;
DROP POLICY IF EXISTS "Users can update their team's debt splits" ON debt_split_between;
DROP POLICY IF EXISTS "Users can delete their team's debt splits" ON debt_split_between;

CREATE POLICY "Users can view their team's debt splits"
  ON debt_split_between FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.debts d
      WHERE d.id = debt_id
        AND public.can_access_active_team(d.team_id)
    )
  );

CREATE POLICY "Users can insert their team's debt splits"
  ON debt_split_between FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.debts d
      WHERE d.id = debt_id
        AND public.can_access_active_team(d.team_id)
    )
  );

CREATE POLICY "Users can update their team's debt splits"
  ON debt_split_between FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.debts d
      WHERE d.id = debt_id
        AND public.can_access_active_team(d.team_id)
    )
  );

CREATE POLICY "Users can delete their team's debt splits"
  ON debt_split_between FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.debts d
      WHERE d.id = debt_id
        AND public.can_access_active_team(d.team_id)
    )
  );

-- Bet tallies
DROP POLICY IF EXISTS "Users can view their team's bet tallies" ON bet_tallies;
DROP POLICY IF EXISTS "Users can insert their team's bet tallies" ON bet_tallies;
DROP POLICY IF EXISTS "Users can update their team's bet tallies" ON bet_tallies;
DROP POLICY IF EXISTS "Users can delete their team's bet tallies" ON bet_tallies;

CREATE POLICY "Users can view their team's bet tallies"
  ON bet_tallies FOR SELECT
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can insert their team's bet tallies"
  ON bet_tallies FOR INSERT
  WITH CHECK (public.can_access_active_team(team_id));

CREATE POLICY "Users can update their team's bet tallies"
  ON bet_tallies FOR UPDATE
  USING (public.can_access_active_team(team_id));

CREATE POLICY "Users can delete their team's bet tallies"
  ON bet_tallies FOR DELETE
  USING (public.can_access_active_team(team_id));

-- ---------------------------------------------------------------------
-- 3) Secure team creation RPC (kept for compatibility, now locked down)
-- ---------------------------------------------------------------------

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
  v_username_base TEXT;
  v_username TEXT;
  v_suffix INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to create a team for this user';
  END IF;

  IF trim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Team name is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Team already exists for this user';
  END IF;

  IF p_league_id IS NULL THEN
    SELECT id, name, current_season
    INTO v_league_id, v_league_name, v_current_season
    FROM public.leagues
    WHERE name = 'Unassigned'
    LIMIT 1;
  ELSE
    SELECT id, name, current_season
    INTO v_league_id, v_league_name, v_current_season
    FROM public.leagues
    WHERE id = p_league_id
    LIMIT 1;
  END IF;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'League not found';
  END IF;

  v_current_season := COALESCE(v_current_season, 'Season 1');
  v_league_name := COALESCE(v_league_name, '');

  v_username_base := LOWER(REGEXP_REPLACE(trim(COALESCE(p_name, 'team')), '[^a-zA-Z0-9._]+', '', 'g'));
  IF v_username_base = '' THEN
    v_username_base := CONCAT('team', SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 8));
  END IF;
  IF LENGTH(v_username_base) < 3 THEN
    v_username_base := CONCAT(v_username_base, SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 3));
  END IF;
  v_username_base := LEFT(v_username_base, 20);

  v_username := v_username_base;
  WHILE EXISTS (SELECT 1 FROM public.teams WHERE LOWER(username) = LOWER(v_username)) LOOP
    v_suffix := v_suffix + 1;
    v_username := CONCAT(LEFT(v_username_base, GREATEST(1, 20 - LENGTH(v_suffix::text))), v_suffix::text);
  END LOOP;

  INSERT INTO public.teams (user_id, name, username, league_id, league, current_season, is_enabled)
  VALUES (p_user_id, trim(p_name), v_username, v_league_id, v_league_name, v_current_season, TRUE)
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.create_team_for_user(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_team_for_user(UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_team_for_user(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- 4) Secure admin teams/email RPC
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_teams_with_emails(league_id_filter UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  league_id UUID,
  league_name TEXT,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  user_id UUID
) AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name::TEXT,
    COALESCE(au.email::TEXT, 'No email'::TEXT) AS email,
    t.league_id,
    l.name::TEXT AS league_name,
    COALESCE(t.is_enabled, TRUE) AS is_enabled,
    t.created_at,
    t.user_id
  FROM public.teams t
  LEFT JOIN auth.users au ON t.user_id = au.id
  LEFT JOIN public.leagues l ON t.league_id = l.id
  WHERE (league_id_filter IS NULL OR t.league_id = league_id_filter)
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_teams_with_emails(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teams_with_emails(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teams_with_emails(UUID) TO authenticated;

-- Team-name email lookup is deprecated. Lock it down to service_role only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_user_email_by_team_name'
  ) THEN
    REVOKE ALL ON FUNCTION public.get_user_email_by_team_name(TEXT) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_user_email_by_team_name(TEXT) FROM anon;
    REVOKE ALL ON FUNCTION public.get_user_email_by_team_name(TEXT) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.get_user_email_by_team_name(TEXT) TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) Secure signup trigger-based team creation
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_requested_league_raw TEXT;
  v_requested_league_id UUID;
  v_league_id UUID;
  v_league_name TEXT;
  v_current_season TEXT;
  v_team_name TEXT;
  v_username_base TEXT;
  v_username TEXT;
  v_suffix INT := 0;
BEGIN
  v_team_name := trim(COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team'));
  IF v_team_name = '' THEN
    v_team_name := 'My Team';
  END IF;

  v_username_base := LOWER(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')));
  IF v_username_base = '' THEN
    v_username_base := LOWER(REGEXP_REPLACE(v_team_name, '[^a-zA-Z0-9._]+', '', 'g'));
  END IF;
  IF v_username_base = '' THEN
    v_username_base := CONCAT('team', SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  IF LENGTH(v_username_base) < 3 THEN
    v_username_base := CONCAT(v_username_base, SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 3));
  END IF;
  v_username_base := LEFT(v_username_base, 20);

  v_requested_league_raw := NULLIF(COALESCE(NEW.raw_user_meta_data->>'league_id', ''), '');
  IF v_requested_league_raw IS NOT NULL THEN
    BEGIN
      v_requested_league_id := v_requested_league_raw::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_requested_league_id := NULL;
    END;
  END IF;

  IF v_requested_league_id IS NOT NULL THEN
    SELECT id, name, current_season
    INTO v_league_id, v_league_name, v_current_season
    FROM public.leagues
    WHERE id = v_requested_league_id
    LIMIT 1;
  END IF;

  IF v_league_id IS NULL THEN
    SELECT id, name, current_season
    INTO v_league_id, v_league_name, v_current_season
    FROM public.leagues
    WHERE name = 'Unassigned'
    LIMIT 1;
  END IF;

  IF v_league_id IS NULL THEN
    INSERT INTO public.leagues (name, current_season)
    VALUES ('Unassigned', 'Season 1')
    ON CONFLICT (name) DO NOTHING;

    SELECT id, name, current_season
    INTO v_league_id, v_league_name, v_current_season
    FROM public.leagues
    WHERE name = 'Unassigned'
    LIMIT 1;
  END IF;

  v_league_name := COALESCE(v_league_name, '');
  v_current_season := COALESCE(v_current_season, 'Season 1');

  v_username := v_username_base;
  WHILE EXISTS (SELECT 1 FROM public.teams WHERE LOWER(username) = LOWER(v_username)) LOOP
    v_suffix := v_suffix + 1;
    v_username := CONCAT(LEFT(v_username_base, GREATEST(1, 20 - LENGTH(v_suffix::text))), v_suffix::text);
  END LOOP;

  INSERT INTO public.teams (user_id, name, username, league, league_id, current_season, is_enabled)
  VALUES (NEW.id, v_team_name, v_username, v_league_name, v_league_id, v_current_season, TRUE)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
