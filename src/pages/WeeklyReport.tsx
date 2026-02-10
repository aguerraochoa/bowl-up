import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clipboard, Loader2, MessageCircle, Share2, Trophy } from 'lucide-react';
import { getDebts, getGames, getPlayers } from '../utils/storage';
import { calculateTeamStatsFromData } from '../utils/stats';
import { calculateStrikePercentage, calculateSparePercentage } from '../utils/scoring';
import type { Debt, Game, Player } from '../types';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/useSeason';

const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const toDateOnly = (value: string): Date => new Date(`${value}T00:00:00`);

const getWeekRange = (offset: number): { start: Date; end: Date } => {
  const now = new Date();
  const day = now.getDay(); // 0 Sun -> 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + (offset * 7));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const isInRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

export default function WeeklyReport() {
  const { querySeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());

  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setCurrentLang(e.detail);
    };
    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languagechange', handleLanguageChange as EventListener);
  }, []);

  void currentLang;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [loadedPlayers, loadedGames, loadedDebts] = await Promise.all([
        getPlayers(),
        getGames(false, querySeason),
        getDebts(),
      ]);
      setPlayers(loadedPlayers);
      setGames(loadedGames);
      setDebts(loadedDebts);
      setIsLoading(false);
    };
    void loadData();
  }, [querySeason]);

  const report = useMemo(() => {
    const week = getWeekRange(weekOffset);
    const previousWeek = getWeekRange(weekOffset - 1);
    const playerNameById = new Map(players.map((p) => [p.id, p.name]));

    const weeklyGames = games.filter((game) => isInRange(toDateOnly(game.date), week.start, week.end));
    const previousGames = games.filter((game) => isInRange(toDateOnly(game.date), previousWeek.start, previousWeek.end));
    const weeklyDebts = debts.filter((debt) => isInRange(toDateOnly(debt.date), week.start, week.end));

    const weeklyTeamStats = calculateTeamStatsFromData(weeklyGames);
    const previousTeamStats = calculateTeamStatsFromData(previousGames);

    const sessions = new Map<string, Game[]>();
    weeklyGames.forEach((game) => {
      const key = game.gameSessionId || game.id;
      const current = sessions.get(key) || [];
      current.push(game);
      sessions.set(key, current);
    });

    const bestSession = Array.from(sessions.values()).reduce<{ total: number; size: number } | null>((best, sessionGames) => {
      const total = sessionGames.reduce((sum, g) => sum + g.totalScore, 0);
      const candidate = { total, size: sessionGames.length };
      if (!best || total > best.total) return candidate;
      return best;
    }, null);

    const playerRows = players
      .map((player) => {
        const playerGames = weeklyGames.filter((g) => g.playerId === player.id);
        if (playerGames.length === 0) return null;

        const total = playerGames.reduce((sum, g) => sum + g.totalScore, 0);
        const avg = total / playerGames.length;
        const best = Math.max(...playerGames.map((g) => g.totalScore));
        const strike = playerGames.reduce((sum, g) => sum + calculateStrikePercentage(g), 0) / playerGames.length;
        const spare = playerGames.reduce((sum, g) => sum + calculateSparePercentage(g), 0) / playerGames.length;

        return {
          id: player.id,
          name: player.name,
          games: playerGames.length,
          average: avg,
          best,
          strike,
          spare,
        };
      })
      .filter((row): row is { id: string; name: string; games: number; average: number; best: number; strike: number; spare: number } => row !== null)
      .sort((a, b) => b.average - a.average);

    const strikeLeader = [...playerRows].sort((a, b) => b.strike - a.strike)[0] || null;
    const spareLeader = [...playerRows].sort((a, b) => b.spare - a.spare)[0] || null;

    const balances: Record<string, number> = {};
    players.forEach((player) => {
      balances[player.id] = 0;
    });

    debts.forEach((debt) => {
      balances[debt.paidBy] = (balances[debt.paidBy] || 0) + debt.amount;
      if (debt.splitMethod === 'equal') {
        const perPerson = debt.amount / Math.max(1, debt.splitBetween.length);
        debt.splitBetween.forEach((playerId) => {
          balances[playerId] = (balances[playerId] || 0) - perPerson;
        });
      } else if (debt.splitMethod === 'games' && debt.gameCounts) {
        const totalGamesCount = Object.values(debt.gameCounts).reduce((sum, count) => sum + count, 0);
        Object.entries(debt.gameCounts).forEach(([playerId, count]) => {
          const share = totalGamesCount > 0 ? (count / totalGamesCount) * debt.amount : 0;
          balances[playerId] = (balances[playerId] || 0) - share;
        });
      } else if (debt.splitMethod === 'custom' && debt.customAmounts) {
        Object.entries(debt.customAmounts).forEach(([playerId, amount]) => {
          balances[playerId] = (balances[playerId] || 0) - amount;
        });
      }
    });

    const biggestPositiveBalance = Object.entries(balances)
      .sort((a, b) => b[1] - a[1])
      .find(([, value]) => value > 0.01);

    return {
      week,
      weeklyGames,
      weeklyDebts,
      weeklyTeamStats,
      previousTeamStats,
      bestSession,
      topPlayers: playerRows.slice(0, 3),
      strikeLeader,
      spareLeader,
      expensesTotal: weeklyDebts.reduce((sum, debt) => sum + debt.amount, 0),
      topBalance: biggestPositiveBalance
        ? {
            name: playerNameById.get(biggestPositiveBalance[0]) || t('dashboard.removedPlayer'),
            amount: biggestPositiveBalance[1],
          }
        : null,
      avgDelta: weeklyTeamStats.teamGameAverage - previousTeamStats.teamGameAverage,
      strikeDelta: weeklyTeamStats.totalStrikePercentage - previousTeamStats.totalStrikePercentage,
      spareDelta: weeklyTeamStats.totalSparePercentage - previousTeamStats.totalSparePercentage,
    };
  }, [weekOffset, games, debts, players]);

  const whatsappText = useMemo(() => {
    const lines = [
      `*${t('weeklyReport.title')}*`,
      `${formatDateLabel(report.week.start)} - ${formatDateLabel(report.week.end)}`,
      '',
      `${t('weeklyReport.snapshotTitle')}`,
      `- ${t('weeklyReport.games')}: ${report.weeklyGames.length}`,
      `- ${t('weeklyReport.teamAverage')}: ${report.weeklyTeamStats.teamGameAverage.toFixed(1)}`,
      `- ${t('weeklyReport.bestSession')}: ${report.bestSession ? report.bestSession.total : '-'}`,
      '',
      `${t('weeklyReport.topPerformers')}`,
      ...report.topPlayers.map((player, index) =>
        `${index + 1}. ${player.name} (${player.average.toFixed(1)} avg, ${player.best} high)`,
      ),
      '',
      `${t('weeklyReport.leaders')}`,
      `- ${t('weeklyReport.strikeLeader')}: ${report.strikeLeader ? `${report.strikeLeader.name} (${report.strikeLeader.strike.toFixed(1)}%)` : '-'}`,
      `- ${t('weeklyReport.spareLeader')}: ${report.spareLeader ? `${report.spareLeader.name} (${report.spareLeader.spare.toFixed(1)}%)` : '-'}`,
      '',
      `${t('weeklyReport.expenses')}: $${report.expensesTotal.toFixed(2)}`,
      report.topBalance ? `${t('weeklyReport.topBalance')}: ${report.topBalance.name} ($${report.topBalance.amount.toFixed(2)})` : '',
      '',
      'Powered by BowlUp',
    ];

    return lines.filter(Boolean).join('\n');
  }, [report]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShareWhatsapp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-black font-bold text-base">{t('weeklyReport.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('weeklyReport.title')}</h1>
              <p className="text-sm sm:text-base text-black font-bold">
                {formatDateLabel(report.week.start)} - {formatDateLabel(report.week.end)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="bg-amber-400 border-4 border-black text-black p-2 font-black hover:bg-amber-500 transition-all"
                aria-label={t('weeklyReport.previousWeek')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="bg-white border-4 border-black text-black px-4 py-2 font-black hover:bg-gray-100 transition-all text-sm"
              >
                {t('weeklyReport.thisWeek')}
              </button>
              <button
                onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={weekOffset === 0}
                className="bg-amber-400 border-4 border-black text-black p-2 font-black hover:bg-amber-500 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label={t('weeklyReport.nextWeek')}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border-4 border-black p-4">
            <p className="text-xs uppercase font-black text-black">{t('weeklyReport.games')}</p>
            <p className="text-4xl font-black text-black">{report.weeklyGames.length}</p>
          </div>
          <div className="bg-white border-4 border-black p-4">
            <p className="text-xs uppercase font-black text-black">{t('weeklyReport.teamAverage')}</p>
            <p className="text-4xl font-black text-black">{report.weeklyTeamStats.teamGameAverage.toFixed(1)}</p>
          </div>
          <div className="bg-white border-4 border-black p-4">
            <p className="text-xs uppercase font-black text-black">{t('weeklyReport.bestSession')}</p>
            <p className="text-4xl font-black text-black">{report.bestSession ? report.bestSession.total : '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <h2 className="text-xl font-black text-black uppercase mb-4">{t('weeklyReport.topPerformers')}</h2>
            {report.topPlayers.length === 0 ? (
              <p className="text-black font-bold">{t('weeklyReport.noGamesThisWeek')}</p>
            ) : (
              <div className="space-y-3">
                {report.topPlayers.map((player, index) => (
                  <div key={player.id} className="bg-amber-400 border-4 border-black p-3 flex items-center justify-between">
                    <div>
                      <p className="font-black text-black">#{index + 1} {player.name}</p>
                      <p className="text-xs font-bold text-black">{player.games} {t('weeklyReport.gamesLabel')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-black">{player.average.toFixed(1)}</p>
                      <p className="text-xs font-bold text-black">{t('weeklyReport.high')}: {player.best}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <h2 className="text-xl font-black text-black uppercase mb-4">{t('weeklyReport.leaders')}</h2>
            <div className="space-y-3">
              <div className="bg-orange-500 border-4 border-black p-3">
                <p className="text-xs font-black uppercase text-black">{t('weeklyReport.strikeLeader')}</p>
                <p className="text-lg font-black text-black">
                  {report.strikeLeader ? `${report.strikeLeader.name} (${report.strikeLeader.strike.toFixed(1)}%)` : '-'}
                </p>
              </div>
              <div className="bg-amber-400 border-4 border-black p-3">
                <p className="text-xs font-black uppercase text-black">{t('weeklyReport.spareLeader')}</p>
                <p className="text-lg font-black text-black">
                  {report.spareLeader ? `${report.spareLeader.name} (${report.spareLeader.spare.toFixed(1)}%)` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <h2 className="text-xl font-black text-black uppercase mb-4">{t('weeklyReport.vsLastWeek')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border-4 border-black p-3 bg-white">
              <p className="text-xs uppercase font-black text-black">{t('weeklyReport.teamAverage')}</p>
              <p className="text-lg font-black text-black">{report.avgDelta >= 0 ? '+' : ''}{report.avgDelta.toFixed(1)}</p>
            </div>
            <div className="border-4 border-black p-3 bg-white">
              <p className="text-xs uppercase font-black text-black">{t('weeklyReport.strikeDelta')}</p>
              <p className="text-lg font-black text-black">{report.strikeDelta >= 0 ? '+' : ''}{report.strikeDelta.toFixed(1)}%</p>
            </div>
            <div className="border-4 border-black p-3 bg-white">
              <p className="text-xs uppercase font-black text-black">{t('weeklyReport.spareDelta')}</p>
              <p className="text-lg font-black text-black">{report.spareDelta >= 0 ? '+' : ''}{report.spareDelta.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <h2 className="text-xl font-black text-black uppercase mb-3">{t('weeklyReport.financeSummary')}</h2>
          <p className="text-base font-black text-black">{t('weeklyReport.expenses')}: ${report.expensesTotal.toFixed(2)}</p>
          <p className="text-sm font-bold text-black mt-2">
            {report.topBalance
              ? `${t('weeklyReport.topBalance')}: ${report.topBalance.name} ($${report.topBalance.amount.toFixed(2)})`
              : t('weeklyReport.noBalanceData')}
          </p>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6">
          <h2 className="text-xl font-black text-black uppercase mb-3">{t('weeklyReport.shareTitle')}</h2>
          <p className="text-sm font-bold text-black mb-4">{t('weeklyReport.shareSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void handleCopy()}
              className="flex-1 bg-amber-400 border-4 border-black text-black py-3 font-black hover:bg-amber-500 transition-all flex items-center justify-center gap-2"
            >
              <Clipboard className="w-5 h-5" />
              {copySuccess ? t('weeklyReport.copied') : t('weeklyReport.copySummary')}
            </button>
            <button
              onClick={handleShareWhatsapp}
              className="flex-1 bg-lime-500 border-4 border-black text-black py-3 font-black hover:bg-lime-600 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              {t('weeklyReport.shareWhatsapp')}
            </button>
            <button
              onClick={handleShareWhatsapp}
              className="flex-1 bg-orange-500 border-4 border-black text-black py-3 font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              {t('weeklyReport.share')}
            </button>
          </div>
          <div className="mt-4 p-3 border-4 border-black bg-orange-50">
            <p className="text-xs font-bold text-black whitespace-pre-line">{whatsappText}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center text-xs font-black text-black uppercase gap-2">
          <Trophy className="w-4 h-4" />
          Powered by BowlUp
        </div>
      </div>
    </div>
  );
}
