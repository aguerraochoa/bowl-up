import { createContext } from 'react';

export interface SeasonContextType {
  currentSeason: string;
  selectedSeason: string | 'ALL' | null; // null = current, string = specific season, 'ALL' = all seasons
  availableSeasons: string[];
  setSelectedSeason: (season: string | 'ALL' | null) => void;
  isViewingAllSeasons: boolean;
  isViewingPastSeason: boolean;
  querySeason: string | null | undefined; // null = all seasons, undefined = current, string = specific
  refreshSeasons: () => Promise<void>;
}

export const SeasonContext = createContext<SeasonContextType | undefined>(undefined);
