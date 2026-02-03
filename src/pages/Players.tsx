import { useState, useEffect } from 'react';
import { getPlayers, addPlayer, removePlayer } from '../utils/storage';
import { calculatePlayerStats } from '../utils/stats';
import { supabase } from '../lib/supabase';
import type { Player, Stats } from '../types';
import { Plus, X, TrendingUp, TrendingDown, Target, Pencil, Check } from 'lucide-react';

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersStats, setPlayersStats] = useState<Record<string, Stats>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<Stats | null>(null);
  const [isClosingStats, setIsClosingStats] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [isClosingAddPlayer, setIsClosingAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');

  useEffect(() => {
    const loadPlayers = async () => {
      const loadedPlayers = await getPlayers();
      setPlayers(loadedPlayers);
      setShowAddPlayer(loadedPlayers.length === 0);
      
      // Calculate stats for all players
      const statsMap: Record<string, Stats> = {};
      for (const player of loadedPlayers) {
        statsMap[player.id] = await calculatePlayerStats(player.id);
      }
      setPlayersStats(statsMap);
    };
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      const loadStats = async () => {
        const stats = await calculatePlayerStats(selectedPlayer.id);
        setPlayerStats(stats);
        setIsClosingStats(false);
      };
      loadStats();
    }
  }, [selectedPlayer]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if ((selectedPlayer && playerStats && !isClosingStats) || (showAddPlayer && !isClosingAddPlayer)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPlayer, playerStats, isClosingStats, showAddPlayer, isClosingAddPlayer]);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: newPlayerName.trim(),
        teamId: '', // Will be set by Supabase
      };
      await addPlayer(newPlayer);
      const loadedPlayers = await getPlayers();
      setPlayers(loadedPlayers);
      setNewPlayerName('');
      setIsClosingAddPlayer(true);
      setTimeout(() => {
        setShowAddPlayer(false);
        setIsClosingAddPlayer(false);
      }, 300);
    }
  };

  const handleCloseAddPlayer = () => {
    setIsClosingAddPlayer(true);
    setTimeout(() => {
      setShowAddPlayer(false);
      setNewPlayerName('');
      setIsClosingAddPlayer(false);
    }, 300);
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to remove this player?')) {
      await removePlayer(playerId);
      const loadedPlayers = await getPlayers();
      setPlayers(loadedPlayers);
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(null);
        setPlayerStats(null);
      }
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  };

  const handleSaveEdit = async (playerId: string) => {
    if (editingPlayerName.trim()) {
      // Update player in Supabase
      const { error } = await supabase
        .from('players')
        .update({ name: editingPlayerName.trim() })
        .eq('id', playerId);

      if (!error) {
        const loadedPlayers = await getPlayers();
        setPlayers(loadedPlayers);
        setEditingPlayerId(null);
        setEditingPlayerName('');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setEditingPlayerName('');
  };

  const handleCloseStats = () => {
    setIsClosingStats(true);
    setTimeout(() => {
      setSelectedPlayer(null);
      setPlayerStats(null);
      setIsClosingStats(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-20 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">Players</h1>
            <p className="text-sm sm:text-base text-black font-bold">Manage team members</p>
          </div>
          <div className="flex gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="bg-amber-400 border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none hover:bg-amber-500  flex items-center justify-center gap-2 font-black text-sm sm:text-base"
                aria-label="Edit players"
              >
                <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            {isEditMode && (
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditingPlayerId(null);
                  setEditingPlayerName('');
                }}
                className="bg-white border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none hover:bg-gray-100  flex items-center justify-center gap-2 font-black text-sm sm:text-base"
                aria-label="Cancel edit"
              >
                Done
              </button>
            )}
            <button
              onClick={() => {
                setIsClosingAddPlayer(false);
                setShowAddPlayer(true);
              }}
              className="bg-orange-500 border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none hover:bg-orange-600  flex items-center justify-center gap-2 font-black text-sm sm:text-base"
              aria-label="Add player"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Player</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Add Player Modal */}
        {showAddPlayer && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseAddPlayer();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingAddPlayer ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  Add New Player
                </h2>
                <button
                  onClick={handleCloseAddPlayer}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <div>
                  <label className="block text-xs sm:text-sm font-black text-black mb-2 uppercase">Player Name</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player name"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-sm sm:text-base"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Footer with buttons */}
              <div className="border-t-4 border-black px-4 sm:px-6 py-3 sm:py-4 bg-amber-400 flex-shrink-0">
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleCloseAddPlayer}
                    className="flex-1 bg-white border-4 border-black text-black py-3 sm:py-4 rounded-none font-black  text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPlayer}
                    className="flex-1 bg-lime-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black  text-sm sm:text-base"
                  >
                    Add Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {players.length === 0 ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center ">
            <p className="text-black mb-2 font-bold">No players added yet.</p>
            <p className="text-sm text-black font-bold">Click the + button to add your first player.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => {
              const stats = playersStats[player.id] || {
                gamesPlayed: 0,
                averageScore: 0,
                strikePercentage: 0,
                sparePercentage: 0,
                floor: 0,
                ceiling: 0,
                recentAverage: 0,
              };
              const isEditing = editingPlayerId === player.id;
              
              return (
                <div
                  key={player.id}
                  className={`bg-white rounded-none border-4 border-black p-4 sm:p-5  ${
                    !isEditMode ? 'hover:bg-amber-400 transition-all cursor-pointer' : ''
                  }`}
                  onClick={() => !isEditMode && setSelectedPlayer(player)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingPlayerName}
                            onChange={(e) => setEditingPlayerName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(player.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1 px-3 py-2 border-4 border-black font-black text-base sm:text-lg bg-white focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(player.id);
                            }}
                            className="bg-lime-500 border-4 border-black text-black px-3 py-2 hover:bg-lime-600 font-black"
                          >
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="bg-white border-4 border-black text-black px-3 py-2 hover:bg-gray-100 font-black"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg sm:text-xl font-black text-black mb-3 truncate">{player.name}</h3>
                          {!isEditMode && (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-orange-500 border-2 border-black px-2 py-1 text-xs text-black font-black inline-block text-center flex-1">
                                {stats.gamesPlayed} games
                              </span>
                              <span className="bg-amber-400 border-2 border-black px-2 py-1 text-xs text-black font-black inline-block text-center flex-1">
                                Avg: {stats.averageScore.toFixed(1)}
                              </span>
                              <span className="bg-lime-500 border-2 border-black px-2 py-1 text-xs text-black font-black inline-block text-center flex-1">
                                Strike: {stats.strikePercentage.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {isEditMode && !isEditing && (
                      <div className="flex items-center gap-2 ml-2 sm:ml-3 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPlayer(player);
                          }}
                          className="bg-orange-500 border-4 border-black text-black p-2 hover:bg-orange-600 font-black"
                          aria-label="Edit player"
                        >
                          <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePlayer(player.id);
                          }}
                          className="bg-red-600 border-4 border-black text-black p-2 hover:bg-red-700 font-black"
                          aria-label="Delete player"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Player Stats Modal */}
        {selectedPlayer && playerStats && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseStats();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-2xl sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingStats ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  {selectedPlayer.name}
                </h2>
                <button
                  onClick={handleCloseStats}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <div className="mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-black font-bold">Personal Statistics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-orange-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">Games Played</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.gamesPlayed}</p>
                  </div>
                  <div className="bg-amber-400 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">Average Score</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.averageScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-lime-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">Strike %</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.strikePercentage.toFixed(1)}%</p>
                  </div>
                  <div className="bg-orange-600 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">Spare %</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.sparePercentage.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Range Stats */}
                <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
                  <h2 className="text-lg sm:text-xl font-black text-black mb-4 uppercase">Score Range</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">Floor (Lowest)</p>
                      <p className="text-2xl sm:text-3xl font-black text-black">{playerStats.floor}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">Ceiling (Highest)</p>
                      <p className="text-2xl sm:text-3xl font-black text-black">{playerStats.ceiling}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Average */}
                <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 ">
                  <h2 className="text-lg sm:text-xl font-black text-black mb-4 uppercase">Recent Form</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">Last 10 Games Average</p>
                      <p className="text-3xl sm:text-4xl font-black text-black">{playerStats.recentAverage.toFixed(1)}</p>
                    </div>
                    {playerStats.recentAverage > playerStats.averageScore ? (
                      <div className="flex items-center gap-2 bg-lime-500 border-4 border-black px-3 sm:px-4 py-2">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">Improving</span>
                      </div>
                    ) : playerStats.recentAverage < playerStats.averageScore ? (
                      <div className="flex items-center gap-2 bg-red-600 border-4 border-black px-3 sm:px-4 py-2">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">Declining</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-400 border-4 border-black px-3 sm:px-4 py-2">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">Stable</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-black mt-2 font-bold">
                    Overall average: {playerStats.averageScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
