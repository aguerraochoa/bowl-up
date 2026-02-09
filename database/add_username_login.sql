-- Migration: Add username-based login for teams
-- Run this before launch_hardening_musts.sql

-- Step 1: Add username column
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Backfill usernames from team names
UPDATE teams t
SET username = LOWER(REGEXP_REPLACE(COALESCE(t.name, 'team'), '[^a-zA-Z0-9._]+', '', 'g'))
WHERE t.username IS NULL;

UPDATE teams t
SET username = CONCAT('team', SUBSTRING(REPLACE(t.id::text, '-', ''), 1, 8))
WHERE t.username IS NULL OR t.username = '';

UPDATE teams t
SET username = CONCAT(t.username, SUBSTRING(REPLACE(t.id::text, '-', ''), 1, 3))
WHERE LENGTH(t.username) < 3;

UPDATE teams t
SET username = LEFT(t.username, 20)
WHERE LENGTH(t.username) > 20;

WITH duplicates AS (
  SELECT
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at, id) AS rn
  FROM teams
)
UPDATE teams t
SET username = CONCAT(
  LEFT(d.username, GREATEST(1, 20 - LENGTH(d.rn::text))),
  d.rn::text
)
FROM duplicates d
WHERE t.id = d.id
  AND d.rn > 1;

-- Step 3: Enforce constraints
ALTER TABLE teams
ALTER COLUMN username SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_username_format'
      AND conrelid = 'teams'::regclass
  ) THEN
    ALTER TABLE teams
    ADD CONSTRAINT teams_username_format
    CHECK (username ~ '^[a-z0-9._]{3,20}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_username_unique_ci
ON teams (LOWER(username));

-- Step 4: Username resolver for login
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email
  INTO v_email
  FROM public.teams t
  JOIN auth.users au ON au.id = t.user_id
  WHERE LOWER(t.username) = LOWER(TRIM(COALESCE(p_username, '')))
    AND COALESCE(t.is_enabled, TRUE)
  LIMIT 1;

  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_user_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO authenticated;

-- Step 5: Deprecate team-name lookup login function
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
