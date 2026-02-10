import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clipboard, Download, Loader2, MessageCircle, Share2, Trophy } from 'lucide-react';
import { getGames, getPlayers } from '../utils/storage';
import { calculateTeamStatsFromData } from '../utils/stats';
import { calculateStrikePercentage, calculateSparePercentage } from '../utils/scoring';
import type { Game, Player } from '../types';
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
const formatSigned = (value: number, suffix = ''): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function WeeklyReport() {
  const { querySeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
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
      const [loadedPlayers, loadedGames] = await Promise.all([
        getPlayers(),
        getGames(false, querySeason),
      ]);
      setPlayers(loadedPlayers);
      setGames(loadedGames);
      setIsLoading(false);
    };
    void loadData();
  }, [querySeason]);

  const report = useMemo(() => {
    const week = getWeekRange(weekOffset);
    const previousWeek = getWeekRange(weekOffset - 1);

    const weeklyGames = games.filter((game) => isInRange(toDateOnly(game.date), week.start, week.end));
    const previousGames = games.filter((game) => isInRange(toDateOnly(game.date), previousWeek.start, previousWeek.end));

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

    const allGamesByPlayer = players
      .map((player) => {
        const playerGames = weeklyGames
          .filter((game) => game.playerId === player.id)
          .sort((a, b) => {
            const aDate = a.created_at || a.date;
            const bDate = b.created_at || b.date;
            return new Date(aDate).getTime() - new Date(bDate).getTime();
          });

        return {
          id: player.id,
          name: player.name,
          games: playerGames,
          average: playerGames.reduce((sum, game) => sum + game.totalScore, 0) / playerGames.length,
        };
      })
      .filter((row) => row.games.length > 0)
      .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));

    const maxGamesPerPlayer = allGamesByPlayer.reduce((max, row) => Math.max(max, row.games.length), 0);
    const playerPercentages = [...playerRows].sort((a, b) => b.strike - a.strike || b.spare - a.spare || a.name.localeCompare(b.name));

    return {
      week,
      weeklyGames,
      hasPreviousWeekStats: previousGames.length > 0,
      weeklyTeamStats,
      previousWeekStats: previousTeamStats,
      bestSession,
      topPlayers: playerRows.slice(0, 3),
      strikeLeader,
      spareLeader,
      avgDelta: weeklyTeamStats.teamGameAverage - previousTeamStats.teamGameAverage,
      strikeDelta: weeklyTeamStats.totalStrikePercentage - previousTeamStats.totalStrikePercentage,
      spareDelta: weeklyTeamStats.totalSparePercentage - previousTeamStats.totalSparePercentage,
      allGamesByPlayer,
      maxGamesPerPlayer,
      playerPercentages,
    };
  }, [weekOffset, games, players]);

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
      'Powered by BowlUp',
    ];

    return lines.filter(Boolean).join('\n');
  }, [report]);

  const weekSelectorLabel = weekOffset === 0
    ? t('weeklyReport.thisWeek')
    : `${formatDateLabel(report.week.start)} - ${formatDateLabel(report.week.end)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShareWhatsapp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPdf = () => {
    const topPlayersHtml = report.topPlayers.length
      ? report.topPlayers
          .map(
            (player, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(player.name)}</td>
                <td>${player.games}</td>
                <td>${player.average.toFixed(1)}</td>
                <td>${player.best}</td>
              </tr>
            `,
          )
          .join('')
      : `<tr><td colspan="5">${escapeHtml(t('weeklyReport.noGamesThisWeek'))}</td></tr>`;

    const allGamesTableHeaders = Array.from({ length: Math.max(1, report.maxGamesPerPlayer) })
      .map((_, index) => `<th>${escapeHtml(`${t('weeklyReport.game')} ${index + 1}`)}</th>`)
      .join('');

    const allGamesTableRows = report.allGamesByPlayer
      .map((row) => {
        const cells = Array.from({ length: Math.max(1, report.maxGamesPerPlayer) }).map((_, index) => {
          const game = row.games[index];
          return `<td>${game ? game.totalScore : '-'}</td>`;
        });
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            ${cells.join('')}
          </tr>
        `;
      })
      .join('');

    const playerPercentRows = report.playerPercentages.length
      ? report.playerPercentages
          .map(
            (player) => `
              <tr>
                <td>${escapeHtml(player.name)}</td>
                <td>${player.strike.toFixed(1)}%</td>
                <td>${player.spare.toFixed(1)}%</td>
              </tr>
            `,
          )
          .join('')
      : `<tr><td colspan="3">${escapeHtml(t('weeklyReport.noGamesThisWeek'))}</td></tr>`;

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t('weeklyReport.title'))}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 12px; }
          .wrap { border: 3px solid #111; padding: 18px; max-width: 920px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
          .title { margin: 0; font-size: 28px; line-height: 1.1; text-transform: uppercase; }
          .subtitle { margin: 6px 0 0 0; font-size: 13px; font-weight: 700; }
          .badge { border: 2px solid #111; background: #f8c74f; padding: 8px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
          .stat { border: 2px solid #111; padding: 10px; }
          .stat .label { font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .stat .value { font-size: 26px; font-weight: 800; margin-top: 6px; }
          .two-col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; margin-bottom: 14px; }
          .card { border: 2px solid #111; padding: 10px; }
          .card h2 { margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: left; }
          th { background: #ffe9b6; text-transform: uppercase; font-size: 10px; }
          .leader { border: 2px solid #111; background: #fff3cc; padding: 8px; margin-bottom: 8px; }
          .leader .k { font-size: 10px; text-transform: uppercase; font-weight: 700; }
          .leader .v { font-size: 14px; font-weight: 800; margin-top: 2px; }
          .deltas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
          .delta { border: 2px solid #111; padding: 10px; }
          .delta .k { font-size: 10px; text-transform: uppercase; font-weight: 700; }
          .delta .v { font-size: 18px; font-weight: 800; margin-top: 4px; }
          .games-by-player { border: 2px solid #111; padding: 10px; margin-bottom: 10px; }
          .games-by-player h2 { margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; }
          .games-table th, .games-table td { border: 1px solid #111; padding: 6px; text-align: center; font-size: 11px; }
          .games-table th:first-child, .games-table td:first-child { text-align: left; font-weight: 800; }
          .games-table th { background: #ffe9b6; font-size: 10px; text-transform: uppercase; }
          .line { font-size: 12px; font-weight: 700; margin: 4px 0; }
          .footer { text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
          .toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
          .print-btn { border: 2px solid #111; background: #f8c74f; color: #111; padding: 8px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; }
          .print-btn:hover { background: #efb936; }
          @media screen and (max-width: 820px) {
            body { padding: 8px; }
            .wrap { border-width: 2px; padding: 12px; }
            .header { flex-direction: column; }
            .title { font-size: 22px; }
            .stats, .two-col, .deltas { grid-template-columns: 1fr; }
            .toolbar { justify-content: stretch; }
            .print-btn { width: 100%; }
          }
          @media print {
            .toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="toolbar">
            <button class="print-btn" onclick="window.print()">${escapeHtml(t('weeklyReport.downloadPdf'))}</button>
          </div>
          <div class="header">
            <div>
              <h1 class="title">${escapeHtml(t('weeklyReport.title'))}</h1>
              <p class="subtitle">${escapeHtml(formatDateLabel(report.week.start))} - ${escapeHtml(formatDateLabel(report.week.end))}</p>
            </div>
            <div class="badge">${escapeHtml(t('weeklyReport.snapshotTitle'))}</div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="label">${escapeHtml(t('weeklyReport.games'))}</div>
              <div class="value">${report.weeklyGames.length}</div>
            </div>
            <div class="stat">
              <div class="label">${escapeHtml(t('weeklyReport.teamAverage'))}</div>
              <div class="value">${report.weeklyTeamStats.teamGameAverage.toFixed(1)}</div>
            </div>
            <div class="stat">
              <div class="label">${escapeHtml(t('weeklyReport.bestSession'))}</div>
              <div class="value">${report.bestSession ? report.bestSession.total : '-'}</div>
            </div>
          </div>

          <div class="two-col">
            <div class="card">
              <h2>${escapeHtml(t('weeklyReport.topPerformers'))}</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${escapeHtml(t('weeklyReport.player'))}</th>
                    <th>${escapeHtml(t('weeklyReport.games'))}</th>
                    <th>${escapeHtml(t('headToHead.average'))}</th>
                    <th>${escapeHtml(t('weeklyReport.high'))}</th>
                  </tr>
                </thead>
                <tbody>${topPlayersHtml}</tbody>
              </table>
            </div>
            <div class="card">
              <h2>${escapeHtml(t('weeklyReport.leaders'))}</h2>
              <div class="leader">
                <div class="k">${escapeHtml(t('weeklyReport.strikeLeader'))}</div>
                <div class="v">${escapeHtml(report.strikeLeader ? `${report.strikeLeader.name} (${report.strikeLeader.strike.toFixed(1)}%)` : '-')}</div>
              </div>
              <div class="leader">
                <div class="k">${escapeHtml(t('weeklyReport.spareLeader'))}</div>
                <div class="v">${escapeHtml(report.spareLeader ? `${report.spareLeader.name} (${report.spareLeader.spare.toFixed(1)}%)` : '-')}</div>
              </div>
            </div>
          </div>

          ${
            report.hasPreviousWeekStats
              ? `
              <div class="deltas">
                <div class="delta">
                  <div class="k">${escapeHtml(t('weeklyReport.teamAverage'))}</div>
                  <div class="v">${formatSigned(report.avgDelta)}</div>
                </div>
                <div class="delta">
                  <div class="k">${escapeHtml(t('weeklyReport.strikeDelta'))}</div>
                  <div class="v">${formatSigned(report.strikeDelta, '%')}</div>
                </div>
                <div class="delta">
                  <div class="k">${escapeHtml(t('weeklyReport.spareDelta'))}</div>
                  <div class="v">${formatSigned(report.spareDelta, '%')}</div>
                </div>
              </div>
              `
              : ''
          }

          <div class="games-by-player">
            <h2>${escapeHtml(t('weeklyReport.allGamesByPlayer'))}</h2>
            ${
              report.weeklyGames.length === 0
                ? `<p class="line">${escapeHtml(t('weeklyReport.noGamesThisWeek'))}</p>`
                : `
                  <table class="games-table" style="width:100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th>${escapeHtml(t('weeklyReport.player'))}</th>
                        ${allGamesTableHeaders}
                      </tr>
                    </thead>
                    <tbody>
                      ${allGamesTableRows}
                    </tbody>
                  </table>
                `
            }
          </div>

          <div class="games-by-player">
            <h2>${escapeHtml(t('weeklyReport.strikeSpareByPlayer'))}</h2>
            <table class="games-table" style="width:100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th>${escapeHtml(t('weeklyReport.player'))}</th>
                  <th>${escapeHtml(t('headToHead.strike'))}</th>
                  <th>${escapeHtml(t('headToHead.spare'))}</th>
                </tr>
              </thead>
              <tbody>
                ${playerPercentRows}
              </tbody>
            </table>
          </div>

          <div class="footer">Powered by BowlUp</div>
        </div>
      </body>
      </html>
    `;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) return;
    if (isIOS) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      }, { once: true });
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
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
                className="bg-white border-4 border-black text-black w-[272px] py-2 font-black hover:bg-gray-100 transition-all text-sm text-center whitespace-nowrap"
              >
                {weekSelectorLabel}
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

        {report.hasPreviousWeekStats && (
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
        )}

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <h2 className="text-xl font-black text-black uppercase mb-4">{t('weeklyReport.allGamesByPlayer')}</h2>
          {report.weeklyGames.length === 0 ? (
            <p className="text-black font-bold">{t('weeklyReport.noGamesThisWeek')}</p>
          ) : (
            <div className="border-2 border-black overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="bg-amber-200 border-b-2 border-black">
                    <th className="text-left px-3 py-2 font-black text-black">{t('weeklyReport.player')}</th>
                    {Array.from({ length: Math.max(1, report.maxGamesPerPlayer) }).map((_, index) => (
                      <th key={index} className="text-center px-3 py-2 font-black text-black">
                        {t('weeklyReport.game')} {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.allGamesByPlayer.map((row, rowIndex) => (
                    <tr key={row.id} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-orange-50'} border-b border-black`}>
                      <td className="px-3 py-3 font-black text-black">{row.name}</td>
                      {Array.from({ length: Math.max(1, report.maxGamesPerPlayer) }).map((_, gameIndex) => (
                        <td key={`${row.id}-${gameIndex}`} className="px-3 py-3 text-center font-black text-black">
                          {row.games[gameIndex]?.totalScore ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <h2 className="text-xl font-black text-black uppercase mb-4">{t('weeklyReport.strikeSpareByPlayer')}</h2>
          {report.playerPercentages.length === 0 ? (
            <p className="text-black font-bold">{t('weeklyReport.noGamesThisWeek')}</p>
          ) : (
            <div className="border-2 border-black overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="bg-amber-200 border-b-2 border-black">
                    <th className="text-left px-3 py-2 font-black text-black">{t('weeklyReport.player')}</th>
                    <th className="text-center px-3 py-2 font-black text-black">{t('headToHead.strike')}</th>
                    <th className="text-center px-3 py-2 font-black text-black">{t('headToHead.spare')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.playerPercentages.map((player, rowIndex) => (
                    <tr key={player.id} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-orange-50'} border-b border-black`}>
                      <td className="px-3 py-3 font-black text-black">{player.name}</td>
                      <td className="px-3 py-3 text-center font-black text-black">{player.strike.toFixed(1)}%</td>
                      <td className="px-3 py-3 text-center font-black text-black">{player.spare.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6">
          <h2 className="text-xl font-black text-black uppercase mb-3">{t('weeklyReport.shareTitle')}</h2>
          <p className="text-sm font-bold text-black mb-4">{t('weeklyReport.shareSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPdf}
              className="flex-1 bg-white border-4 border-black text-black py-3 font-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {t('weeklyReport.downloadPdf')}
            </button>
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
        </div>

        <div className="mt-4 flex items-center justify-center text-xs font-black text-black uppercase gap-2">
          <Trophy className="w-4 h-4" />
          Powered by BowlUp
        </div>
      </div>
    </div>
  );
}
