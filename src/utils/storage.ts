import type { Team, Player, Game, Debt, DebtTag, BetTallies } from '../types';

const STORAGE_KEYS = {
  TEAM: 'bowlup_team',
  PLAYERS: 'bowlup_players',
  GAMES: 'bowlup_games',
  DEBTS: 'bowlup_debts',
  DEBT_TAGS: 'bowlup_debt_tags',
  BET_TALLIES: 'bowlup_bet_tallies',
} as const;

// Team
export const getTeam = (): Team | null => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAM);
  return data ? JSON.parse(data) : null;
};

export const saveTeam = (team: Team): void => {
  localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
};

// Players
export const getPlayers = (): Player[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  return data ? JSON.parse(data) : [];
};

export const savePlayers = (players: Player[]): void => {
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
};

export const addPlayer = (player: Player): void => {
  const players = getPlayers();
  players.push(player);
  savePlayers(players);
};

export const removePlayer = (playerId: string): void => {
  const players = getPlayers().filter(p => p.id !== playerId);
  savePlayers(players);
};

// Games
export const getGames = (): Game[] => {
  const data = localStorage.getItem(STORAGE_KEYS.GAMES);
  return data ? JSON.parse(data) : [];
};

export const saveGames = (games: Game[]): void => {
  localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
};

export const addGame = (game: Game): void => {
  const games = getGames();
  games.push(game);
  saveGames(games);
};

// Debts
export const getDebts = (): Debt[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
  return data ? JSON.parse(data) : [];
};

export const saveDebts = (debts: Debt[]): void => {
  localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
};

export const addDebt = (debt: Debt): void => {
  const debts = getDebts();
  debts.push(debt);
  saveDebts(debts);
};

export const updateDebt = (debtId: string, updatedDebt: Debt): void => {
  const debts = getDebts();
  const index = debts.findIndex(d => d.id === debtId);
  if (index !== -1) {
    debts[index] = updatedDebt;
    saveDebts(debts);
  }
};

export const removeDebt = (debtId: string): void => {
  const debts = getDebts().filter(d => d.id !== debtId);
  saveDebts(debts);
};

// Debt Tags
export const getDebtTags = (): DebtTag[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEBT_TAGS);
  return data ? JSON.parse(data) : [];
};

export const saveDebtTags = (tags: DebtTag[]): void => {
  localStorage.setItem(STORAGE_KEYS.DEBT_TAGS, JSON.stringify(tags));
};

// Bet Tallies
export const getBetTallies = (): BetTallies => {
  const data = localStorage.getItem(STORAGE_KEYS.BET_TALLIES);
  return data ? JSON.parse(data) : {};
};

export const saveBetTallies = (tallies: BetTallies): void => {
  localStorage.setItem(STORAGE_KEYS.BET_TALLIES, JSON.stringify(tallies));
};

export const incrementBetTally = (playerId: string): void => {
  const tallies = getBetTallies();
  tallies[playerId] = (tallies[playerId] || 0) + 1;
  saveBetTallies(tallies);
};

export const decrementBetTally = (playerId: string): void => {
  const tallies = getBetTallies();
  const current = tallies[playerId] || 0;
  if (current > 0) {
    tallies[playerId] = current - 1;
    saveBetTallies(tallies);
  }
};

// Enable/disable tracker feature
export const enableBetTracker = (): void => {
  const team = getTeam();
  if (team) {
    if (!team.features) {
      team.features = {};
    }
    team.features.betTracker = true;
    saveTeam(team);
  }
};

export const disableBetTracker = (): void => {
  const team = getTeam();
  if (team) {
    if (!team.features) {
      team.features = {};
    }
    team.features.betTracker = false;
    saveTeam(team);
  }
};

// Initialize default data
export const initializeDefaultData = (): void => {
  const team = getTeam();
  if (!team) {
    const defaultTeam: Team = {
      id: 'team-1',
      name: 'Bowling Bad',
      league: '',
      players: [],
      debtTags: [
        { id: 'tag-1', name: 'Weekly Payment', defaultAmount: 1400 },
      ],
      features: {
        betTracker: true, // Enable for Bowling Bad team by default
      },
    };
    saveTeam(defaultTeam);
  } else {
    // Ensure existing teams have features object
    if (!team.features) {
      team.features = { betTracker: team.name === 'Bowling Bad' }; // Enable for Bowling Bad, disable for others
      saveTeam(team);
    }
  }
};
