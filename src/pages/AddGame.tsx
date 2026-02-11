import { useState, useEffect } from 'react';
import { getPlayers, addGame } from '../utils/storage';
import { validateGame, validateTenthFrame } from '../utils/scoring';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/useSeason';
import type { Player, Game } from '../types';
import { Check, X, ArrowRight, ArrowLeft, Loader2, Eraser, Plus, Minus } from 'lucide-react';

const EMPTY_GAME: Partial<Game> = {
  totalScore: undefined,
  strikesFrames1to9: 0,
  sparesFrames1to9: 0,
  tenthFrame: '',
};

const LIVE_DRAFT_STORAGE_KEY = 'bowlup_live_add_game_draft_v1';

type LiveDraftState = {
  entryMode: 'live';
  selectedPlayers: string[];
  currentStep: number;
  currentPlayerIndex: number;
  liveGames: Partial<Game>[];
  gameData: Partial<Game>[];
  currentGame: Partial<Game>;
};

export default function AddGame() {
  const { currentSeason } = useSeason();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]); // Array of player IDs in order
  const [currentStep, setCurrentStep] = useState(0); // 0 = select players, 1 = classic entry, 2 = review, 3 = live entry
  const [entryMode, setEntryMode] = useState<'classic' | 'live'>('classic');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameData, setGameData] = useState<Partial<Game>[]>([]);
  const [liveGames, setLiveGames] = useState<Partial<Game>[]>([]);
  const [currentGame, setCurrentGame] = useState<Partial<Game>>(EMPTY_GAME);
  const [error, setError] = useState<string>('');
  const [tenthFrameError, setTenthFrameError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);

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

  const clearLiveDraftStorage = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LIVE_DRAFT_STORAGE_KEY);
  };

  const normalizeDraftGames = (gamesDraft: Partial<Game>[] | undefined, count: number): Partial<Game>[] => {
    return Array.from({ length: count }, (_, index) => ({
      ...EMPTY_GAME,
      ...(gamesDraft?.[index] || {}),
    }));
  };

  const resetDraftState = () => {
    clearLiveDraftStorage();
    setCurrentStep(0);
    setEntryMode('classic');
    setSelectedPlayers([]);
    setCurrentPlayerIndex(0);
    setGameData([]);
    setLiveGames([]);
    setCurrentGame(EMPTY_GAME);
    setError('');
    setTenthFrameError('');
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingPlayers(true);
      const players = await getPlayers();

      // Filter out deleted players (only show active players for adding games)
      const activePlayers = players.filter(p => !p.deletedAt);
      setAllPlayers(activePlayers);

      // Restore in-progress live draft after accidental refresh.
      try {
        if (typeof window !== 'undefined') {
          const rawDraft = window.localStorage.getItem(LIVE_DRAFT_STORAGE_KEY);
          if (rawDraft) {
            const parsed = JSON.parse(rawDraft) as LiveDraftState;
            if (parsed?.entryMode === 'live' && Array.isArray(parsed.selectedPlayers)) {
              const restoredSelectedPlayers = parsed.selectedPlayers
                .filter((playerId) => activePlayers.some((player) => player.id === playerId))
                .slice(0, 4);

              if (restoredSelectedPlayers.length > 0) {
                const restoredLiveGames = normalizeDraftGames(parsed.liveGames, restoredSelectedPlayers.length);
                const restoredGameData = normalizeDraftGames(parsed.gameData || parsed.liveGames, restoredSelectedPlayers.length);
                const restoredStep = [1, 2, 3].includes(parsed.currentStep) ? parsed.currentStep : 3;
                const restoredIndex = Math.min(
                  Math.max(parsed.currentPlayerIndex ?? 0, 0),
                  restoredSelectedPlayers.length - 1,
                );
                const restoredCurrentGame = {
                  ...EMPTY_GAME,
                  ...(parsed.currentGame || restoredGameData[restoredIndex] || {}),
                };

                setEntryMode('live');
                setSelectedPlayers(restoredSelectedPlayers);
                setLiveGames(restoredLiveGames);
                setGameData(restoredGameData);
                setCurrentPlayerIndex(restoredIndex);
                setCurrentStep(restoredStep);
                setCurrentGame(restoredCurrentGame);
                setError('');

                if (restoredCurrentGame.tenthFrame && restoredStep !== 3) {
                  const validation = validateTenthFrame(restoredCurrentGame.tenthFrame);
                  setTenthFrameError(validation.valid ? '' : (validation.error || t('addGame.tenthFrameInvalid')));
                } else {
                  setTenthFrameError('');
                }
              } else {
                clearLiveDraftStorage();
              }
            } else {
              clearLiveDraftStorage();
            }
          }
        }
      } catch {
        clearLiveDraftStorage();
      }

      setIsLoadingPlayers(false);
      setHasInitializedDraft(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasInitializedDraft) return;

    if (entryMode === 'live' && currentStep !== 0 && selectedPlayers.length > 0) {
      const draft: LiveDraftState = {
        entryMode: 'live',
        selectedPlayers,
        currentStep,
        currentPlayerIndex,
        liveGames,
        gameData,
        currentGame,
      };
      window.localStorage.setItem(LIVE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      return;
    }

    window.localStorage.removeItem(LIVE_DRAFT_STORAGE_KEY);
  }, [hasInitializedDraft, entryMode, currentStep, selectedPlayers, currentPlayerIndex, liveGames, gameData, currentGame]);

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
    resetDraftState();
  };

  const handleStartGame = (mode: 'classic' | 'live' = 'classic') => {
    if (selectedPlayers.length === 0) {
      setError(t('addGame.selectAtLeastOne'));
      return;
    }
    const emptyGames = selectedPlayers.map(() => ({ ...EMPTY_GAME }));
    setEntryMode(mode);
    setGameData(emptyGames);
    setLiveGames(emptyGames);
    setCurrentGame(EMPTY_GAME);
    setCurrentStep(mode === 'live' ? 3 : 1);
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

  const handleLiveCounterChange = (index: number, field: 'strikesFrames1to9' | 'sparesFrames1to9', delta: number) => {
    setLiveGames((prev) => {
      const next = [...prev];
      const existing = next[index] || { ...EMPTY_GAME };
      const strikes = existing.strikesFrames1to9 ?? 0;
      const spares = existing.sparesFrames1to9 ?? 0;

      if (field === 'strikesFrames1to9') {
        const maxStrikes = Math.max(0, 9 - spares);
        const nextStrikes = Math.max(0, Math.min(maxStrikes, strikes + delta));
        next[index] = {
          ...existing,
          strikesFrames1to9: nextStrikes,
        };
      } else {
        const maxSpares = Math.max(0, 9 - strikes);
        const nextSpares = Math.max(0, Math.min(maxSpares, spares + delta));
        next[index] = {
          ...existing,
          sparesFrames1to9: nextSpares,
        };
      }

      return next;
    });
    setError('');
  };

  const handleNext = () => {
    const playersList = getSelectedPlayersList();

    // Validate 10th frame first
    if (currentGame.tenthFrame) {
      // Special validation: If 10th frame starts with X (strike), require 3 characters total
      const normalized = currentGame.tenthFrame.toUpperCase().trim();
      if (normalized[0] === 'X' && normalized.length < 3) {
        setTenthFrameError('Strike in 10th frame requires 2 more shots');
        setError('Strike in 10th frame requires 2 more shots');
        return;
      }
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
      const nextIndex = currentPlayerIndex + 1;
      const nextGame = updatedGameData[nextIndex] || EMPTY_GAME;
      setCurrentPlayerIndex(nextIndex);
      setCurrentGame(nextGame);
      setError('');
      if (nextGame.tenthFrame) {
        const validation = validateTenthFrame(nextGame.tenthFrame);
        setTenthFrameError(validation.valid ? '' : (validation.error || t('addGame.tenthFrameInvalid')));
      } else {
        setTenthFrameError('');
      }
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
    // Special validation: If 10th frame starts with X (strike), require 3 characters total
    const normalized = currentGame.tenthFrame.toUpperCase().trim();
    if (normalized[0] === 'X' && normalized.length < 3) {
      return false; // Strike requires 2 more shots (3 total characters)
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

  // Check if review data is valid and complete
  const areAllGamesValid = (): boolean => {
    const playersList = getSelectedPlayersList();
    for (let i = 0; i < playersList.length; i++) {
      const game = gameData[i];
      if (!game || !game.totalScore || game.totalScore <= 0) {
        return false;
      }
      if (!game.tenthFrame || game.tenthFrame.trim() === '') {
        return false;
      }
      // Special validation: If 10th frame starts with X (strike), require 3 characters total
      const normalized = game.tenthFrame.toUpperCase().trim();
      if (normalized[0] === 'X' && normalized.length < 3) {
        return false; // Strike requires 2 more shots (3 total characters)
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

  const handleLiveContinueToScores = () => {
    const playersList = getSelectedPlayersList();
    const mergedGameData = playersList.map((_, index) => {
      const live = liveGames[index] || EMPTY_GAME;
      const existing = gameData[index] || EMPTY_GAME;
      return {
        ...EMPTY_GAME,
        ...existing,
        ...live,
        strikesFrames1to9: live.strikesFrames1to9 ?? existing.strikesFrames1to9 ?? 0,
        sparesFrames1to9: live.sparesFrames1to9 ?? existing.sparesFrames1to9 ?? 0,
      };
    });

    setGameData(mergedGameData);
    setCurrentPlayerIndex(0);
    setCurrentGame(mergedGameData[0] || EMPTY_GAME);
    setError('');
    setTenthFrameError('');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (currentStep === 3) {
      const shouldExitLiveMode = confirm(t('addGame.liveExitWarning'));
      if (!shouldExitLiveMode) {
        return;
      }

      clearLiveDraftStorage();
      setCurrentStep(0);
      setEntryMode('classic');
      setCurrentPlayerIndex(0);
      setGameData([]);
      setLiveGames([]);
      setCurrentGame(EMPTY_GAME);
      setError('');
      setTenthFrameError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 1 && currentPlayerIndex > 0) {
      const prevIndex = currentPlayerIndex - 1;
      const prevGame = gameData[prevIndex] || EMPTY_GAME;
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
      const lastGame = gameData[lastIndex] || EMPTY_GAME;
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
    } else if (currentStep === 1 && currentPlayerIndex === 0) {
      setCurrentStep(entryMode === 'live' ? 3 : 0);
      setError('');
      setTenthFrameError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      resetDraftState();
      alert(t('common.success'));
    } catch (error) {
      console.error('Error saving games:', error);
      alert('Error saving games. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPlayersList = getSelectedPlayersList();
  const currentPlayer = selectedPlayersList[currentPlayerIndex];
  const isFirstPlayer = currentPlayerIndex === 0;
  const isLastPlayer = currentPlayerIndex === selectedPlayersList.length - 1;
  const renderScoreNavigation = () => (
    <div className="flex gap-2 sm:gap-3">
      <button
        onClick={handleBack}
        className="flex-1 bg-amber-400 border-4 border-black text-black py-2 sm:py-2 md:py-1.5 rounded-none font-black flex items-center justify-center gap-2 text-sm sm:text-sm md:text-xs"
      >
        <ArrowLeft className="w-4 h-4 sm:w-4 md:w-3.5" />
        <span>{isFirstPlayer ? (entryMode === 'live' ? t('addGame.backToLiveStats') : t('addGame.playerSelectionShort')) : t('addGame.previous')}</span>
      </button>
      <button
        onClick={handleNext}
        disabled={!isCurrentGameValid()}
        className="flex-1 bg-blue-400 border-4 border-black text-black py-2 sm:py-2 md:py-1.5 rounded-none font-black flex items-center justify-center gap-2 text-sm sm:text-sm md:text-xs hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span>{isLastPlayer ? t('addGame.review') : t('addGame.nextPlayer')}</span>
        <ArrowRight className="w-4 h-4 sm:w-4 md:w-3.5" />
      </button>
    </div>
  );


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
                onClick={handleClearSelection}
                disabled={selectedPlayers.length === 0}
                className="bg-amber-400 border-4 border-black text-black px-3 sm:px-3 md:px-2 py-2 sm:py-2 md:py-1.5 rounded-none font-black flex items-center gap-2 text-sm sm:text-sm md:text-xs disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Eraser className="w-4 h-4 sm:w-4 md:w-3.5" />
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
                const selectedColor = position ? 'bg-lime-500' : '';
                return (
                  <button
                    key={player.id}
                    onClick={() => handleAddPlayer(player.id)}
                    disabled={!isSelected && selectedPlayers.length >= 4}
                    className={`p-4 rounded-none border-4 border-black font-black text-base sm:text-lg transition-all  min-h-[80px] sm:min-h-[90px] ${isSelected
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleStartGame('classic')}
              disabled={selectedPlayers.length === 0}
              className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {t('addGame.startGame')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStartGame('live')}
              disabled={selectedPlayers.length === 0}
              className="w-full bg-blue-400 border-4 border-black text-black py-4 rounded-none font-black flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {t('addGame.startGameLive')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-black font-bold">
            {t('addGame.liveModeHint')}
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('addGame.liveTitle')}</h1>
              <p className="text-sm sm:text-base text-black font-bold">{t('addGame.liveSubtitle')}</p>
            </div>
            <button
              onClick={handleBack}
              className="bg-amber-400 border-4 border-black text-black px-3 py-2 rounded-none font-black flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('addGame.backToPlayerSelection')}</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {selectedPlayersList.map((player, index) => {
              const game = liveGames[index] || EMPTY_GAME;
              const strikes = game.strikesFrames1to9 ?? 0;
              const spares = game.sparesFrames1to9 ?? 0;
              const canIncreaseStrikes = strikes + spares < 9;
              const canIncreaseSpares = strikes + spares < 9;

              return (
                <div key={player.id} className="bg-white border-4 border-black p-4">
                  <h2 className="text-xl sm:text-2xl font-black text-black uppercase mb-3">{player.name}</h2>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border-4 border-black p-2">
                        <p className="text-xs font-black uppercase text-black mb-2">{t('addGame.strikes')}</p>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleLiveCounterChange(index, 'strikesFrames1to9', -1)}
                            disabled={strikes <= 0}
                            className="bg-white border-4 border-black text-black p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            aria-label={t('addGame.decrease')}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-3xl font-black text-black min-w-[2ch] text-center">{strikes}</span>
                          <button
                            onClick={() => handleLiveCounterChange(index, 'strikesFrames1to9', 1)}
                            disabled={!canIncreaseStrikes}
                            className="bg-blue-400 border-4 border-black text-black p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            aria-label={t('addGame.increase')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border-4 border-black p-2">
                        <p className="text-xs font-black uppercase text-black mb-2">{t('addGame.spares')}</p>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleLiveCounterChange(index, 'sparesFrames1to9', -1)}
                            disabled={spares <= 0}
                            className="bg-white border-4 border-black text-black p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            aria-label={t('addGame.decrease')}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-3xl font-black text-black min-w-[2ch] text-center">{spares}</span>
                          <button
                            onClick={() => handleLiveCounterChange(index, 'sparesFrames1to9', 1)}
                            disabled={!canIncreaseSpares}
                            className="bg-blue-400 border-4 border-black text-black p-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            aria-label={t('addGame.increase')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleBack}
              className="w-full bg-lime-400 border-4 border-black text-black px-4 py-3 sm:py-4 rounded-none font-black text-sm sm:text-base leading-none flex items-center justify-center gap-2 hover:bg-lime-500 transition-all"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t('addGame.playerSelectionShort')}</span>
            </button>
            <button
              onClick={handleLiveContinueToScores}
              className="w-full bg-red-400 border-4 border-black text-black px-4 py-3 sm:py-4 rounded-none font-black text-sm sm:text-base leading-none flex items-center justify-center gap-2 hover:bg-red-500 transition-all"
            >
              <span className="truncate">{t('addGame.scoresShort')}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </button>
          </div>
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
                <div key={index} className="bg-white border-4 border-black p-0 transition-transform hover:-translate-y-1">
                  <div className="bg-amber-400 p-3 sm:p-4 border-b-4 border-black flex justify-between items-center text-black">
                    <h3 className="font-black text-lg sm:text-xl uppercase truncate flex-1">{player.name}</h3>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('addGame.score')}</span>
                        <span className="font-black text-3xl sm:text-4xl text-black">{game.totalScore}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('addGame.tenthFrame')}</span>
                        <span className="font-black text-md sm:text-lg text-black bg-yellow-100 p-2 border-2 border-black inline-block text-center">{game.tenthFrame}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('addGame.strikes')}</span>
                        <span className="font-black text-2xl text-black">{game.strikesFrames1to9}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('addGame.spares')}</span>
                        <span className="font-black text-2xl text-black">{game.sparesFrames1to9}</span>
                      </div>
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
              className="flex-1 bg-blue-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
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
    <div className="min-h-screen bg-orange-50 pb-20 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('addGame.title')}</h1>
            <span className="text-xs sm:text-sm text-black font-black">
              {t('addGame.player')} {currentPlayerIndex + 1} {t('common.of')} {selectedPlayersList.length}
            </span>
          </div>
          <div className="w-full bg-white border-4 border-black h-3 sm:h-4">
            <div
              className="bg-blue-400 h-full transition-all"
              style={{ width: `${((currentPlayerIndex + 1) / selectedPlayersList.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          {renderScoreNavigation()}
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
                  className="absolute bg-red-600 border-4 border-black px-2 sm:px-2 md:px-1.5 py-1.5 sm:py-1.5 md:py-1 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-4 h-4 sm:w-4 md:w-3.5" />
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

          {entryMode === 'classic' && (
            <>
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
                      className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${currentGame.strikesFrames1to9 === num
                        ? 'bg-blue-400 text-black'
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
                      className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${currentGame.sparesFrames1to9 === num
                        ? 'bg-blue-400 text-black'
                        : 'bg-amber-400 hover:bg-amber-500 text-black'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 10th Frame */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              {t('addGame.tenthFrame')}
            </label>

            {/* Current Notation Display */}
            <div className="mb-4 flex items-center justify-center relative">
              <div className={`inline-block px-4 py-3 border-4 min-w-[200px] text-center ${tenthFrameError ? 'border-red-600 bg-red-100' : 'border-black bg-white'
                }`}>
                <span className="text-2xl sm:text-3xl font-mono font-black text-black">
                  {currentGame.tenthFrame || '---'}
                </span>
              </div>
              {currentGame.tenthFrame && currentGame.tenthFrame.length > 0 && (
                <button
                  onClick={() => handleTenthFrameChange('')}
                  className="absolute bg-red-600 border-4 border-black px-2 sm:px-2 md:px-1.5 py-1.5 sm:py-1.5 md:py-1 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-4 h-4 sm:w-4 md:w-3.5" />
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
          {renderScoreNavigation()}
        </div>
      </div>
    </div>
  );
}
