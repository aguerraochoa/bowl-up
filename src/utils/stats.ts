import type { Game, Player, Stats } from '../types';
import { getGames, getPlayers } from './storage';
import { calculateStrikePercentage, calculateSparePercentage, parseTenthFrame } from './scoring';

// Optimized version that accepts games data
export const calculatePlayerStatsFromData = (playerId: string, games: Game[]): Stats => {
  const playerGames = games.filter(g => g.playerId === playerId);
  
  if (playerGames.length === 0) {
    return {
      gamesPlayed: 0,
      averageScore: 0,
      strikePercentage: 0,
      sparePercentage: 0,
      floor: 0,
      ceiling: 0,
      recentAverage: 0,
      averageTenthFrame: 0,
      gamesAbove200: 0,
      gamesAbove200Percentage: 0,
    };
  }
  
  const scores = playerGames.map(g => g.totalScore);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / playerGames.length;
  
  // Calculate strike and spare percentages
  let totalStrikePct = 0;
  let totalSparePct = 0;
  playerGames.forEach(game => {
    totalStrikePct += calculateStrikePercentage(game);
    totalSparePct += calculateSparePercentage(game);
  });
  const strikePercentage = playerGames.length > 0 ? totalStrikePct / playerGames.length : 0;
  const sparePercentage = playerGames.length > 0 ? totalSparePct / playerGames.length : 0;
  
  // Floor and ceiling
  const floor = Math.min(...scores);
  const ceiling = Math.max(...scores);
  
  // Recent average (last 10 games)
  const recentGames = playerGames.slice(-10);
  const recentTotal = recentGames.reduce((sum, g) => sum + g.totalScore, 0);
  const recentAverage = recentGames.length > 0 ? recentTotal / recentGames.length : 0;
  
  // Calculate average 10th frame score
  let totalTenthFramePins = 0;
  playerGames.forEach(game => {
    const tenthFrame = parseTenthFrame(game.tenthFrame);
    totalTenthFramePins += tenthFrame.totalPins;
  });
  const averageTenthFrame = playerGames.length > 0 ? totalTenthFramePins / playerGames.length : 0;
  
  // Calculate games above 200
  const gamesAbove200 = scores.filter(score => score > 200).length;
  const gamesAbove200Percentage = playerGames.length > 0 ? (gamesAbove200 / playerGames.length) * 100 : 0;
  
  return {
    gamesPlayed: playerGames.length,
    averageScore: Math.round(averageScore * 10) / 10,
    strikePercentage: Math.round(strikePercentage * 10) / 10,
    sparePercentage: Math.round(sparePercentage * 10) / 10,
    floor,
    ceiling,
    recentAverage: Math.round(recentAverage * 10) / 10,
    averageTenthFrame: Math.round(averageTenthFrame * 10) / 10,
    gamesAbove200,
    gamesAbove200Percentage: Math.round(gamesAbove200Percentage * 10) / 10,
  };
};

// Keep original async version for backward compatibility
export const calculatePlayerStats = async (playerId: string): Promise<Stats> => {
  const games = await getGames();
  return calculatePlayerStatsFromData(playerId, games);
};

// Optimized version that accepts games data
export const calculateTeamStatsFromData = (games: Game[]) => {
  // Filter out games from deleted players (null playerId) for team averages
  // This ensures team stats reflect current team performance
  const activePlayerGames = games.filter(g => g.playerId !== null);
  
  if (activePlayerGames.length === 0) {
    return {
      teamGameAverage: 0,
      totalGames: 0,
      totalStrikePercentage: 0,
      totalSparePercentage: 0,
      averageTenthFrame: 0,
    };
  }
  
  const totalScore = activePlayerGames.reduce((sum, g) => sum + g.totalScore, 0);
  const teamGameAverage = totalScore / activePlayerGames.length;
  
  // Total individual games played (only active players)
  const totalGames = activePlayerGames.length;
  
  // Overall strike and spare percentages
  let totalStrikePct = 0;
  let totalSparePct = 0;
  activePlayerGames.forEach(game => {
    totalStrikePct += calculateStrikePercentage(game);
    totalSparePct += calculateSparePercentage(game);
  });
  const totalStrikePercentage = activePlayerGames.length > 0 ? totalStrikePct / activePlayerGames.length : 0;
  const totalSparePercentage = activePlayerGames.length > 0 ? totalSparePct / activePlayerGames.length : 0;
  
  // Calculate average 10th frame score
  let totalTenthFramePins = 0;
  activePlayerGames.forEach(game => {
    const tenthFrame = parseTenthFrame(game.tenthFrame);
    totalTenthFramePins += tenthFrame.totalPins;
  });
  const averageTenthFrame = activePlayerGames.length > 0 ? totalTenthFramePins / activePlayerGames.length : 0;
  
  return {
    teamGameAverage: Math.round(teamGameAverage * 10) / 10,
    totalGames,
    totalStrikePercentage: Math.round(totalStrikePercentage * 10) / 10,
    totalSparePercentage: Math.round(totalSparePercentage * 10) / 10,
    averageTenthFrame: Math.round(averageTenthFrame * 10) / 10,
  };
};

// Keep original async version for backward compatibility
export const calculateTeamStats = async () => {
  const games = await getGames();
  return calculateTeamStatsFromData(games);
};

// Optimized version that accepts games and players data
export const getTopIndividualGamesFromData = (games: Game[], players: Player[], limit: number = 10): Array<Game & { playerName: string }> => {
  // Filter out games from deleted players (null playerId) for individual leaderboards
  const activePlayerGames = games.filter(g => g.playerId !== null);
  
  const gamesWithNames = activePlayerGames.map(game => ({
    ...game,
    playerName: players.find((p: Player) => p.id === game.playerId)?.name || 'Unknown',
  }));
  
  return gamesWithNames
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
};

// Keep original async version for backward compatibility
export const getTopIndividualGames = async (limit: number = 10): Promise<Array<Game & { playerName: string }>> => {
  const games = await getGames();
  const players = await getPlayers();
  return getTopIndividualGamesFromData(games, players, limit);
};

// Optimized version that accepts games data
export const getTopTeamSumGamesFromData = (games: Game[], limit: number = 5): Array<{ date: string; totalSum: number; players: string[]; games: Game[] }> => {
  // Group by game_session_id instead of date
  // Include ALL games (even from deleted players) to preserve historical team game accuracy
  const gamesBySession = new Map<string, Game[]>();
  
  games.forEach(game => {
    // Only include games that have a session ID (actual team games)
    if (game.gameSessionId) {
      const sessionGames = gamesBySession.get(game.gameSessionId) || [];
      sessionGames.push(game);
      gamesBySession.set(game.gameSessionId, sessionGames);
    }
  });
  
  const teamSumGames = Array.from(gamesBySession.entries()).map(([_sessionId, sessionGames]) => {
    // All games in this session are from the same team game
    // Include ALL games (even with null playerId) to preserve historical accuracy
    const totalSum = sessionGames.reduce((sum, g) => sum + g.totalScore, 0);
    const players = sessionGames.map(g => g.playerId).filter((id): id is string => id !== null);
    const date = sessionGames[0]?.date || ''; // Get date from first game
    
    return { date, totalSum, players, games: sessionGames };
  });
  
  return teamSumGames
    .sort((a, b) => b.totalSum - a.totalSum)
    .slice(0, limit);
};

// Keep original async version for backward compatibility
export const getTopTeamSumGames = async (limit: number = 5): Promise<Array<{ date: string; totalSum: number; players: string[]; games: Game[] }>> => {
  const games = await getGames();
  return getTopTeamSumGamesFromData(games, limit);
};

// Optimized version that accepts games and players data
export const getTopIndividualAveragesFromData = (games: Game[], players: Player[], limit: number = 5): Array<{ playerId: string; playerName: string; average: number }> => {
  // Filter out games from deleted players (null playerId) for individual averages
  const activePlayerGames = games.filter(g => g.playerId !== null);
  
  const playerAverages = players.map((player: Player) => {
    const playerGames = activePlayerGames.filter(g => g.playerId === player.id);
    if (playerGames.length === 0) return null;
    
    const total = playerGames.reduce((sum, g) => sum + g.totalScore, 0);
    const average = total / playerGames.length;
    
    return {
      playerId: player.id,
      playerName: player.name,
      average: Math.round(average * 10) / 10,
    };
  }).filter((p): p is { playerId: string; playerName: string; average: number } => p !== null);
  
  return playerAverages
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
};

// Keep original async version for backward compatibility
export const getTopIndividualAverages = async (limit: number = 5): Promise<Array<{ playerId: string; playerName: string; average: number }>> => {
  const players = await getPlayers();
  const games = await getGames();
  return getTopIndividualAveragesFromData(games, players, limit);
};

// Optimized version that accepts games and players data
export const getTopTenthFrameAveragesFromData = (games: Game[], players: Player[], limit: number = 5): Array<{ playerId: string; playerName: string; average: number }> => {
  // Filter out games from deleted players (null playerId) for individual averages
  const activePlayerGames = games.filter(g => g.playerId !== null);
  
  const playerTenthFrameAverages = players.map((player: Player) => {
    const playerGames = activePlayerGames.filter(g => g.playerId === player.id);
    if (playerGames.length === 0) return null;
    
    let totalTenthFramePins = 0;
    playerGames.forEach(game => {
      const tenthFrame = parseTenthFrame(game.tenthFrame);
      totalTenthFramePins += tenthFrame.totalPins;
    });
    
    const average = totalTenthFramePins / playerGames.length;
    
    return {
      playerId: player.id,
      playerName: player.name,
      average: Math.round(average * 10) / 10,
    };
  }).filter((p): p is { playerId: string; playerName: string; average: number } => p !== null);
  
  return playerTenthFrameAverages
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
};

// Keep original async version for backward compatibility
export const getTopTenthFrameAverages = async (limit: number = 5): Promise<Array<{ playerId: string; playerName: string; average: number }>> => {
  const players = await getPlayers();
  const games = await getGames();
  return getTopTenthFrameAveragesFromData(games, players, limit);
};
