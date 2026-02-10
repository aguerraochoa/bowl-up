import type { Game, Player, Stats } from '../types';
import { getGames, getPlayers } from './storage';
import { calculateStrikePercentage, calculateSparePercentage, parseTenthFrame } from './scoring';

const TYPICAL_RANGE_WINDOW = 30;
const MIN_GAMES_FOR_TYPICAL_RANGE = 10;

const round1 = (value: number): number => Math.round(value * 10) / 10;

const getPercentile = (sortedValues: number[], percentile: number): number => {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const clamped = Math.min(Math.max(percentile, 0), 1);
  const index = (sortedValues.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] + ((sortedValues[upper] - sortedValues[lower]) * weight);
};

// Optimized version that accepts games data
export const calculatePlayerStatsFromData = (playerId: string, games: Game[]): Stats => {
  const playerGames = games
    .filter(g => g.playerId === playerId)
    .sort((a, b) => {
      const aDate = a.created_at || a.date;
      const bDate = b.created_at || b.date;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  
  if (playerGames.length === 0) {
    return {
      gamesPlayed: 0,
      averageScore: 0,
      strikePercentage: 0,
      sparePercentage: 0,
      floor: 0,
      ceiling: 0,
      typicalLow: 0,
      typicalHigh: 0,
      consistencyRange: 0,
      personalLow: 0,
      personalBest: 0,
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
  
  // Personal extremes (all-time)
  const floor = Math.min(...scores);
  const ceiling = Math.max(...scores);
  const personalLow = floor;
  const personalBest = ceiling;

  // Typical range (robust to outliers): P20/P80 over last N games
  const rangeWindowGames = playerGames.slice(-TYPICAL_RANGE_WINDOW);
  const rangeWindowScores = rangeWindowGames.map((g) => g.totalScore).sort((a, b) => a - b);
  const usePercentileRange = rangeWindowScores.length >= MIN_GAMES_FOR_TYPICAL_RANGE;
  const typicalLow = usePercentileRange ? getPercentile(rangeWindowScores, 0.2) : Math.min(...rangeWindowScores);
  const typicalHigh = usePercentileRange ? getPercentile(rangeWindowScores, 0.8) : Math.max(...rangeWindowScores);
  const consistencyRange = typicalHigh - typicalLow;
  
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
    averageScore: round1(averageScore),
    strikePercentage: round1(strikePercentage),
    sparePercentage: round1(sparePercentage),
    floor,
    ceiling,
    typicalLow: round1(typicalLow),
    typicalHigh: round1(typicalHigh),
    consistencyRange: round1(consistencyRange),
    personalLow,
    personalBest,
    recentAverage: round1(recentAverage),
    averageTenthFrame: round1(averageTenthFrame),
    gamesAbove200,
    gamesAbove200Percentage: round1(gamesAbove200Percentage),
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
  
  const teamSumGames = Array.from(gamesBySession.entries()).map(([, sessionGames]) => {
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

export const getTopStrikePercentagesFromData = (
  games: Game[],
  players: Player[],
  limit: number = 10,
): Array<{ playerId: string; playerName: string; percentage: number; gamesPlayed: number }> => {
  const activePlayerGames = games.filter((g) => g.playerId !== null);

  const rows = players
    .map((player) => {
      const playerGames = activePlayerGames.filter((g) => g.playerId === player.id);
      if (playerGames.length === 0) return null;

      const total = playerGames.reduce((sum, game) => sum + calculateStrikePercentage(game), 0);
      return {
        playerId: player.id,
        playerName: player.name,
        percentage: Math.round((total / playerGames.length) * 10) / 10,
        gamesPlayed: playerGames.length,
      };
    })
    .filter((row): row is { playerId: string; playerName: string; percentage: number; gamesPlayed: number } => row !== null);

  return rows.sort((a, b) => b.percentage - a.percentage).slice(0, limit);
};

export const getTopSparePercentagesFromData = (
  games: Game[],
  players: Player[],
  limit: number = 10,
): Array<{ playerId: string; playerName: string; percentage: number; gamesPlayed: number }> => {
  const activePlayerGames = games.filter((g) => g.playerId !== null);

  const rows = players
    .map((player) => {
      const playerGames = activePlayerGames.filter((g) => g.playerId === player.id);
      if (playerGames.length === 0) return null;

      const total = playerGames.reduce((sum, game) => sum + calculateSparePercentage(game), 0);
      return {
        playerId: player.id,
        playerName: player.name,
        percentage: Math.round((total / playerGames.length) * 10) / 10,
        gamesPlayed: playerGames.length,
      };
    })
    .filter((row): row is { playerId: string; playerName: string; percentage: number; gamesPlayed: number } => row !== null);

  return rows.sort((a, b) => b.percentage - a.percentage).slice(0, limit);
};
