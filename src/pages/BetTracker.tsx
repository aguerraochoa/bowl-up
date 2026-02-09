import { useState, useEffect } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { getPlayers } from '../utils/storage';
import { getBetTallies, incrementBetTally, decrementBetTally } from '../utils/storage';
import { t, getLanguage } from '../i18n';
import type { Player } from '../types';

export default function BetTracker() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tallies, setTallies] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (e: CustomEvent) => {
      setCurrentLang(e.detail);
    };
    
    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange as EventListener);
    };
  }, []);

  // Force re-render when language changes
  void currentLang;

  useEffect(() => {
    // Refresh players and tallies when component mounts or updates
    const loadData = async () => {
      setIsLoading(true);
      const [loadedPlayers, loadedTallies] = await Promise.all([
        getPlayers(),
        getBetTallies(),
      ]);
      setPlayers(loadedPlayers);
      setTallies(loadedTallies);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleIncrement = async (playerId: string) => {
    // Optimistically update UI
    const optimisticValue = (tallies[playerId] || 0) + 1;
    setTallies(prev => ({
      ...prev,
      [playerId]: optimisticValue,
    }));
    
    try {
      await incrementBetTally(playerId);
      // Don't reload on success - trust the optimistic update
      // The cache is invalidated, so next time we load it will be fresh
    } catch {
      // On error, revert to actual state from database
      const loadedTallies = await getBetTallies(true);
      setTallies(loadedTallies);
    }
  };

  const handleDecrement = async (playerId: string) => {
    const currentTally = tallies[playerId] || 0;
    if (currentTally === 0) return; // Already at 0, nothing to do
    
    // Optimistically update UI
    const optimisticValue = currentTally - 1;
    setTallies(prev => ({
      ...prev,
      [playerId]: optimisticValue,
    }));
    
    try {
      await decrementBetTally(playerId);
      // Don't reload on success - trust the optimistic update
      // The cache is invalidated, so next time we load it will be fresh
    } catch {
      // On error, revert to actual state from database
      const loadedTallies = await getBetTallies(true);
      setTallies(loadedTallies);
    }
  };

  const getTally = (playerId: string): number => {
    return tallies[playerId] || 0;
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-2 uppercase">{t('betTracker.title')}</h1>
          <p className="text-sm sm:text-base text-black font-bold">{t('betTracker.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
            <p className="text-black font-bold text-base">{t('betTracker.loading')}</p>
          </div>
        ) : players.length === 0 ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center">
            <p className="text-black font-bold text-lg">{t('betTracker.noPlayers')}</p>
            <p className="text-sm text-black font-bold mt-2">{t('betTracker.addPlayersFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {players.map(player => {
              const tally = getTally(player.id);
              return (
                <div
                  key={player.id}
                  className="bg-white rounded-none border-4 border-black p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-black text-black truncate">{player.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDecrement(player.id)}
                        disabled={tally === 0}
                        className="bg-red-600 border-4 border-black text-black p-2 sm:p-3 rounded-none font-black hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        aria-label={`Decrease tally for ${player.name}`}
                      >
                        <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                      <span className="text-2xl sm:text-3xl font-black text-black min-w-[40px] sm:min-w-[50px] text-center">
                        {tally}
                      </span>
                      <button
                        onClick={() => handleIncrement(player.id)}
                        className="bg-lime-500 border-4 border-black text-black p-2 sm:p-3 rounded-none font-black hover:bg-lime-600 transition-all"
                        aria-label={`Increase tally for ${player.name}`}
                      >
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
