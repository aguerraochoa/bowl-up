-- Function to get teams with user emails (admin only)
-- This function uses SECURITY DEFINER to access auth.users table
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
  RETURN QUERY
  SELECT 
    t.id,
    t.name::TEXT,
    COALESCE(au.email::TEXT, 'No email'::TEXT) as email,
    t.league_id,
    l.name::TEXT as league_name,
    COALESCE(t.is_enabled, true) as is_enabled,
    t.created_at,
    t.user_id
  FROM teams t
  LEFT JOIN auth.users au ON t.user_id = au.id
  LEFT JOIN leagues l ON t.league_id = l.id
  WHERE (league_id_filter IS NULL OR t.league_id = league_id_filter)
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
