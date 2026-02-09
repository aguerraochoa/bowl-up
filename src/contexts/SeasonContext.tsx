import { useState, useEffect, type ReactNode } from 'react';
import { getCurrentSeason, getAvailableSeasons } from '../utils/storage';
import { SeasonContext } from './seasonContextValue';

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [currentSeason, setCurrentSeason] = useState<string>('Season 1');
  const [selectedSeason, setSelectedSeasonState] = useState<string | 'ALL' | null>(() => {
    const saved = localStorage.getItem('selectedSeason');
    if (saved === 'ALL') return 'ALL';
    if (saved) return saved;
    return null;
  }); // null = current season, string = specific season, 'ALL' = all seasons
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
    let isMounted = true;

    const initSeasons = async () => {
      try {
        const [season, seasons] = await Promise.all([
          getCurrentSeason(),
          getAvailableSeasons(),
        ]);

        if (!isMounted) return;
        setCurrentSeason(season);
        setAvailableSeasons(seasons);
      } catch (error) {
        console.error('Error refreshing seasons:', error);
      }
    };

    void initSeasons();

    return () => {
      isMounted = false;
    };
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
