import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentSeason, getAvailableSeasons, getTeam } from '../utils/storage';

interface SeasonContextType {
  currentSeason: string;
  selectedSeason: string | 'ALL' | null; // null = current, string = specific season, 'ALL' = all seasons
  availableSeasons: string[];
  setSelectedSeason: (season: string | 'ALL' | null) => void;
  isViewingAllSeasons: boolean;
  isViewingPastSeason: boolean;
  querySeason: string | null | undefined; // null = all seasons, undefined = current, string = specific
  refreshSeasons: () => Promise<void>;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [currentSeason, setCurrentSeason] = useState<string>('Season 1');
  const [selectedSeason, setSelectedSeasonState] = useState<string | 'ALL' | null>(null); // null = current season, string = specific season, 'ALL' = all seasons
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['Season 1']);

  const refreshSeasons = async () => {
    try {
      const [season, seasons] = await Promise.all([
        getCurrentSeason(),
        getAvailableSeasons(),
      ]);
      setCurrentSeason(season);
      setAvailableSeasons(seasons);
    } catch (error) {
      console.error('Error refreshing seasons:', error);
    }
  };

  useEffect(() => {
    refreshSeasons();
  }, []);

  const setSelectedSeason = (season: string | 'ALL' | null) => {
    // Store in localStorage to persist across refreshes
    if (season === 'ALL') {
      localStorage.setItem('selectedSeason', 'ALL');
    } else if (season === null) {
      localStorage.removeItem('selectedSeason');
    } else {
      localStorage.setItem('selectedSeason', season);
    }
    setSelectedSeasonState(season);
  };

  // Load selected season from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedSeason');
    if (saved === 'ALL') {
      setSelectedSeasonState('ALL');
    } else if (saved) {
      setSelectedSeasonState(saved);
    } else {
      setSelectedSeasonState(null); // Default to current season
    }
  }, []);

  // Determine which season to use for queries
  // If selectedSeason is 'ALL', it means "All Seasons"
  // If selectedSeason is null, use current season (undefined)
  // If selectedSeason is a string, use that specific season
  const isViewingAllSeasons = selectedSeason === 'ALL';
  const isViewingPastSeason = selectedSeason !== null && selectedSeason !== 'ALL' && selectedSeason !== currentSeason;
  
  // The season to use for queries (null means all seasons, undefined means current)
  const querySeason = isViewingAllSeasons ? null : (selectedSeason || undefined);

  return (
    <SeasonContext.Provider
      value={{
        currentSeason,
        selectedSeason,
        availableSeasons,
        setSelectedSeason,
        isViewingAllSeasons,
        isViewingPastSeason,
        querySeason,
        refreshSeasons,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
}
