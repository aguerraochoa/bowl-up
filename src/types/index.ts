export interface Player {
  id: string;
  name: string;
  teamId: string;
}

export interface Game {
  id: string;
  playerId: string;
  date: string;
  totalScore: number;
  strikesFrames1to9: number;
  sparesFrames1to9: number;
  tenthFrame: string; // e.g., "X9/", "9/8", "72"
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
  players: Player[];
  debtTags: DebtTag[];
  features?: {
    betTracker?: boolean;
  };
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
}
