export interface Player {
  id: string;
  name: string;
  teamId: string;
  deletedAt?: string | null; // ISO timestamp when player was deleted (null if active)
}

export interface Game {
  id: string;
  playerId: string | null; // null when player is deleted (preserves team game history)
  date: string;
  totalScore: number;
  strikesFrames1to9: number;
  sparesFrames1to9: number;
  tenthFrame: string; // e.g., "X9/", "9/8", "72"
  gameSessionId?: string; // Links games from the same team game session
  season: string; // e.g., "Season 1", "Season 2"
}

export interface TeamSumGame {
  id: string;
  date: string;
  players: string[]; // player IDs
  totalSum: number;
}

export interface Debt {
  id: string;
  tag?: string; // Optional - if not provided, use customName
  customName?: string; // Custom expense name when no tag is used
  amount: number;
  paidBy: string; // player ID
  splitBetween: string[]; // player IDs
  splitMethod: 'equal' | 'games' | 'custom';
  gameCounts?: Record<string, number>; // playerId -> game count (for games split)
  customAmounts?: Record<string, number>; // playerId -> amount (for custom split)
  date: string;
}

export interface DebtTag {
  id: string;
  name: string;
  defaultAmount: number;
}

export interface League {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  league: string;
  leagueId?: string;
  currentSeason: string; // e.g., "Season 1", "Season 2"
  players: Player[];
  debtTags: DebtTag[];
}

export interface BetTallies {
  [playerId: string]: number; // playerId -> tally count
}

export interface Stats {
  gamesPlayed: number;
  averageScore: number;
  strikePercentage: number;
  sparePercentage: number;
  floor: number; // lowest score
  ceiling: number; // highest score
  recentAverage: number; // last 10 games
  averageTenthFrame: number; // average 10th frame score
}
