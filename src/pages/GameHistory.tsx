import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { getGames, getPlayers, removeGame, removeGamesBySession, updateGameDate, updateGamesDateBySession } from '../utils/storage';
import { calculateSpareSummary, calculateStrikeSummary } from '../utils/scoring';
import { formatAppDate, getTodayDateInAppTimeZone } from '../utils/date';
import { t, getLanguage } from '../i18n';
import type { Game, Player } from '../types';
import { useSeason } from '../contexts/useSeason';

export default function GameHistory() {
  const { querySeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedPlayerId, setSelectedPlayerId] = useState('all');
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());
  const [editingDateTarget, setEditingDateTarget] = useState<{ type: 'game' | 'session'; id: string } | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [savingDateTargetId, setSavingDateTargetId] = useState<string | null>(null);

  const getLocalTodayDateString = () => getTodayDateInAppTimeZone();
  const formatGameDate = (dateValue: string) => formatAppDate(dateValue);

  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setCurrentLang(e.detail);
    };
    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languagechange', handleLanguageChange as EventListener);
  }, []);

  void currentLang;

  const loadData = async () => {
    setIsLoading(true);
    const [loadedPlayers, loadedGames] = await Promise.all([
      getPlayers(true),
      getGames(false, querySeason),
    ]);
    setPlayers(loadedPlayers);
    setGames(loadedGames);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [querySeason]);

  const filteredGames = useMemo(() => {
    if (selectedPlayerId === 'all') return games;
    return games.filter((game) => game.playerId === selectedPlayerId);
  }, [games, selectedPlayerId]);

  const playersWithGames = useMemo(() => {
    const gamePlayerIds = new Set(games.map((game) => game.playerId).filter((id): id is string => Boolean(id)));
    return players
      .filter((player) => gamePlayerIds.has(player.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, games]);

  const sessions = useMemo(() => {
    const compareGamesByPlayedDate = (a: Game, b: Game) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const createdA = a.created_at || a.date;
      const createdB = b.created_at || b.date;
      return new Date(createdB).getTime() - new Date(createdA).getTime();
    };

    const gamesBySession = new Map<string, Game[]>();
    const gamesWithoutSession: Game[] = [];

    filteredGames.forEach((game) => {
      if (game.gameSessionId) {
        const sessionGames = gamesBySession.get(game.gameSessionId) || [];
        sessionGames.push(game);
        gamesBySession.set(game.gameSessionId, sessionGames);
      } else {
        gamesWithoutSession.push(game);
      }
    });

    const groupedSessions = Array.from(gamesBySession.entries()).sort(([, gamesA], [, gamesB]) => {
      const representativeA = [...gamesA].sort(compareGamesByPlayedDate)[0];
      const representativeB = [...gamesB].sort(compareGamesByPlayedDate)[0];
      return compareGamesByPlayedDate(representativeA, representativeB);
    });

    const individualGames = [...gamesWithoutSession].sort(compareGamesByPlayedDate);

    return { groupedSessions, individualGames };
  }, [filteredGames]);

  const singlePlayerGames = useMemo(() => {
    if (selectedPlayerId === 'all') return [];
    return [...filteredGames].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const createdA = a.created_at || a.date;
      const createdB = b.created_at || b.date;
      return new Date(createdB).getTime() - new Date(createdA).getTime();
    });
  }, [filteredGames, selectedPlayerId]);

  const isSinglePlayerView = selectedPlayerId !== 'all';

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return t('gameHistory.unknownPlayer');
    return players.find((player) => player.id === playerId)?.name || t('gameHistory.unknownPlayer');
  };

  const formatGameFractions = (game: Game) => {
    const strikeSummary = calculateStrikeSummary(game);
    const spareSummary = calculateSpareSummary(game);
    return {
      strikes: `${strikeSummary.strikes}/${strikeSummary.opportunities}`,
      spares: `${spareSummary.spares}/${spareSummary.opportunities}`,
    };
  };

  const renderGameStatsGrid = (game: Game, fractions: { strikes: string; spares: string }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
      <div className="border-2 border-black bg-orange-100 px-2 py-2">
        <p className="text-[10px] uppercase font-black text-black leading-tight">{t('addGame.score')}</p>
        <p className="text-sm sm:text-base font-black text-black leading-tight">{game.totalScore}</p>
      </div>
      <div className="border-2 border-black bg-blue-100 px-2 py-2">
        <p className="text-[10px] uppercase font-black text-black leading-tight">{t('players.strikes')}</p>
        <p className="text-sm sm:text-base font-black text-black leading-tight">{fractions.strikes}</p>
      </div>
      <div className="border-2 border-black bg-lime-100 px-2 py-2">
        <p className="text-[10px] uppercase font-black text-black leading-tight">{t('players.spares')}</p>
        <p className="text-sm sm:text-base font-black text-black leading-tight">{fractions.spares}</p>
      </div>
      <div className="border-2 border-black bg-yellow-100 px-2 py-2">
        <p className="text-[10px] uppercase font-black text-black leading-tight">{t('addGame.tenthFrame')}</p>
        <p className="text-sm sm:text-base font-black text-black leading-tight font-mono">{game.tenthFrame || '-'}</p>
      </div>
    </div>
  );

  const beginEditDate = (type: 'game' | 'session', id: string, date: string) => {
    setEditingDateTarget({ type, id });
    setEditingDateValue(date);
  };

  const cancelEditDate = () => {
    setEditingDateTarget(null);
    setEditingDateValue('');
  };

  const saveEditedDate = async () => {
    if (!editingDateTarget || !editingDateValue) return;
    setSavingDateTargetId(editingDateTarget.id);
    try {
      if (editingDateTarget.type === 'session') {
        await updateGamesDateBySession(editingDateTarget.id, editingDateValue);
      } else {
        await updateGameDate(editingDateTarget.id, editingDateValue);
      }
      cancelEditDate();
      await loadData();
    } catch (error) {
      console.error('Error updating game date:', error);
      alert('Error updating game date. Please try again.');
    } finally {
      setSavingDateTargetId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t('gameHistory.confirmDeleteSession'))) return;
    setDeletingId(sessionId);
    try {
      await removeGamesBySession(sessionId);
      await loadData();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert(t('gameHistory.errorDeleteSession'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm(t('gameHistory.confirmDeleteGame'))) return;
    setDeletingId(gameId);
    try {
      await removeGame(gameId);
      await loadData();
    } catch (error) {
      console.error('Error deleting game:', error);
      alert(t('gameHistory.errorDeleteGame'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('gameHistory.title')}</h1>
          <p className="text-sm sm:text-base text-black font-bold">{t('gameHistory.subtitle')}</p>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <label className="block text-xs sm:text-sm font-black text-black uppercase mb-2">{t('gameHistory.filterByPlayer')}</label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full bg-white border-4 border-black text-black font-black px-3 py-3 rounded-none"
          >
            <option value="all">{t('gameHistory.allPlayers')}</option>
            {playersWithGames.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="bg-white border-4 border-black p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-black" />
            <p className="font-black text-black">{t('gameHistory.loading')}</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="font-black text-black">{t('gameHistory.noGames')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {isSinglePlayerView ? (
              singlePlayerGames.map((game) => {
                const fractions = formatGameFractions(game);
                const isEditingGameDate = editingDateTarget?.type === 'game' && editingDateTarget.id === game.id;
                return (
                  <div key={game.id} className="flex items-start justify-between gap-3 bg-white border-4 border-black p-3 sm:p-4">
                    <div className="flex-1">
                      {isEditingGameDate ? (
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <input
                            type="date"
                            value={editingDateValue}
                            max={getLocalTodayDateString()}
                            onChange={(e) => setEditingDateValue(e.target.value)}
                            className="bg-white border-2 border-black text-black font-black px-2 py-1 rounded-none text-sm"
                          />
                          <button
                            onClick={saveEditedDate}
                            disabled={!editingDateValue || savingDateTargetId === game.id}
                            className="bg-lime-400 border-2 border-black text-black p-1 disabled:bg-gray-300"
                            aria-label={t('common.save')}
                          >
                            {savingDateTargetId === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEditDate}
                            className="bg-amber-400 border-2 border-black text-black p-1"
                            aria-label={t('common.cancel')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-black text-sm sm:text-base">{formatGameDate(game.date)}</p>
                          <button
                            onClick={() => beginEditDate('game', game.id, game.date)}
                            className="bg-amber-400 border-2 border-black text-black p-1"
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {renderGameStatsGrid(game, fractions)}
                    </div>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      disabled={deletingId === game.id}
                      className="bg-red-600 border-2 border-black text-white p-2 hover:bg-red-700 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            ) : (
              <>
                {sessions.groupedSessions.map(([sessionId, sessionGames]) => {
                  const totalSum = sessionGames.reduce((sum, game) => sum + game.totalScore, 0);
                  const date = sessionGames[0]?.date || '';
                  const uniquePlayers = new Set(sessionGames.map((game) => game.playerId).filter((id): id is string => Boolean(id)));
                  const isExpanded = expandedSessions.has(sessionId);
                  const isEditingSessionDate = editingDateTarget?.type === 'session' && editingDateTarget.id === sessionId;
                  return (
                    <div key={sessionId} className="bg-amber-400 border-4 border-black p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            onClick={() => {
                              const next = new Set(expandedSessions);
                              if (isExpanded) next.delete(sessionId);
                              else next.add(sessionId);
                              setExpandedSessions(next);
                            }}
                            className="p-1 hover:bg-amber-500 transition-all"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
                          </button>
                          <div className="flex-1">
                            {isEditingSessionDate ? (
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <input
                                  type="date"
                                  value={editingDateValue}
                                  max={getLocalTodayDateString()}
                                  onChange={(e) => setEditingDateValue(e.target.value)}
                                  className="bg-white border-2 border-black text-black font-black px-2 py-1 rounded-none text-sm"
                                />
                                <button
                                  onClick={saveEditedDate}
                                  disabled={!editingDateValue || savingDateTargetId === sessionId}
                                  className="bg-lime-400 border-2 border-black text-black p-1 disabled:bg-gray-300"
                                  aria-label={t('common.save')}
                                >
                                  {savingDateTargetId === sessionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={cancelEditDate}
                                  className="bg-white border-2 border-black text-black p-1"
                                  aria-label={t('common.cancel')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-black text-black text-sm sm:text-base">{formatGameDate(date)}</p>
                                <button
                                  onClick={() => beginEditDate('session', sessionId, date)}
                                  className="bg-white border-2 border-black text-black p-1"
                                  aria-label={t('common.edit')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <p className="text-xs sm:text-sm font-bold text-black">
                              {t('dashboard.total')}: {totalSum} | {uniquePlayers.size} {t('dashboard.players')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(sessionId)}
                          disabled={deletingId === sessionId}
                          className="bg-red-600 border-4 border-black text-white px-3 py-2 hover:bg-red-700 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2 text-xs sm:text-sm"
                        >
                          {deletingId === sessionId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t('addGame.deleting')}</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>{t('common.delete')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2 mt-3">
                          {sessionGames.map((game) => {
                            const fractions = formatGameFractions(game);
                            return (
                              <div key={game.id} className="bg-white border-2 sm:border-4 border-black p-3 sm:p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-black text-black text-sm sm:text-lg leading-tight">{getPlayerName(game.playerId)}</p>
                                  <span className="text-[10px] sm:text-xs font-black uppercase bg-amber-200 border-2 border-black px-2 py-1">
                                    {formatGameDate(game.date)}
                                  </span>
                                </div>
                                {renderGameStatsGrid(game, fractions)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {sessions.individualGames.map((game) => {
                  const fractions = formatGameFractions(game);
                  const isEditingGameDate = editingDateTarget?.type === 'game' && editingDateTarget.id === game.id;
                  return (
                    <div key={game.id} className="flex items-start justify-between gap-3 bg-white border-4 border-black p-3 sm:p-4">
                      <div className="flex-1">
                        {isEditingGameDate ? (
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-black text-black text-sm sm:text-base">{getPlayerName(game.playerId)}</span>
                            <input
                              type="date"
                              value={editingDateValue}
                              max={getLocalTodayDateString()}
                              onChange={(e) => setEditingDateValue(e.target.value)}
                              className="bg-white border-2 border-black text-black font-black px-2 py-1 rounded-none text-sm"
                            />
                            <button
                              onClick={saveEditedDate}
                              disabled={!editingDateValue || savingDateTargetId === game.id}
                              className="bg-lime-400 border-2 border-black text-black p-1 disabled:bg-gray-300"
                              aria-label={t('common.save')}
                            >
                              {savingDateTargetId === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={cancelEditDate}
                              className="bg-amber-400 border-2 border-black text-black p-1"
                              aria-label={t('common.cancel')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-black text-sm sm:text-base">
                              {getPlayerName(game.playerId)} - {formatGameDate(game.date)}
                            </p>
                            <button
                              onClick={() => beginEditDate('game', game.id, game.date)}
                              className="bg-amber-400 border-2 border-black text-black p-1"
                              aria-label={t('common.edit')}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {renderGameStatsGrid(game, fractions)}
                      </div>
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        disabled={deletingId === game.id}
                        className="bg-red-600 border-2 border-black text-white p-2 hover:bg-red-700 font-black disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {deletingId === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
