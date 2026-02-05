import { useState, useEffect } from 'react';
import { getPlayers, addPlayer, removePlayer, getGames, reactivatePlayer } from '../utils/storage';
import { cache } from '../utils/cache';
import { calculatePlayerStatsFromData } from '../utils/stats';
import { supabase } from '../lib/supabase';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/SeasonContext';
import type { Player, Stats } from '../types';
import { Plus, X, TrendingUp, TrendingDown, Target, Pencil, Check, Loader2, RotateCcw } from 'lucide-react';

export default function Players() {
  const { querySeason, isViewingAllSeasons, isViewingPastSeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersStats, setPlayersStats] = useState<Record<string, Stats>>({});
  const [allGames, setAllGames] = useState<any[]>([]); // Store games to avoid refetching
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<Stats | null>(null);
  const [isClosingStats, setIsClosingStats] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [isClosingAddPlayer, setIsClosingAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [isClosingReactivateModal, setIsClosingReactivateModal] = useState(false);
  const [inactivePlayers, setInactivePlayers] = useState<Player[]>([]);
  const [isLoadingInactive, setIsLoadingInactive] = useState(false);

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
    const loadPlayers = async () => {
      setIsLoading(true);
      
      // Fetch all data in parallel - filter games by season
      const [loadedPlayers, loadedGames] = await Promise.all([
        getPlayers(),
        getGames(false, querySeason),
      ]);
      
      // Filter players based on season view:
      // - Current season: Show ALL active players (even if they haven't played yet)
      // - Past season: Show only players who played in that season
      // - All seasons: Show all players who ever played
      let filteredPlayers: Player[];
      if (isViewingAllSeasons) {
        // All seasons: show all players who ever played
        const playerIdsInAllSeasons = new Set(loadedGames.map(g => g.playerId).filter(id => id !== null));
        filteredPlayers = loadedPlayers.filter(p => playerIdsInAllSeasons.has(p.id));
      } else if (isViewingPastSeason) {
        // Past season: show only players who played in that season
        const playerIdsInSeason = new Set(loadedGames.map(g => g.playerId).filter(id => id !== null));
        filteredPlayers = loadedPlayers.filter(p => playerIdsInSeason.has(p.id));
      } else {
        // Current season: show ALL active players (even if they haven't played yet)
        // Inactive players are shown in the reactivate modal
        filteredPlayers = loadedPlayers.filter(p => !p.deletedAt);
      }
      
      setPlayers(filteredPlayers);
      setAllGames(loadedGames); // Store games for later use
      
      // Calculate stats for filtered players in parallel using the fetched games data
      const statsMap: Record<string, Stats> = {};
      filteredPlayers.forEach(player => {
        statsMap[player.id] = calculatePlayerStatsFromData(player.id, loadedGames);
      });
      
      setPlayersStats(statsMap);
      setIsLoading(false);
    };
    loadPlayers();
  }, [querySeason, isViewingAllSeasons]); // Reload when season changes

  useEffect(() => {
    if (selectedPlayer && allGames.length >= 0) {
      // Use already-loaded games data instead of fetching again
      const stats = calculatePlayerStatsFromData(selectedPlayer.id, allGames);
      setPlayerStats(stats);
      setIsClosingStats(false);
    }
  }, [selectedPlayer, allGames]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if ((selectedPlayer && playerStats && !isClosingStats) || (showAddPlayer && !isClosingAddPlayer) || (showReactivateModal && !isClosingReactivateModal)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPlayer, playerStats, isClosingStats, showAddPlayer, isClosingAddPlayer, showReactivateModal, isClosingReactivateModal]);

  const handleAddPlayer = async () => {
    if (isAddingPlayer || !newPlayerName.trim()) return; // Prevent multiple submissions
    
    setIsAddingPlayer(true);
    try {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: newPlayerName.trim(),
        teamId: '', // Will be set by Supabase
      };
      await addPlayer(newPlayer);
      
      // Reload players and games in parallel, then recalculate stats
      const [loadedPlayers, loadedGames] = await Promise.all([
        getPlayers(),
        getGames(false, querySeason),
      ]);
      
      setPlayers(loadedPlayers);
      setAllGames(loadedGames); // Update stored games
      
      // Recalculate stats for all players (new player will have default stats)
      const statsMap: Record<string, Stats> = {};
      loadedPlayers.forEach(player => {
        statsMap[player.id] = calculatePlayerStatsFromData(player.id, loadedGames);
      });
      setPlayersStats(statsMap);
      
      setNewPlayerName('');
      setIsClosingAddPlayer(true);
      setTimeout(() => {
        setShowAddPlayer(false);
        setIsClosingAddPlayer(false);
      }, 300);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error adding player. Please try again.');
    } finally {
      setIsAddingPlayer(false);
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

  const handleCloseReactivateModal = () => {
    setIsClosingReactivateModal(true);
    setTimeout(() => {
      setShowReactivateModal(false);
      setIsClosingReactivateModal(false);
    }, 300);
  };

  const handleRemovePlayer = async (playerId: string) => {
    const confirmMessage = `${t('players.confirmDelete')}\n\n${t('players.deleteWarning')}`;
    if (confirm(confirmMessage)) {
      try {
        await removePlayer(playerId);
        
        // Reload players and games in parallel, then recalculate stats
        const [loadedPlayers, loadedGames] = await Promise.all([
          getPlayers(),
          getGames(),
        ]);
        
        setPlayers(loadedPlayers);
        setAllGames(loadedGames); // Update stored games
        
        // Recalculate stats for all players
        const statsMap: Record<string, Stats> = {};
        loadedPlayers.forEach(player => {
          statsMap[player.id] = calculatePlayerStatsFromData(player.id, loadedGames);
        });
        setPlayersStats(statsMap);
        
        if (selectedPlayer?.id === playerId) {
          setSelectedPlayer(null);
          setPlayerStats(null);
        }
      } catch (error: any) {
        if (error.message === 'PLAYER_HAS_DEBTS') {
          alert(t('players.cannotDeleteHasDebts'));
        } else if (error.message === 'PLAYER_HAS_BET_TALLY') {
          alert(t('players.cannotDeleteHasBetTally'));
        } else {
          alert(t('players.errorRemoving'));
        }
      }
    }
  };

  const handleReactivatePlayer = async (playerId: string) => {
    try {
      await reactivatePlayer(playerId);
      
      // Reload players and games
      const [loadedPlayers, loadedGames] = await Promise.all([
        getPlayers(),
        getGames(false, querySeason),
      ]);
      
      // Filter players based on season view (same logic as loadPlayers)
      let filteredPlayers: Player[];
      if (isViewingAllSeasons) {
        const playerIdsInAllSeasons = new Set(loadedGames.map(g => g.playerId).filter(id => id !== null));
        filteredPlayers = loadedPlayers.filter(p => playerIdsInAllSeasons.has(p.id));
      } else if (isViewingPastSeason) {
        const playerIdsInSeason = new Set(loadedGames.map(g => g.playerId).filter(id => id !== null));
        filteredPlayers = loadedPlayers.filter(p => playerIdsInSeason.has(p.id));
      } else {
        // Current season: show ALL active players (even if they haven't played yet)
        filteredPlayers = loadedPlayers.filter(p => !p.deletedAt);
      }
      
      setPlayers(filteredPlayers);
      setAllGames(loadedGames);
      
      // Recalculate stats
      const statsMap: Record<string, Stats> = {};
      filteredPlayers.forEach(player => {
        statsMap[player.id] = calculatePlayerStatsFromData(player.id, loadedGames);
      });
      setPlayersStats(statsMap);
    } catch (error) {
      console.error('Error reactivating player:', error);
      alert(t('players.errorReactivating'));
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  };

  const handleSaveEdit = async (playerId: string) => {
    if (savingPlayerId || !editingPlayerName.trim()) return; // Prevent multiple submissions
    
    setSavingPlayerId(playerId);
    try {
      // Update player in Supabase
      const { error } = await supabase
        .from('players')
        .update({ name: editingPlayerName.trim() })
        .eq('id', playerId);

      if (!error) {
        // Invalidate cache
        cache.invalidate('players');
        
        // Optimistically update the player name in the list (no need to reload stats)
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, name: editingPlayerName.trim() } : p
        ));
        
        // Update selected player if it's the one being edited
        if (selectedPlayer?.id === playerId) {
          setSelectedPlayer({ ...selectedPlayer, name: editingPlayerName.trim() });
        }
        
        setEditingPlayerId(null);
        setEditingPlayerName('');
      } else {
        alert(t('players.errorUpdating'));
      }
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player. Please try again.');
    } finally {
      setSavingPlayerId(null);
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
    <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('players.title')}</h1>
            <p className="text-sm sm:text-base text-black font-bold">{t('players.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {!isViewingPastSeason && !isViewingAllSeasons && (
              <>
                {!isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="bg-amber-400 border-4 border-black text-black px-3 sm:px-3 md:px-2 py-2 sm:py-2 md:py-1.5 rounded-none hover:bg-amber-500  flex items-center justify-center gap-2 font-black text-sm sm:text-sm md:text-xs"
                    aria-label="Edit players"
                  >
                    <Pencil className="w-4 h-4 sm:w-4 md:w-3.5" />
                    <span className="hidden sm:inline">{t('players.edit')}</span>
                  </button>
                )}
                {isEditMode && (
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingPlayerId(null);
                      setEditingPlayerName('');
                    }}
                    className="bg-white border-4 border-black text-black px-3 sm:px-3 md:px-2 py-2 sm:py-2 md:py-1.5 rounded-none hover:bg-gray-100  flex items-center justify-center gap-2 font-black text-sm sm:text-sm md:text-xs"
                    aria-label="Cancel edit"
                  >
                    {t('players.done')}
                  </button>
                )}
                <button
                  onClick={async () => {
                    setShowReactivateModal(true);
                    // Load inactive players
                    setIsLoadingInactive(true);
                    try {
                      const allPlayers = await getPlayers(true);
                      const inactive = allPlayers.filter(p => p.deletedAt);
                      setInactivePlayers(inactive);
                    } catch (error) {
                      console.error('Error loading inactive players:', error);
                    } finally {
                      setIsLoadingInactive(false);
                    }
                  }}
                  className="bg-lime-500 border-4 border-black text-black px-3 sm:px-3 md:px-2 py-2 sm:py-2 md:py-1.5 rounded-none hover:bg-lime-600 flex items-center justify-center gap-2 font-black text-sm sm:text-sm md:text-xs"
                  aria-label="Reactivate players"
                >
                  <RotateCcw className="w-4 h-4 sm:w-4 md:w-3.5" />
                  <span className="hidden sm:inline">{t('players.reactivate')}</span>
                </button>
                <button
                  onClick={() => {
                    setIsClosingAddPlayer(false);
                    setShowAddPlayer(true);
                  }}
                  className="bg-orange-500 border-4 border-black text-black px-3 sm:px-3 md:px-2 py-2 sm:py-2 md:py-1.5 rounded-none hover:bg-orange-600  flex items-center justify-center gap-2 font-black text-sm sm:text-sm md:text-xs"
                  aria-label="Add player"
                >
                  <Plus className="w-4 h-4 sm:w-4 md:w-3.5" />
                  <span className="hidden sm:inline">{t('players.addPlayer')}</span>
                  <span className="sm:hidden">{t('players.add')}</span>
                </button>
              </>
            )}
            {(isViewingPastSeason || isViewingAllSeasons) && (
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-yellow-300 border-4 border-black text-black font-black text-sm sm:text-base">
                {t('profile.readOnly')}
              </div>
            )}
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
                  {t('players.addPlayer')}
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
                  <label className="block text-xs sm:text-sm font-black text-black mb-2 uppercase">{t('players.enterName')}</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder={t('players.enterName')}
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
                    disabled={isAddingPlayer}
                    className="flex-1 bg-lime-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-sm sm:text-base flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAddingPlayer ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      t('players.add')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reactivate Player Modal */}
        {showReactivateModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseReactivateModal();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingReactivateModal ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-lime-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  {t('players.inactivePlayers')}
                </h2>
                <button
                  onClick={handleCloseReactivateModal}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                {isLoadingInactive ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  </div>
                ) : inactivePlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-black font-bold">{t('players.noInactivePlayers')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inactivePlayers.map((player) => (
                      <div
                        key={player.id}
                        className="bg-white rounded-none border-4 border-black p-4 flex items-center justify-between"
                      >
                        <span className="font-black text-black text-base sm:text-lg">{player.name}</span>
                        <button
                          onClick={async () => {
                            await handleReactivatePlayer(player.id);
                            // Remove from inactive list
                            setInactivePlayers(prev => prev.filter(p => p.id !== player.id));
                            // Close modal if no more inactive players
                            if (inactivePlayers.length === 1) {
                              handleCloseReactivateModal();
                            }
                          }}
                          className="bg-lime-500 border-4 border-black text-black px-4 py-2 rounded-none hover:bg-lime-600 font-black text-sm sm:text-base flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {t('players.reactivate')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
            <p className="text-black font-bold text-base">{t('players.loading')}</p>
          </div>
        ) : players.length === 0 ? (
          <div className="bg-white rounded-none border-4 border-black p-12 text-center ">
            <p className="text-black mb-2 font-bold">{t('players.noPlayers')}</p>
            <p className="text-sm text-black font-bold">{t('players.addFirst')}</p>
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
                averageTenthFrame: 0,
                gamesAbove200: 0,
                gamesAbove200Percentage: 0,
              };
              const isEditing = editingPlayerId === player.id;
              
              return (
                <div
                  key={player.id}
                  className={`bg-white rounded-none border-4 border-black p-4 sm:p-5  ${
                    !isEditMode && !isViewingPastSeason && !isViewingAllSeasons ? 'hover:bg-amber-400 transition-all cursor-pointer' : ''
                  }`}
                  onClick={() => !isEditMode && !isViewingPastSeason && !isViewingAllSeasons && setSelectedPlayer(player)}
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
                            disabled={savingPlayerId === player.id}
                            className="bg-lime-500 border-4 border-black text-black px-3 py-2 hover:bg-lime-600 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {savingPlayerId === player.id ? (
                              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
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
                                {stats.gamesPlayed} {t('players.gamesPlayed')}
                              </span>
                              <span className="bg-amber-400 border-2 border-black px-2 py-1 text-xs text-black font-black inline-block text-center flex-1">
                                {t('players.averageShort')}: {stats.averageScore.toFixed(1)}
                              </span>
                              <span className="bg-lime-500 border-2 border-black px-2 py-1 text-xs text-black font-black inline-block text-center flex-1">
                                {t('players.strike')}: {stats.strikePercentage.toFixed(1)}%
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
                  <p className="text-sm sm:text-base text-black font-bold">{t('players.personalStats')}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-orange-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('players.totalGames')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.gamesPlayed}</p>
                  </div>
                  <div className="bg-amber-400 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('players.averageScore')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.averageScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-lime-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('players.strikePercentage')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.strikePercentage.toFixed(1)}%</p>
                  </div>
                  <div className="bg-orange-600 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('players.sparePercentage')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.sparePercentage.toFixed(1)}%</p>
                  </div>
                  <div className="bg-purple-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('dashboard.avgTenthFrame')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.averageTenthFrame.toFixed(1)}</p>
                  </div>
                  <div className="bg-blue-500 border-4 border-black rounded-none p-3 sm:p-5 ">
                    <p className="text-xs font-black text-black mb-1 uppercase">{t('players.gamesAbove200')}</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-black">{playerStats.gamesAbove200}</p>
                    <p className="text-xs sm:text-sm font-black text-black mt-1">{playerStats.gamesAbove200Percentage.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Range Stats */}
                <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
                  <h2 className="text-lg sm:text-xl font-black text-black mb-4 uppercase">{t('players.scoreRange')}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">{t('players.floor')}</p>
                      <p className="text-2xl sm:text-3xl font-black text-black">{playerStats.floor}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">{t('players.ceiling')}</p>
                      <p className="text-2xl sm:text-3xl font-black text-black">{playerStats.ceiling}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Average */}
                <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 ">
                  <h2 className="text-lg sm:text-xl font-black text-black mb-4 uppercase">{t('players.recentForm')}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-black mb-1 font-bold">{t('players.last10Average')}</p>
                      <p className="text-3xl sm:text-4xl font-black text-black">{playerStats.recentAverage.toFixed(1)}</p>
                    </div>
                    {playerStats.recentAverage > playerStats.averageScore ? (
                      <div className="flex items-center gap-2 bg-lime-500 border-4 border-black px-3 sm:px-4 py-2">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">{t('players.improving')}</span>
                      </div>
                    ) : playerStats.recentAverage < playerStats.averageScore ? (
                      <div className="flex items-center gap-2 bg-red-600 border-4 border-black px-3 sm:px-4 py-2">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">{t('players.declining')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-400 border-4 border-black px-3 sm:px-4 py-2">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        <span className="font-black text-black text-sm sm:text-base">{t('players.stable')}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-black mt-2 font-bold">
                    {t('players.overallAverage')}: {playerStats.averageScore.toFixed(1)}
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
