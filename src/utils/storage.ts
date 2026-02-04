import { supabase } from '../lib/supabase';
import type { Team, Player, Game, Debt, DebtTag, BetTallies } from '../types';

// Helper to get current user's team ID
const getTeamId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: team, error } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (error || !team) return null;
  return team.id;
};

// Team
export const getTeam = async (): Promise<Team | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, league, league_id')
    .eq('user_id', user.id)
    .single();

  if (error || !team) return null;

  // Get players and debt tags for the team
  const [playersResult, tagsResult] = await Promise.all([
    supabase.from('players').select('id, name, team_id').eq('team_id', team.id),
    supabase.from('debt_tags').select('id, name, default_amount').eq('team_id', team.id),
  ]);

  return {
    id: team.id,
    name: team.name,
    league: team.league || '',
    leagueId: team.league_id || undefined,
    players: (playersResult.data || []).map(p => ({
      id: p.id,
      name: p.name,
      teamId: p.team_id,
    })),
    debtTags: (tagsResult.data || []).map(t => ({
      id: t.id,
      name: t.name,
      defaultAmount: parseFloat(t.default_amount.toString()),
    })),
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
    })
    .eq('id', teamId);

  if (error) {
    console.error('Error saving team:', error);
  }
};

// Players
export const getPlayers = async (): Promise<Player[]> => {
  const teamId = await getTeamId();
  if (!teamId) return [];

  const { data, error } = await supabase
    .from('players')
    .select('id, name, team_id')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    teamId: p.team_id,
  }));
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
};

export const removePlayer = async (playerId: string): Promise<void> => {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error('Error removing player:', error);
  }
};

// Games
export const getGames = async (): Promise<Game[]> => {
  const teamId = await getTeamId();
  if (!teamId) return [];

  const { data, error } = await supabase
    .from('games')
    .select('id, player_id, date, total_score, strikes_frames_1_to_9, spares_frames_1_to_9, tenth_frame, game_session_id')
    .eq('team_id', teamId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error);
    return [];
  }

  return (data || []).map(g => ({
    id: g.id,
    playerId: g.player_id,
    date: g.date,
    totalScore: g.total_score,
    strikesFrames1to9: g.strikes_frames_1_to_9,
    sparesFrames1to9: g.spares_frames_1_to_9,
    tenthFrame: g.tenth_frame || '',
    gameSessionId: g.game_session_id || undefined,
  }));
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
  });

  if (error) {
    console.error('Error adding game:', error);
    throw error;
  }
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
};

// Debts
export const getDebts = async (): Promise<Debt[]> => {
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
      date
    `)
    .eq('team_id', teamId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching debts:', error);
    return [];
  }

  // Fetch split relationships separately
  const debtIds = (debts || []).map(d => d.id);
  let splits: any[] = [];
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

  return (debts || []).map(d => ({
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
  }));
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
  }
};

// Debt Tags
export const getDebtTags = async (): Promise<DebtTag[]> => {
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

  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    defaultAmount: parseFloat(t.default_amount.toString()),
  }));
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
  }
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
  }
};

export const removeDebtTag = async (tagId: string): Promise<void> => {
  const { error } = await supabase
    .from('debt_tags')
    .delete()
    .eq('id', tagId);

  if (error) {
    console.error('Error removing debt tag:', error);
  }
};

// Bet Tallies
export const getBetTallies = async (): Promise<BetTallies> => {
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
  }
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
    }
  }
};


// Initialize default data
export const initializeDefaultData = async (): Promise<void> => {
  // No default data to initialize
  // Users can create their own tags as needed
};
