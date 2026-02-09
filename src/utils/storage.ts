import { supabase } from '../lib/supabase';
import type { Team, Player, Game, Debt, DebtTag, BetTallies, League } from '../types';
import { cache } from './cache';

interface TeamRow {
  id: string;
  name: string;
  username?: string | null;
  league: string | null;
  league_id: string | null;
  current_season: string | null;
  is_enabled: boolean | null;
}

// Helper to get current user's team ID (cached for 5 minutes since it rarely changes)
const getTeamId = async (): Promise<string | null> => {
  const cacheKey = 'team_id';
  
  // Check cache first
  const cached = cache.get<string | null>(cacheKey);
  if (cached !== null) return cached;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    cache.set(cacheKey, null, 60000); // Cache null for 1 minute
    return null;
  }

  const { data: team, error } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle(); // Use maybeSingle() to avoid errors when no team exists

  if (error || !team) {
    cache.set(cacheKey, null, 60000); // Cache null for 1 minute
    return null;
  }

  // Cache for 5 minutes (team ID rarely changes)
  cache.set(cacheKey, team.id, 5 * 60 * 1000);
  return team.id;
};

// Helper to check if user has a team (for admin detection)
export const userHasTeam = async (): Promise<boolean> => {
  const teamId = await getTeamId();
  return teamId !== null;
};

// Team
export const getTeam = async (): Promise<Team | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let teamQuery = await supabase
      .from('teams')
      .select('id, name, username, league, league_id, current_season, is_enabled')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle() to avoid errors when no team exists

    // Backward-compatible fallback if username column is not migrated yet.
    if (teamQuery.error && teamQuery.error.message?.toLowerCase().includes('username')) {
      teamQuery = await supabase
        .from('teams')
        .select('id, name, league, league_id, current_season, is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
    }

    const { data: team, error } = teamQuery;

    if (error) {
      // PGRST116 is "no rows returned" which is fine
      if (error.code !== 'PGRST116') {
        console.error('Error fetching team:', error);
      }
      return null;
    }

    if (!team) return null;

  // Get players and debt tags for the team
  const [playersResult, tagsResult] = await Promise.all([
    supabase.from('players').select('id, name, team_id, deleted_at').eq('team_id', team.id),
    supabase.from('debt_tags').select('id, name, default_amount').eq('team_id', team.id),
  ]);

  return {
    id: team.id,
    name: team.name,
    username: ('username' in team ? team.username : '') || team.name.toLowerCase().replace(/[^a-z0-9._]+/g, ''),
    league: team.league || '',
    leagueId: team.league_id || undefined,
    currentSeason: team.current_season || 'Season 1',
    isEnabled: team.is_enabled ?? true,
    players: (playersResult.data || []).map(p => ({
      id: p.id,
      name: p.name,
      teamId: p.team_id,
      deletedAt: p.deleted_at || null,
    })),
    debtTags: (tagsResult.data || []).map(t => ({
      id: t.id,
      name: t.name,
      defaultAmount: parseFloat(t.default_amount.toString()),
    })),
  };
  } catch (error) {
    console.error('Exception in getTeam:', error);
    return null;
  }
};

// Create a new team for the current authenticated user
export const createTeam = async (name: string, leagueId?: string | null): Promise<Team> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Use database function to create team (bypasses RLS)
  const { data: teamId, error: rpcError } = await supabase.rpc('create_team_for_user', {
    p_user_id: user.id,
    p_name: name,
    p_league_id: leagueId || null,
  });

  if (rpcError) {
    console.error('Error creating team via RPC:', rpcError);
    throw rpcError;
  }

  if (!teamId) {
    throw new Error('Failed to create team');
  }

  // Fetch the created team to return full data
  const { data: team, error: fetchError } = await supabase
    .from('teams')
    .select('id, name, username, league, league_id, current_season, is_enabled')
    .eq('id', teamId)
    .single();
  
  let fetchedTeam: TeamRow | null = team as TeamRow | null;
  let fetchedError = fetchError;
  if (fetchError && fetchError.message?.toLowerCase().includes('username')) {
    const fallback = await supabase
      .from('teams')
      .select('id, name, league, league_id, current_season, is_enabled')
      .eq('id', teamId)
      .single();
    fetchedTeam = fallback.data as TeamRow | null;
    fetchedError = fallback.error;
  }

  if (fetchedError || !fetchedTeam) {
    console.error('Error fetching created team:', fetchedError);
    throw fetchedError;
  }

  // Invalidate cache
  cache.invalidate('team_id');

  return {
    id: fetchedTeam.id,
    name: fetchedTeam.name,
    username: ('username' in fetchedTeam ? fetchedTeam.username : '') || fetchedTeam.name.toLowerCase().replace(/[^a-z0-9._]+/g, ''),
    league: fetchedTeam.league || '',
    leagueId: fetchedTeam.league_id || undefined,
    currentSeason: fetchedTeam.current_season || 'Season 1',
    isEnabled: fetchedTeam.is_enabled ?? true,
    players: [],
    debtTags: [],
  };
};

export const saveTeam = async (team: Team): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  const { error } = await supabase
    .from('teams')
    .update({
      name: team.name,
      league: team.league,
      current_season: team.currentSeason,
    })
    .eq('id', teamId);

  if (error) {
    console.error('Error saving team:', error);
    throw error;
  }

  // Invalidate team cache when team is updated
  cache.invalidate('team_id');
};

export const saveTeamUsername = async (username: string): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  const normalized = username.trim().toLowerCase();

  const { error } = await supabase
    .from('teams')
    .update({ username: normalized })
    .eq('id', teamId);

  if (error) {
    console.error('Error saving team username:', error);
    throw error;
  }

  cache.invalidate('team_id');
};

// Get current season for the team (from league)
export const getCurrentSeason = async (): Promise<string> => {
  const team = await getTeam();
  if (!team || !team.leagueId) return 'Season 1';

  // Get current season from league
  const { data: league, error } = await supabase
    .from('leagues')
    .select('current_season')
    .eq('id', team.leagueId)
    .single();

  if (error || !league) {
    console.error('Error fetching league season:', error);
    return 'Season 1';
  }

  return league.current_season || 'Season 1';
};

// Get all available seasons for the team (from games in their league)
export const getAvailableSeasons = async (): Promise<string[]> => {
  const teamId = await getTeamId();
  if (!teamId) return ['Season 1'];

  const { data, error } = await supabase
    .from('games')
    .select('season')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching seasons:', error);
    return ['Season 1'];
  }

  const uniqueSeasons = Array.from(new Set((data || []).map(g => g.season || 'Season 1')))
    .filter(s => s)
    .sort((a, b) => {
      // Sort by season number: "League Name - Season 1", "League Name - Season 2", etc.
      // Extract season number from format like "League Name - Season X"
      const numA = parseInt(a.match(/Season\s+(\d+)/)?.[1] || '0') || 0;
      const numB = parseInt(b.match(/Season\s+(\d+)/)?.[1] || '0') || 0;
      return numA - numB;
    });

  return uniqueSeasons.length > 0 ? uniqueSeasons : ['Season 1'];
};

// Start a new season
export const startNewSeason = async (): Promise<string> => {
  throw new Error('SEASON_MANAGED_BY_LEAGUE');
};

// Players
export const getPlayers = async (forceRefresh = false): Promise<Player[]> => {
  const cacheKey = 'players';
  
  // Return cached data immediately if available (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = cache.get<Player[]>(cacheKey);
    if (cached) {
      // Fetch fresh data in background (don't await)
      getPlayers(true).catch(() => {}); // Silently fail background refresh
      return cached;
    }
  }

  const teamId = await getTeamId();
  if (!teamId) return [];

  const { data, error } = await supabase
    .from('players')
    .select('id, name, team_id, deleted_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  const players = (data || []).map(p => ({
    id: p.id,
    name: p.name,
    teamId: p.team_id,
    deletedAt: p.deleted_at || null,
  }));

  // Cache for 2 minutes (players don't change often)
  cache.set(cacheKey, players, 2 * 60 * 1000);
  return players;
};

export const savePlayers = async (players: Player[]): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Delete all existing players for this team
  await supabase.from('players').delete().eq('team_id', teamId);

  // Insert new players
  if (players.length > 0) {
    const { error } = await supabase.from('players').insert(
      players.map(p => ({
        id: p.id,
        team_id: teamId,
        name: p.name,
      }))
    );

    if (error) {
      console.error('Error saving players:', error);
    }
  }
};

export const addPlayer = async (player: Player): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) {
    console.error('No team ID found for current user');
    return;
  }

  const { error } = await supabase.from('players').insert({
    id: player.id,
    team_id: teamId,
    name: player.name,
  });

  if (error) {
    console.error('Error adding player:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('players');
};

// Check if a player has any outstanding debts
export const playerHasDebts = async (playerId: string): Promise<boolean> => {
  const teamId = await getTeamId();
  if (!teamId) return false;

  // Check if player is the payer of any debt for this team
  const { data: debtsAsPayer, error: payerError } = await supabase
    .from('debts')
    .select('id')
    .eq('team_id', teamId)
    .eq('paid_by', playerId)
    .limit(1);

  if (payerError) {
    console.error('Error checking debts as payer:', payerError);
    return false;
  }

  if (debtsAsPayer && debtsAsPayer.length > 0) {
    return true;
  }

  // Get all debt IDs for this team first
  const { data: teamDebts, error: debtsError } = await supabase
    .from('debts')
    .select('id')
    .eq('team_id', teamId);

  if (debtsError || !teamDebts || teamDebts.length === 0) {
    return false;
  }

  const debtIds = teamDebts.map(d => d.id);

  // Check if player is in the split_between of any debt for this team
  const { data: debtsInSplit, error: splitError } = await supabase
    .from('debt_split_between')
    .select('debt_id')
    .eq('player_id', playerId)
    .in('debt_id', debtIds)
    .limit(1);

  if (splitError) {
    console.error('Error checking debts in split:', splitError);
    return false;
  }

  if (debtsInSplit && debtsInSplit.length > 0) {
    return true;
  }

  return false;
};

export const playerHasBetTally = async (playerId: string): Promise<boolean> => {
  const teamId = await getTeamId();
  if (!teamId) return false;

  // Check if player has a non-zero bet tally
  const { data, error } = await supabase
    .from('bet_tallies')
    .select('tally')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    // If no record exists, player has no tally (tally is 0)
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking bet tally:', error);
    return false;
  }

  // Return true if tally exists and is greater than 0
  return (data?.tally || 0) > 0;
};

export const removePlayer = async (playerId: string): Promise<void> => {
  // Check if player has outstanding debts
  const hasDebts = await playerHasDebts(playerId);
  if (hasDebts) {
    throw new Error('PLAYER_HAS_DEBTS');
  }

  // Check if player has non-zero bet tally
  const hasBetTally = await playerHasBetTally(playerId);
  if (hasBetTally) {
    throw new Error('PLAYER_HAS_BET_TALLY');
  }

  // Soft delete: set deleted_at instead of actually deleting
  const { error } = await supabase
    .from('players')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', playerId);

  if (error) {
    console.error('Error removing player:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('players');
};

// Reactivate a deleted player
export const reactivatePlayer = async (playerId: string): Promise<void> => {
  const { error } = await supabase
    .from('players')
    .update({ deleted_at: null })
    .eq('id', playerId);

  if (error) {
    console.error('Error reactivating player:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('players');
};

// Games
export const getGames = async (forceRefresh = false, season?: string | null): Promise<Game[]> => {
  // If season is null, it means "All Seasons" - don't filter
  // If season is undefined, use current season
  // If season is specified, filter by that season
  
  const cacheKey = season === null ? 'games_all' : `games_${season || 'current'}`;
  
  // Return cached data immediately if available (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = cache.get<Game[]>(cacheKey);
    if (cached) {
      // Fetch fresh data in background (don't await)
      getGames(true, season).catch(() => {}); // Silently fail background refresh
      return cached;
    }
  }

  const teamId = await getTeamId();
  if (!teamId) return [];

  let query = supabase
    .from('games')
    .select('id, player_id, date, total_score, strikes_frames_1_to_9, spares_frames_1_to_9, tenth_frame, game_session_id, season, created_at')
    .eq('team_id', teamId);

  // Filter by season if specified (null means all seasons, undefined means current)
  if (season !== null && season !== undefined) {
    query = query.eq('season', season);
  } else if (season === undefined) {
    // Use current season
    const currentSeason = await getCurrentSeason();
    query = query.eq('season', currentSeason);
  }
  // If season is null, don't filter (show all seasons)

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error);
    return [];
  }

  const games = (data || []).map(g => ({
    id: g.id,
    playerId: g.player_id || null, // null when player is deleted
    date: g.date,
    totalScore: g.total_score,
    strikesFrames1to9: g.strikes_frames_1_to_9,
    sparesFrames1to9: g.spares_frames_1_to_9,
    tenthFrame: g.tenth_frame || '',
    gameSessionId: g.game_session_id || undefined,
    season: g.season || 'Season 1',
    created_at: g.created_at || g.date,
  }));

  // Cache for 30 seconds (games change more frequently)
  cache.set(cacheKey, games, 30000);
  return games;
};

export const saveGames = async (games: Game[]): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // This is typically used for bulk operations, but we'll insert individually
  for (const game of games) {
    await addGame(game);
  }
};

export const addGame = async (game: Game): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Get current season if not specified
  const season = game.season || await getCurrentSeason();

  const { error } = await supabase.from('games').insert({
    id: game.id,
    team_id: teamId,
    player_id: game.playerId,
    date: game.date,
    total_score: game.totalScore,
    strikes_frames_1_to_9: game.strikesFrames1to9,
    spares_frames_1_to_9: game.sparesFrames1to9,
    tenth_frame: game.tenthFrame,
    game_session_id: game.gameSessionId || null,
    season: season,
  });

  if (error) {
    console.error('Error adding game:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('games');
};

export const removeGame = async (gameId: string): Promise<void> => {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);

  if (error) {
    console.error('Error removing game:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('games');
};

export const removeGamesBySession = async (gameSessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('game_session_id', gameSessionId);

  if (error) {
    console.error('Error removing games by session:', error);
    throw error;
  }

  // Invalidate cache
  cache.invalidate('games');
};

// Debts
export const getDebts = async (forceRefresh = false): Promise<Debt[]> => {
  const cacheKey = 'debts';
  
  // Return cached data immediately if available (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = cache.get<Debt[]>(cacheKey);
    if (cached) {
      // Fetch fresh data in background (don't await)
      getDebts(true).catch(() => {}); // Silently fail background refresh
      return cached;
    }
  }

  const teamId = await getTeamId();
  if (!teamId) return [];

  const { data: debts, error } = await supabase
    .from('debts')
    .select(`
      id,
      tag_id,
      custom_name,
      amount,
      paid_by,
      split_method,
      game_counts,
      custom_amounts,
      date,
      created_at
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching debts:', error);
    return [];
  }

  // Fetch split relationships separately
  const debtIds = (debts || []).map(d => d.id);
  let splits: Array<{ debt_id: string; player_id: string }> = [];
  if (debtIds.length > 0) {
    const { data: splitsData } = await supabase
      .from('debt_split_between')
      .select('debt_id, player_id')
      .in('debt_id', debtIds);
    splits = splitsData || [];
  }

  // Group splits by debt_id
  const splitsByDebt: Record<string, string[]> = {};
  splits.forEach(split => {
    if (!splitsByDebt[split.debt_id]) {
      splitsByDebt[split.debt_id] = [];
    }
    splitsByDebt[split.debt_id].push(split.player_id);
  });

  const result = (debts || []).map(d => ({
    id: d.id,
    tag: d.tag_id || undefined,
    customName: d.custom_name || undefined,
    amount: parseFloat(d.amount.toString()),
    paidBy: d.paid_by,
    splitBetween: splitsByDebt[d.id] || [],
    splitMethod: d.split_method as 'equal' | 'games' | 'custom',
    gameCounts: d.game_counts || undefined,
    customAmounts: d.custom_amounts ? Object.fromEntries(
      Object.entries(d.custom_amounts).map(([k, v]) => [k, parseFloat(v as string)])
    ) : undefined,
    date: d.date,
    created_at: d.created_at || d.date, // Fallback to date if created_at not available
  }));

  // Cache for 30 seconds (debts change more frequently)
  cache.set(cacheKey, result, 30000);
  return result;
};

export const saveDebts = async (debts: Debt[]): Promise<void> => {
  // For bulk save, we'll delete all and reinsert
  const teamId = await getTeamId();
  if (!teamId) return;

  // Get all current debts
  const currentDebts = await getDebts();
  
  // Delete all existing debts and their splits
  for (const debt of currentDebts) {
    await removeDebt(debt.id);
  }

  // Insert new debts
  for (const debt of debts) {
    await addDebt(debt);
  }
};

export const addDebt = async (debt: Debt): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Insert the debt
  const { data: newDebt, error: debtError } = await supabase
    .from('debts')
    .insert({
      team_id: teamId,
      tag_id: debt.tag || null,
      custom_name: debt.customName || null,
      amount: debt.amount,
      paid_by: debt.paidBy,
      split_method: debt.splitMethod,
      game_counts: debt.gameCounts || null,
      custom_amounts: debt.customAmounts || null,
      date: debt.date,
    })
    .select()
    .single();

  if (debtError || !newDebt) {
    console.error('Error adding debt:', debtError);
    return;
  }

  // Insert split relationships
  if (debt.splitBetween && debt.splitBetween.length > 0) {
    const { error: splitError } = await supabase
      .from('debt_split_between')
      .insert(
        debt.splitBetween.map(playerId => ({
          debt_id: newDebt.id,
          player_id: playerId,
        }))
      );

    if (splitError) {
      console.error('Error adding debt splits:', splitError);
    }
  }

  // Invalidate cache
  cache.invalidate('debts');
};

export const updateDebt = async (debtId: string, updatedDebt: Debt): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Update the debt
  const { error: debtError } = await supabase
    .from('debts')
    .update({
      tag_id: updatedDebt.tag || null,
      custom_name: updatedDebt.customName || null,
      amount: updatedDebt.amount,
      paid_by: updatedDebt.paidBy,
      split_method: updatedDebt.splitMethod,
      game_counts: updatedDebt.gameCounts || null,
      custom_amounts: updatedDebt.customAmounts || null,
      date: updatedDebt.date,
    })
    .eq('id', debtId);

  if (debtError) {
    console.error('Error updating debt:', debtError);
    return;
  }

  // Delete existing splits
  await supabase
    .from('debt_split_between')
    .delete()
    .eq('debt_id', debtId);

  // Insert new splits
  if (updatedDebt.splitBetween && updatedDebt.splitBetween.length > 0) {
    const { error: splitError } = await supabase
      .from('debt_split_between')
      .insert(
        updatedDebt.splitBetween.map(playerId => ({
          debt_id: debtId,
          player_id: playerId,
        }))
      );

    if (splitError) {
      console.error('Error updating debt splits:', splitError);
    }
  }

  // Invalidate cache
  cache.invalidate('debts');
};

export const removeDebt = async (debtId: string): Promise<void> => {
  // Delete splits first (cascade should handle this, but being explicit)
  await supabase
    .from('debt_split_between')
    .delete()
    .eq('debt_id', debtId);

  // Delete the debt
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId);

  if (error) {
    console.error('Error removing debt:', error);
    return;
  }

  // Invalidate cache
  cache.invalidate('debts');
};

// Debt Tags
export const getDebtTags = async (forceRefresh = false): Promise<DebtTag[]> => {
  const cacheKey = 'debt_tags';
  
  // Return cached data immediately if available (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = cache.get<DebtTag[]>(cacheKey);
    if (cached) {
      // Fetch fresh data in background (don't await)
      getDebtTags(true).catch(() => {}); // Silently fail background refresh
      return cached;
    }
  }

  const teamId = await getTeamId();
  if (!teamId) return [];

  const { data, error } = await supabase
    .from('debt_tags')
    .select('id, name, default_amount')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching debt tags:', error);
    return [];
  }

  const tags = (data || []).map(t => ({
    id: t.id,
    name: t.name,
    defaultAmount: parseFloat(t.default_amount.toString()),
  }));

  // Cache for 2 minutes (tags don't change often)
  cache.set(cacheKey, tags, 2 * 60 * 1000);
  return tags;
};

export const saveDebtTags = async (tags: DebtTag[]): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Delete all existing tags
  await supabase.from('debt_tags').delete().eq('team_id', teamId);

  // Insert new tags
  if (tags.length > 0) {
    const { error } = await supabase.from('debt_tags').insert(
      tags.map(t => ({
        id: t.id,
        team_id: teamId,
        name: t.name,
        default_amount: t.defaultAmount,
      }))
    );

    if (error) {
      console.error('Error saving debt tags:', error);
    }
  }
};

export const addDebtTag = async (tag: DebtTag): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  const { error } = await supabase.from('debt_tags').insert({
    id: tag.id,
    team_id: teamId,
    name: tag.name,
    default_amount: tag.defaultAmount,
  });

  if (error) {
    console.error('Error adding debt tag:', error);
    return;
  }

  // Invalidate cache
  cache.invalidate('debt_tags');
};

export const updateDebtTag = async (tagId: string, updatedTag: DebtTag): Promise<void> => {
  const { error } = await supabase
    .from('debt_tags')
    .update({
      name: updatedTag.name,
      default_amount: updatedTag.defaultAmount,
    })
    .eq('id', tagId);

  if (error) {
    console.error('Error updating debt tag:', error);
    return;
  }

  // Invalidate cache
  cache.invalidate('debt_tags');
};

export const removeDebtTag = async (tagId: string): Promise<void> => {
  const { error } = await supabase
    .from('debt_tags')
    .delete()
    .eq('id', tagId);

  if (error) {
    console.error('Error removing debt tag:', error);
    return;
  }

  // Invalidate cache
  cache.invalidate('debt_tags');
};

// Bet Tallies
export const getBetTallies = async (forceRefresh = false): Promise<BetTallies> => {
  const cacheKey = 'bet_tallies';
  
  // Return cached data immediately if available (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = cache.get<BetTallies>(cacheKey);
    if (cached) {
      // Fetch fresh data in background (don't await)
      getBetTallies(true).catch(() => {}); // Silently fail background refresh
      return cached;
    }
  }

  const teamId = await getTeamId();
  if (!teamId) return {};

  const { data, error } = await supabase
    .from('bet_tallies')
    .select('player_id, tally')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching bet tallies:', error);
    return {};
  }

  const tallies: BetTallies = {};
  (data || []).forEach(item => {
    tallies[item.player_id] = item.tally;
  });

  // Cache for 15 seconds (tallies change frequently but not constantly)
  cache.set(cacheKey, tallies, 15000);
  return tallies;
};

export const saveBetTallies = async (tallies: BetTallies): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Upsert all tallies
  const entries = Object.entries(tallies);
  if (entries.length > 0) {
    const { error } = await supabase.from('bet_tallies').upsert(
      entries.map(([playerId, tally]) => ({
        team_id: teamId,
        player_id: playerId,
        tally,
      })),
      { onConflict: 'team_id,player_id' }
    );

    if (error) {
      console.error('Error saving bet tallies:', error);
    }
  }
};

export const incrementBetTally = async (playerId: string): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Get current tally
  const { data: current } = await supabase
    .from('bet_tallies')
    .select('tally')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .single();

  const newTally = (current?.tally || 0) + 1;

  const { error } = await supabase.from('bet_tallies').upsert({
    team_id: teamId,
    player_id: playerId,
    tally: newTally,
  }, { onConflict: 'team_id,player_id' });

  if (error) {
    console.error('Error incrementing bet tally:', error);
    return;
  }

  // Invalidate cache
  cache.invalidate('bet_tallies');
};

export const decrementBetTally = async (playerId: string): Promise<void> => {
  const teamId = await getTeamId();
  if (!teamId) return;

  // Get current tally
  const { data: current } = await supabase
    .from('bet_tallies')
    .select('tally')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .single();

  const currentTally = current?.tally || 0;
  if (currentTally > 0) {
    const newTally = currentTally - 1;

    const { error } = await supabase.from('bet_tallies').upsert({
      team_id: teamId,
      player_id: playerId,
      tally: newTally,
    }, { onConflict: 'team_id,player_id' });

    if (error) {
      console.error('Error decrementing bet tally:', error);
      return;
    }

    // Invalidate cache
    cache.invalidate('bet_tallies');
  }
};


// Clear all cache (useful on logout or when switching users)
export const clearCache = (): void => {
  cache.clear();
};

// Initialize default data
// Get all leagues (for signup dropdown - simple version)
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

// Check if current team is enabled (optimized - only fetches is_enabled field)
export const checkTeamEnabled = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // No user = allow access (will show login)

    const { data: team, error } = await supabase
      .from('teams')
      .select('is_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // PGRST116 is "no rows returned" which is fine (user is admin)
      if (error.code === 'PGRST116') {
        return true; // No team means this is likely an admin account
      }
      console.error('Error checking team enabled status:', error);
      return false; // Fail closed for non-admin errors
    }

    // No team means this is likely an admin account
    if (!team) return true;

    return team.is_enabled === true;
  } catch (error) {
    console.error('Exception checking team enabled status:', error);
    return false; // Fail closed on unexpected errors
  }
};

export const initializeDefaultData = async (): Promise<void> => {
  // No default data to initialize
  // Users can create their own tags as needed
};
