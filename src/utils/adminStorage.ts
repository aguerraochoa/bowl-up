import { supabase } from '../lib/supabase';
import type { League } from '../types';

// Check if current user is an admin (has no team)
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: team, error } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no team exists

    // If error or no team exists, user is admin
    // PGRST116 is the error code for "no rows returned" which is expected for admins
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if user is admin:', error);
      // On error, assume regular user (fail safe)
      return false;
    }

    // If no team exists, user is admin
    return !team;
  } catch (error) {
    console.error('Exception checking if user is admin:', error);
    // On exception, assume regular user (fail safe)
    return false;
  }
};

// Get all leagues (for signup dropdown and admin)
export const getAllLeagues = async (): Promise<League[]> => {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }

  return (data || []).map(l => ({
    id: l.id,
    name: l.name,
  }));
};

// Get all teams (admin only)
export interface AdminTeam {
  id: string;
  name: string;
  email: string;
  leagueId: string | null;
  leagueName: string | null;
  isEnabled: boolean;
  createdAt: string;
  userId: string;
}

export const getAllTeams = async (): Promise<AdminTeam[]> => {
  // First try the RPC function
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_teams_with_emails', { league_id_filter: null });

  if (rpcError) {
    console.error('Error fetching teams via RPC:', rpcError);
    // Fallback to direct query if RPC function doesn't exist
    console.log('Falling back to direct query...');
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        is_enabled,
        created_at,
        user_id,
        league_id,
        leagues:league_id (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
      return [];
    }

    // Map teams with email as 'N/A' (can't access auth.users without RPC)
    return (data || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      email: 'N/A', // Can't get email without RPC function
      leagueId: team.league_id,
      leagueName: (team.leagues as any)?.name || null,
      isEnabled: team.is_enabled ?? true,
      createdAt: team.created_at,
      userId: team.user_id,
    }));
  }

  return (rpcData || []).map((team: any) => ({
    id: team.id,
    name: team.name,
    email: team.email || 'No email',
    leagueId: team.league_id,
    leagueName: team.league_name || null,
    isEnabled: team.is_enabled ?? true,
    createdAt: team.created_at,
    userId: team.user_id,
  }));
};

// Enable a team
export const enableTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({ is_enabled: true })
    .eq('id', teamId);

  if (error) {
    console.error('Error enabling team:', error);
    throw error;
  }
};

// Disable a team
export const disableTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({ is_enabled: false })
    .eq('id', teamId);

  if (error) {
    console.error('Error disabling team:', error);
    throw error;
  }
};

// Update team's league assignment
export const updateTeamLeague = async (teamId: string, leagueId: string | null): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({ league_id: leagueId })
    .eq('id', teamId);

  if (error) {
    console.error('Error updating team league:', error);
    throw error;
  }
};

// Create a new league
export const createLeague = async (name: string): Promise<League> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('leagues')
    .insert({
      name,
      current_season: 'Season 1',
      created_by: user.id,
    })
    .select('id, name')
    .single();

  if (error) {
    console.error('Error creating league:', error);
    throw error;
  }

  return { id: data.id, name: data.name };
};

// Update league name
export const updateLeague = async (leagueId: string, name: string): Promise<void> => {
  const { error } = await supabase
    .from('leagues')
    .update({ name })
    .eq('id', leagueId);

  if (error) {
    console.error('Error updating league:', error);
    throw error;
  }
};

// Get league details
export interface LeagueDetails extends League {
  currentSeason: string;
  teamCount: number;
  createdAt: string;
}

export const getLeagueDetails = async (leagueId: string): Promise<LeagueDetails | null> => {
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, current_season, created_at')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('Error fetching league:', leagueError);
    return null;
  }

  const { count, error: countError } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  if (countError) {
    console.error('Error counting teams:', countError);
  }

  return {
    id: league.id,
    name: league.name,
    currentSeason: league.current_season || 'Season 1',
    teamCount: count || 0,
    createdAt: league.created_at,
  };
};

// Get all leagues with details
export const getAllLeaguesWithDetails = async (): Promise<LeagueDetails[]> => {
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name, current_season, created_at')
    .order('name');

  if (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }

  // Get team counts for each league
  const leaguesWithCounts = await Promise.all(
    (leagues || []).map(async (league) => {
      const { count } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id);

      return {
        id: league.id,
        name: league.name,
        currentSeason: league.current_season || 'Season 1',
        teamCount: count || 0,
        createdAt: league.created_at,
      };
    })
  );

  return leaguesWithCounts;
};

// Start a new season for a league
export const startNewLeagueSeason = async (leagueId: string): Promise<string> => {
  // Get current league season
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('current_season, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    throw new Error('League not found');
  }

  // Calculate next season number
  const currentSeasonNum = parseInt(league.current_season.replace(/.*Season\s+(\d+)/, '$1')) || 1;
  const nextSeasonNum = currentSeasonNum + 1;
  const newSeason = `${league.name} - Season ${nextSeasonNum}`;

  // Update league's current season
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ current_season: newSeason })
    .eq('id', leagueId);

  if (updateError) {
    console.error('Error starting new season:', updateError);
    throw updateError;
  }

  return newSeason;
};

// Delete a league (moves teams to Unassigned)
export const deleteLeague = async (leagueId: string): Promise<void> => {
  // Get Unassigned league ID
  const { data: unassignedLeague } = await supabase
    .from('leagues')
    .select('id')
    .eq('name', 'Unassigned')
    .single();

  if (!unassignedLeague) {
    throw new Error('Unassigned league not found');
  }

  // Move all teams to Unassigned league
  const { error: updateError } = await supabase
    .from('teams')
    .update({ league_id: unassignedLeague.id })
    .eq('league_id', leagueId);

  if (updateError) {
    console.error('Error moving teams to Unassigned:', updateError);
    throw updateError;
  }

  // Delete the league
  const { error: deleteError } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId);

  if (deleteError) {
    console.error('Error deleting league:', deleteError);
    throw deleteError;
  }
};

// Get all teams in a league
export const getTeamsByLeague = async (leagueId: string): Promise<AdminTeam[]> => {
  const { data, error } = await supabase
    .rpc('get_teams_with_emails', { league_id_filter: leagueId });

  if (error) {
    console.error('Error fetching teams by league:', error);
    return [];
  }

  return (data || []).map((team: any) => ({
    id: team.id,
    name: team.name,
    email: team.email || 'No email',
    leagueId: team.league_id,
    leagueName: team.league_name || null,
    isEnabled: team.is_enabled ?? true,
    createdAt: team.created_at,
    userId: team.user_id,
  }));
};
