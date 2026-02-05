import { useState, useEffect } from 'react';
import { getPlayers, addGame, getGames, removeGame, removeGamesBySession } from '../utils/storage';
import { validateGame, validateTenthFrame } from '../utils/scoring';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/SeasonContext';
import type { Player, Game } from '../types';
import { Check, X, ArrowRight, ArrowLeft, Loader2, Trash2, Clock, Eraser, ChevronDown, ChevronUp } from 'lucide-react';

export default function AddGame() {
  const { currentSeason } = useSeason();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]); // Array of player IDs in order
  const [currentStep, setCurrentStep] = useState(0); // 0 = select players, 1 = enter scores, 2 = review
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameData, setGameData] = useState<Partial<Game>[]>([]);
  const [currentGame, setCurrentGame] = useState<Partial<Game>>({
    totalScore: undefined,
    strikesFrames1to9: 0,
    sparesFrames1to9: 0,
    tenthFrame: '',
  });
  const [error, setError] = useState<string>('');
  const [tenthFrameError, setTenthFrameError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
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
    const loadData = async () => {
      setIsLoadingPlayers(true);
      setIsLoadingGames(true);
      
      // Load players and games in parallel
      const [players, loadedGames] = await Promise.all([
        getPlayers(),
        getGames(),
      ]);
      
      // Filter out deleted players (only show active players for adding games)
      setAllPlayers(players.filter(p => !p.deletedAt));
      setGames(loadedGames);
      setIsLoadingPlayers(false);
      setIsLoadingGames(false);
    };
    loadData();
  }, []);

  const handleAddPlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      // Unselect the player
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
      setError('');
      return;
    }
    if (selectedPlayers.length >= 4) {
      setError(t('addGame.maxPlayers'));
      return;
    }
    setSelectedPlayers(prev => [...prev, playerId]);
    setError('');
  };

  const handleClearSelection = () => {
    setSelectedPlayers([]);
    setError('');
  };

  const handleStartGame = () => {
    if (selectedPlayers.length === 0) {
      setError(t('addGame.selectAtLeastOne'));
      return;
    }
    setGameData(selectedPlayers.map(() => ({})));
    setCurrentStep(1);
    setCurrentPlayerIndex(0);
    setError('');
  };

  const getSelectedPlayersList = (): Player[] => {
    return selectedPlayers
      .map(playerId => allPlayers.find(p => p.id === playerId))
      .filter((p): p is Player => p !== undefined);
  };

  const handleNumberInput = (field: 'totalScore' | 'strikesFrames1to9' | 'sparesFrames1to9', value: number) => {
    setCurrentGame(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleTenthFrameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setCurrentGame(prev => ({
      ...prev,
      tenthFrame: upperValue,
    }));
    
    // Real-time validation of 10th frame
    if (upperValue.trim() === '') {
      setTenthFrameError('');
      setError('');
    } else {
      const validation = validateTenthFrame(upperValue);
      if (!validation.valid) {
        setTenthFrameError(validation.error || t('addGame.tenthFrameInvalid'));
      } else {
        setTenthFrameError('');
      }
      setError(''); // Clear general error when typing
    }
  };

  const handleNext = () => {
    const playersList = getSelectedPlayersList();
    
    // Validate 10th frame first
    if (currentGame.tenthFrame) {
      const tenthFrameValidation = validateTenthFrame(currentGame.tenthFrame);
      if (!tenthFrameValidation.valid) {
        setTenthFrameError(tenthFrameValidation.error || 'Invalid 10th frame');
        setError(tenthFrameValidation.error || t('addGame.tenthFrameInvalid'));
        return;
      }
    }
    
    // Validate current game
    const validation = validateGame({
      ...currentGame,
      playerId: playersList[currentPlayerIndex]?.id || '',
      date: new Date().toISOString().split('T')[0],
    });

    if (!validation.valid) {
      setError(validation.error || 'Invalid game data');
      if (validation.error?.includes('10th frame')) {
        setTenthFrameError(validation.error);
      }
      return;
    }

    // Save current game data
    const updatedGameData = [...gameData];
    updatedGameData[currentPlayerIndex] = currentGame;
    setGameData(updatedGameData);

    // Move to next player or finish
    if (currentPlayerIndex < playersList.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setCurrentGame({
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      });
      setError('');
      setTenthFrameError('');
      // Scroll to top when moving to next player (after state update)
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    } else {
      // All players done, show review
      setCurrentStep(2);
      // Scroll to top when moving to review
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };
  
  // Check if current game is valid and complete
  const isCurrentGameValid = (): boolean => {
    if (!currentGame.totalScore || currentGame.totalScore <= 0) {
      return false;
    }
    if (!currentGame.tenthFrame || currentGame.tenthFrame.trim() === '') {
      return false;
    }
    const tenthFrameValidation = validateTenthFrame(currentGame.tenthFrame);
    if (!tenthFrameValidation.valid) {
      return false;
    }
    const fullValidation = validateGame({
      ...currentGame,
      playerId: getSelectedPlayersList()[currentPlayerIndex]?.id || '',
      date: new Date().toISOString().split('T')[0],
    });
    return fullValidation.valid;
  };
  
  // Check if all games are valid and complete for review
  const areAllGamesValid = (): boolean => {
    const playersList = getSelectedPlayersList();
    for (let i = 0; i < playersList.length; i++) {
      const game = i === currentPlayerIndex ? currentGame : gameData[i];
      if (!game || !game.totalScore || game.totalScore <= 0) {
        return false;
      }
      if (!game.tenthFrame || game.tenthFrame.trim() === '') {
        return false;
      }
      const tenthFrameValidation = validateTenthFrame(game.tenthFrame);
      if (!tenthFrameValidation.valid) {
        return false;
      }
      const fullValidation = validateGame({
        ...game,
        playerId: playersList[i]?.id || '',
        date: new Date().toISOString().split('T')[0],
      });
      if (!fullValidation.valid) {
        return false;
      }
    }
    return true;
  };

  const handleBack = () => {
    if (currentPlayerIndex > 0) {
      const prevIndex = currentPlayerIndex - 1;
      const prevGame = gameData[prevIndex] || {
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      };
      setCurrentPlayerIndex(prevIndex);
      setCurrentGame(prevGame);
      setError('');
      // Validate 10th frame when loading previous player's data
      if (prevGame.tenthFrame) {
        const validation = validateTenthFrame(prevGame.tenthFrame);
        if (!validation.valid) {
          setTenthFrameError(validation.error || t('addGame.tenthFrameInvalid'));
        } else {
          setTenthFrameError('');
        }
      } else {
        setTenthFrameError('');
      }
      // Scroll to top when going to previous player
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      setCurrentStep(1); // Go back from review to last player's score entry
      const lastIndex = getSelectedPlayersList().length - 1;
      const lastGame = gameData[lastIndex] || {
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      };
      setCurrentPlayerIndex(lastIndex);
      setCurrentGame(lastGame);
      setError('');
      // Validate 10th frame when loading last player's data
      if (lastGame.tenthFrame) {
        const validation = validateTenthFrame(lastGame.tenthFrame);
        if (!validation.valid) {
          setTenthFrameError(validation.error || t('addGame.tenthFrameInvalid'));
        } else {
          setTenthFrameError('');
        }
      } else {
        setTenthFrameError('');
      }
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple submissions
    
    setIsSaving(true);
    try {
      const playersList = getSelectedPlayersList();
      // Generate ONE session ID for this team game
      const gameSessionId = crypto.randomUUID();
      const date = new Date().toISOString().split('T')[0];
      
      for (let index = 0; index < gameData.length; index++) {
        const game = gameData[index];
        if (game.totalScore !== undefined && game.tenthFrame) {
          const newGame: Game = {
            id: crypto.randomUUID(),
            playerId: playersList[index].id,
            date,
            totalScore: game.totalScore!,
            strikesFrames1to9: game.strikesFrames1to9 || 0,
            sparesFrames1to9: game.sparesFrames1to9 || 0,
            tenthFrame: game.tenthFrame,
            gameSessionId: gameSessionId, // Same session ID for all players in this game
            season: currentSeason, // Assign to current season
          };
          await addGame(newGame);
        }
      }

      // Reset
      setCurrentStep(0);
      setSelectedPlayers([]);
      setCurrentPlayerIndex(0);
      setGameData([]);
      setCurrentGame({
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      });
      alert(t('common.success'));
      // Reload games to show the new ones
      const loadedGames = await getGames();
      setGames(loadedGames);
    } catch (error) {
      console.error('Error saving games:', error);
      alert('Error saving games. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this team game? This will delete all player games in this session. This action cannot be undone.')) {
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      await removeGamesBySession(sessionId);
      // Reload games after deletion
      const loadedGames = await getGames();
      setGames(loadedGames);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting team game. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }

    setDeletingSessionId(gameId);
    try {
      await removeGame(gameId);
      // Reload games after deletion
      const loadedGames = await getGames();
      setGames(loadedGames);
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Error deleting game. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleCloseHistory = () => {
    setIsClosingHistory(true);
    setTimeout(() => {
      setShowHistory(false);
      setIsClosingHistory(false);
    }, 300);
  };

  const selectedPlayersList = getSelectedPlayersList();
  const currentPlayer = selectedPlayersList[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex === selectedPlayersList.length - 1;


  // Show loading state first
  if (isLoadingPlayers) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top flex items-center justify-center px-4 relative">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
            <p className="text-black font-bold text-base">{t('addGame.loadingPlayers')}</p>
          </div>
      </div>
    );
  }

  // Then check if players are empty
  if (allPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top flex items-center justify-center px-4 relative">
        <div className="text-center">
          <p className="text-black mb-4 font-bold">{t('addGame.noPlayers')}</p>
          <p className="text-sm text-black font-bold">{t('addGame.addPlayersFirst')}</p>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-2 uppercase">{t('addGame.title')}</h1>
              <p className="text-sm sm:text-base text-black font-bold">{t('addGame.selectPlayers')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsClosingHistory(false);
                  setShowHistory(true);
                }}
                className="border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none font-black flex items-center gap-2 text-sm sm:text-base bg-amber-400 hover:bg-amber-500"
              >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t('addGame.history')}</span>
              </button>
              <button
                onClick={handleClearSelection}
                disabled={selectedPlayers.length === 0}
                className="bg-amber-400 border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none font-black flex items-center gap-2 text-sm sm:text-base disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t('addGame.clear')}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          {/* Player Selection Grid */}
          <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
            <h2 className="text-lg sm:text-xl font-black mb-4 uppercase">{t('addGame.selectPlayers')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {allPlayers.map(player => {
                const isSelected = selectedPlayers.includes(player.id);
                const position = isSelected ? selectedPlayers.indexOf(player.id) + 1 : null;
                const positionColors = [
                  'bg-orange-500',
                  'bg-amber-500',
                  'bg-lime-500',
                  'bg-orange-600',
                ];
                const selectedColor = position ? positionColors[position - 1] : '';
                return (
                  <button
                    key={player.id}
                    onClick={() => handleAddPlayer(player.id)}
                    disabled={!isSelected && selectedPlayers.length >= 4}
                    className={`p-4 rounded-none border-4 border-black font-black text-base sm:text-lg transition-all  min-h-[80px] sm:min-h-[90px] ${
                      isSelected
                        ? `${selectedColor} text-black cursor-pointer`
                        : selectedPlayers.length >= 4
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-amber-400 text-black hover:bg-amber-500'
                    }`}
                  >
                    <div className="flex items-center justify-between h-full">
                      <span className="flex-1 text-left">{player.name}</span>
                      <span className={`text-2xl sm:text-3xl font-black w-8 sm:w-10 text-right ${position ? '' : 'invisible'}`}>
                        {position || '0'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game History Modal */}
          {showHistory && (
            <div 
              className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCloseHistory();
                }
              }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-orange-50/90" />
              
              {/* Modal Content */}
              <div 
                className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-2xl sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                  isClosingHistory ? 'animate-slide-down' : 'animate-slide-up'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">
                    {t('addGame.history')}
                  </h2>
                  <button
                    onClick={handleCloseHistory}
                    className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                  {isLoadingGames ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-black mr-2" />
                      <p className="text-black font-bold text-base">Loading games...</p>
                    </div>
                  ) : games.length === 0 ? (
                    <p className="text-black font-bold text-sm sm:text-base">No games recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group games by session */}
                      {(() => {
                        const gamesBySession = new Map<string, Game[]>();
                        const gamesWithoutSession: Game[] = [];

                        games.forEach(game => {
                          if (game.gameSessionId) {
                            const sessionGames = gamesBySession.get(game.gameSessionId) || [];
                            sessionGames.push(game);
                            gamesBySession.set(game.gameSessionId, sessionGames);
                          } else {
                            gamesWithoutSession.push(game);
                          }
                        });

                        // Sort sessions by created_at (newest first) - use the most recent game's created_at in the session
                        const sessions = Array.from(gamesBySession.entries()).sort(([_, gamesA], [__, gamesB]) => {
                          // Get the most recent created_at from each session
                          const createdA = gamesA.reduce((latest, game) => {
                            const gameCreated = (game as any).created_at || '';
                            return gameCreated > latest ? gameCreated : latest;
                          }, '');
                          const createdB = gamesB.reduce((latest, game) => {
                            const gameCreated = (game as any).created_at || '';
                            return gameCreated > latest ? gameCreated : latest;
                          }, '');
                          return new Date(createdB).getTime() - new Date(createdA).getTime();
                        });
                        
                        // Sort individual games without session by created_at (newest first)
                        const sortedGamesWithoutSession = gamesWithoutSession.sort((a, b) => {
                          const createdA = (a as any).created_at || a.date;
                          const createdB = (b as any).created_at || b.date;
                          return new Date(createdB).getTime() - new Date(createdA).getTime();
                        });
                        
                        return (
                          <>
                            {/* Team games (with session) */}
                            {sessions.map(([sessionId, sessionGames]) => {
                              const totalSum = sessionGames.reduce((sum, g) => sum + g.totalScore, 0);
                              const date = sessionGames[0]?.date || '';
                              const isExpanded = expandedSessions.has(sessionId);
                              return (
                                <div key={sessionId} className="bg-amber-400 border-4 border-black p-3 sm:p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1 flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedSessions);
                                          if (isExpanded) {
                                            newExpanded.delete(sessionId);
                                          } else {
                                            newExpanded.add(sessionId);
                                          }
                                          setExpandedSessions(newExpanded);
                                        }}
                                        className="p-1 hover:bg-amber-500 transition-all"
                                        aria-label={isExpanded ? "Collapse" : "Expand"}
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="w-5 h-5 text-black" />
                                        ) : (
                                          <ChevronDown className="w-5 h-5 text-black" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <p className="font-black text-black text-sm sm:text-base">
                                          {new Date(date).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs sm:text-sm text-black font-bold">
                                          {t('dashboard.total')}: {totalSum} | {sessionGames.length} {t('dashboard.players')}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteSession(sessionId)}
                                      disabled={deletingSessionId === sessionId}
                                      className="bg-red-600 border-4 border-black text-white px-3 sm:px-4 py-2 hover:bg-red-700 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2"
                                      aria-label="Delete team game"
                                    >
                                      {deletingSessionId === sessionId ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          <span className="text-xs sm:text-sm">{t('addGame.deleting')}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="w-4 h-4" />
                                          <span className="text-xs sm:text-sm">{t('common.delete')}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {isExpanded && (
                                    <div className="space-y-2 mt-3">
                                      {sessionGames.map(game => {
                                        const player = allPlayers.find(p => p.id === game.playerId);
                                        return (
                                          <div key={game.id} className="bg-white border-2 border-black p-2">
                                            <p className="font-black text-black text-sm sm:text-base">{player?.name || 'Unknown'}</p>
                                            <p className="text-xs text-black font-bold">
                                              {t('addGame.score')}: {game.totalScore} | {t('addGame.strikes')}: {game.strikesFrames1to9} | {t('addGame.spares')}: {game.sparesFrames1to9}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Individual games (without session) */}
                            {sortedGamesWithoutSession.map(game => {
                              const player = allPlayers.find(p => p.id === game.playerId);
                              return (
                                <div key={game.id} className="flex items-center justify-between bg-white border-4 border-black p-3 sm:p-4">
                                  <div className="flex-1">
                                    <p className="font-black text-black text-sm sm:text-base">
                                      {player?.name || 'Unknown'} - {new Date(game.date).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs sm:text-sm text-black font-bold">
                                      {t('addGame.score')}: {game.totalScore} | {t('addGame.strikes')}: {game.strikesFrames1to9} | {t('addGame.spares')}: {game.sparesFrames1to9}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteGame(game.id)}
                                    disabled={deletingSessionId === game.id}
                                    className="bg-red-600 border-2 border-black text-white p-2 hover:bg-red-700 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                                    aria-label="Delete game"
                                  >
                                    {deletingSessionId === game.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleStartGame}
            disabled={selectedPlayers.length === 0}
            className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black flex items-center justify-center gap-2  disabled:bg-gray-300 disabled:cursor-not-allowed "
          >
            {t('addGame.startGame')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    // Review step
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-4 sm:mb-6 uppercase">{t('addGame.review')}</h1>
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {gameData.map((game, index) => {
              const player = selectedPlayersList[index];
              return (
                <div key={index} className="bg-white rounded-none border-4 border-black p-4 sm:p-5 ">
                  <h3 className="font-black text-base sm:text-lg mb-3 text-black truncate">{player.name}</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-black font-bold">{t('addGame.score')}:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.totalScore}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">{t('addGame.strikes')}:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.strikesFrames1to9}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">{t('addGame.spares')}:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.sparesFrames1to9}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">{t('addGame.tenthFrame')}:</span>
                      <span className="ml-2 font-black text-base sm:text-lg break-all">{game.tenthFrame}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 bg-amber-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('addGame.previous')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !areAllGamesValid()}
              className="flex-1 bg-lime-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2 text-sm sm:text-base disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  {t('addGame.saving')}
                </>
              ) : (
                <>
                  {t('addGame.save')}
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-100 pb-20 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('addGame.title')}</h1>
            <span className="text-xs sm:text-sm text-black font-black">
              {t('addGame.player')} {currentPlayerIndex + 1} {t('common.of')} {selectedPlayersList.length}
            </span>
          </div>
          <div className="w-full bg-white border-4 border-black h-3 sm:h-4">
            <div
              className="bg-orange-500 h-full transition-all"
              style={{ width: `${((currentPlayerIndex + 1) / selectedPlayersList.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Player */}
        <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-4 sm:mb-6 text-black uppercase break-words">{currentPlayer?.name}</h2>

          {/* Total Score */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              {t('addGame.totalScore')}
            </label>
            
            {/* Score Display - Always visible */}
            <div className="mb-4 flex items-center justify-center relative">
              <div className="inline-block px-4 py-3 border-4 border-black bg-white min-w-[200px] text-center">
                <span className="text-4xl sm:text-5xl font-black text-black">
                  {currentGame.totalScore !== undefined ? currentGame.totalScore : '---'}
                </span>
              </div>
              {currentGame.totalScore !== undefined && currentGame.totalScore > 0 && (
                <button
                  onClick={() => handleNumberInput('totalScore', 0)}
                  className="absolute bg-red-600 border-4 border-black px-3 py-2 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Phone Number Style Number Pad */}
            <div className="space-y-2">
              {/* Row 1: 1, 2, 3 */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 2: 4, 5, 6 */}
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 3: 7, 8, 9 */}
              <div className="grid grid-cols-3 gap-2">
                {[7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 4: 0 (centered) */}
              <div className="grid grid-cols-3 gap-2">
                <div></div>
                <button
                  onClick={() => {
                    const current = currentGame.totalScore?.toString() || '';
                    const newValue = current.length < 3 ? current + '0' : '0';
                    handleNumberInput('totalScore', parseInt(newValue) || 0);
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                >
                  0
                </button>
                <div></div>
              </div>
            </div>
          </div>

          {/* Strikes */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              {t('addGame.strikes')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput('strikesFrames1to9', num)}
                  className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${
                    currentGame.strikesFrames1to9 === num
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 hover:bg-amber-500 text-black'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Spares */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              {t('addGame.spares')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput('sparesFrames1to9', num)}
                  className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${
                    currentGame.sparesFrames1to9 === num
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 hover:bg-amber-500 text-black'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 10th Frame */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              {t('addGame.tenthFrame')}
            </label>
            
            {/* Current Notation Display */}
            <div className="mb-4 flex items-center justify-center relative">
              <div className={`inline-block px-4 py-3 border-4 min-w-[200px] text-center ${
                tenthFrameError ? 'border-red-600 bg-red-100' : 'border-black bg-white'
              }`}>
                <span className="text-2xl sm:text-3xl font-mono font-black text-black">
                  {currentGame.tenthFrame || '---'}
                </span>
              </div>
              {currentGame.tenthFrame && currentGame.tenthFrame.length > 0 && (
                <button
                  onClick={() => handleTenthFrameChange('')}
                  className="absolute bg-red-600 border-4 border-black px-3 py-2 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
            
            {/* Error message for 10th frame */}
            {tenthFrameError && (
              <div className="mb-4 p-3 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
                {tenthFrameError}
              </div>
            )}

            {/* Notation Pad */}
            <div className="space-y-2">
              {/* Row 1: 1, 2, 3 */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 2: 4, 5, 6 */}
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 3: 7, 8, 9 */}
              <div className="grid grid-cols-3 gap-2">
                {[7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 4: /, -, X */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + '/');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  /
                </button>
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + '-');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  -
                </button>
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + 'X');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  X
                </button>
              </div>
            </div>
            
            <p className="text-xs text-black mt-3 text-center font-bold">
              {t('addGame.examples')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 sm:gap-3">
            {currentPlayerIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 bg-amber-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('addGame.previous')}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isCurrentGameValid()}
              className="flex-1 bg-orange-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2 text-sm sm:text-base disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLastPlayer ? t('addGame.review') : t('addGame.next')}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
