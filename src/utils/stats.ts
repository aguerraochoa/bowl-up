import type { Game, Player, Stats } from '../types';
import { getGames, getPlayers } from './storage';
import { calculateStrikePercentage, calculateSparePercentage, parseTenthFrame } from './scoring';

export const calculatePlayerStats = async (playerId: string): Promise<Stats> => {
  const games = (await getGames()).filter(g => g.playerId === playerId);
  
  if (games.length === 0) {
    return {
      gamesPlayed: 0,
      averageScore: 0,
      strikePercentage: 0,
      sparePercentage: 0,
      floor: 0,
      ceiling: 0,
      recentAverage: 0,
    };
  }
  
  const scores = games.map(g => g.totalScore);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / games.length;
  
  // Calculate strike and spare percentages
  let totalStrikePct = 0;
  let totalSparePct = 0;
  games.forEach(game => {
    totalStrikePct += calculateStrikePercentage(game);
    totalSparePct += calculateSparePercentage(game);
  });
  const strikePercentage = games.length > 0 ? totalStrikePct / games.length : 0;
  const sparePercentage = games.length > 0 ? totalSparePct / games.length : 0;
  
  // Floor and ceiling
  const floor = Math.min(...scores);
  const ceiling = Math.max(...scores);
  
  // Recent average (last 10 games)
  const recentGames = games.slice(-10);
  const recentTotal = recentGames.reduce((sum, g) => sum + g.totalScore, 0);
  const recentAverage = recentGames.length > 0 ? recentTotal / recentGames.length : 0;
  
  return {
    gamesPlayed: games.length,
    averageScore: Math.round(averageScore * 10) / 10,
    strikePercentage: Math.round(strikePercentage * 10) / 10,
    sparePercentage: Math.round(sparePercentage * 10) / 10,
    floor,
    ceiling,
    recentAverage: Math.round(recentAverage * 10) / 10,
  };
};

export const calculateTeamStats = async () => {
  const games = await getGames();
  
  if (games.length === 0) {
    return {
      teamGameAverage: 0,
      totalGames: 0,
      totalStrikePercentage: 0,
      totalSparePercentage: 0,
      averageTenthFrame: 0,
    };
  }
  
  const totalScore = games.reduce((sum, g) => sum + g.totalScore, 0);
  const teamGameAverage = totalScore / games.length;
  
  // Total individual games played
  const totalGames = games.length;
  
  // Overall strike and spare percentages
  let totalStrikePct = 0;
  let totalSparePct = 0;
  games.forEach(game => {
    totalStrikePct += calculateStrikePercentage(game);
    totalSparePct += calculateSparePercentage(game);
  });
  const totalStrikePercentage = games.length > 0 ? totalStrikePct / games.length : 0;
  const totalSparePercentage = games.length > 0 ? totalSparePct / games.length : 0;
  
  // Calculate average 10th frame score
  let totalTenthFramePins = 0;
  games.forEach(game => {
    const tenthFrame = parseTenthFrame(game.tenthFrame);
    totalTenthFramePins += tenthFrame.totalPins;
  });
  const averageTenthFrame = games.length > 0 ? totalTenthFramePins / games.length : 0;
  
  return {
    teamGameAverage: Math.round(teamGameAverage * 10) / 10,
    totalGames,
    totalStrikePercentage: Math.round(totalStrikePercentage * 10) / 10,
    totalSparePercentage: Math.round(totalSparePercentage * 10) / 10,
    averageTenthFrame: Math.round(averageTenthFrame * 10) / 10,
  };
};

export const getTopIndividualGames = async (limit: number = 10): Promise<Array<Game & { playerName: string }>> => {
  const games = await getGames();
  const players = await getPlayers();
  
  const gamesWithNames = games.map(game => ({
    ...game,
    playerName: players.find((p: Player) => p.id === game.playerId)?.name || 'Unknown',
  }));
  
  return gamesWithNames
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
};

export const getTopTeamSumGames = async (limit: number = 5): Promise<Array<{ date: string; totalSum: number; players: string[]; games: Game[] }>> => {
  const games = await getGames();
  
  // Group by game_session_id instead of date
  const gamesBySession = new Map<string, Game[]>();
  
  games.forEach(game => {
    // Only include games that have a session ID (actual team games)
    if (game.gameSessionId) {
      const sessionGames = gamesBySession.get(game.gameSessionId) || [];
      sessionGames.push(game);
      gamesBySession.set(game.gameSessionId, sessionGames);
    }
  });
  
  const teamSumGames = Array.from(gamesBySession.entries()).map(([sessionId, sessionGames]) => {
    // All games in this session are from the same team game
    const totalSum = sessionGames.reduce((sum, g) => sum + g.totalScore, 0);
    const players = sessionGames.map(g => g.playerId);
    const date = sessionGames[0]?.date || ''; // Get date from first game
    
    return { date, totalSum, players, games: sessionGames };
  });
  
  return teamSumGames
    .sort((a, b) => b.totalSum - a.totalSum)
    .slice(0, limit);
};

export const getTopIndividualAverages = async (limit: number = 5): Promise<Array<{ playerId: string; playerName: string; average: number }>> => {
  const players = await getPlayers();
  const games = await getGames();
  
  const playerAverages = players.map((player: Player) => {
    const playerGames = games.filter(g => g.playerId === player.id);
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

export const getTopTenthFrameAverages = async (limit: number = 5): Promise<Array<{ playerId: string; playerName: string; average: number }>> => {
  const players = await getPlayers();
  const games = await getGames();
  
  const playerTenthFrameAverages = players.map((player: Player) => {
    const playerGames = games.filter(g => g.playerId === player.id);
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
