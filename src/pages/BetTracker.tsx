import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { getPlayers } from '../utils/storage';
import { getBetTallies, incrementBetTally, decrementBetTally } from '../utils/storage';
import type { Player } from '../types';

export default function BetTracker() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tallies, setTallies] = useState<Record<string, number>>({});

  useEffect(() => {
    // Refresh players and tallies when component mounts or updates
    const loadData = async () => {
      const [loadedPlayers, loadedTallies] = await Promise.all([
        getPlayers(),
        getBetTallies(),
      ]);
      setPlayers(loadedPlayers);
      setTallies(loadedTallies);
    };
    loadData();
  }, []);

  const handleIncrement = async (playerId: string) => {
    await incrementBetTally(playerId);
    const loadedTallies = await getBetTallies();
    setTallies(loadedTallies);
  };

  const handleDecrement = async (playerId: string) => {
    await decrementBetTally(playerId);
    const loadedTallies = await getBetTallies();
    setTallies(loadedTallies);
  };

  const getTally = (playerId: string): number => {
    return tallies[playerId] || 0;
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-20 md:pb-6 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-2 uppercase">Tracker</h1>
          <p className="text-sm sm:text-base text-black font-bold">Track 5-pin misses and strike penalties</p>
        </div>

        {players.length === 0 ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center">
            <p className="text-black font-bold text-lg">No players added yet.</p>
            <p className="text-sm text-black font-bold mt-2">Add players in the Players tab first.</p>
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
                      <p className="text-xs sm:text-sm text-black font-bold mt-1">
                        Current tally: <span className="font-black text-lg">{tally}</span>
                      </p>
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
