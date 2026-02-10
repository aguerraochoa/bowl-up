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
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getWeekStartFromDate = (value: Date): Date => {
  const date = new Date(value);
  const day = date.getDay(); // 0 Sun -> 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getInitialWeekOffset = (allGames: Game[]): number => {
  const currentWeek = getWeekRange(0);
  const hasCurrentWeekGames = allGames.some((game) => isInRange(toDateOnly(game.date), currentWeek.start, currentWeek.end));
  if (hasCurrentWeekGames) return 0;

  let latestWeekStart: Date | null = null;
  allGames.forEach((game) => {
    const gameDate = toDateOnly(game.date);
    if (Number.isNaN(gameDate.getTime())) return;

    const gameWeekStart = getWeekStartFromDate(gameDate);
    if (gameWeekStart.getTime() > currentWeek.start.getTime()) return;

    if (!latestWeekStart || gameWeekStart.getTime() > latestWeekStart.getTime()) {
      latestWeekStart = gameWeekStart;
    }
  });

  const selectedWeekStart = latestWeekStart ?? currentWeek.start;
  const offset = Math.round((selectedWeekStart.getTime() - currentWeek.start.getTime()) / WEEK_MS);
  return Math.min(0, offset);
};

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
      setWeekOffset(getInitialWeekOffset(loadedGames));
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

    const weeklySessionEntries = Array.from(
      weeklyGames.reduce((map, game) => {
        const key = game.gameSessionId || game.id;
        const timestamp = new Date(game.created_at || `${game.date}T00:00:00`);
        const existing = map.get(key);
        if (!existing || timestamp.getTime() < existing.getTime()) {
          map.set(key, timestamp);
        }
        return map;
      }, new Map<string, Date>()),
    )
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([key]) => key);

    const allGamesByPlayer = players
      .map((player) => {
        const playerGames = weeklyGames.filter((game) => game.playerId === player.id);
        if (playerGames.length === 0) return null;

        const scoreBySession = new Map<string, number>();
        playerGames.forEach((game) => {
          const key = game.gameSessionId || game.id;
          if (!scoreBySession.has(key)) {
            scoreBySession.set(key, game.totalScore);
          }
        });

        return {
          id: player.id,
          name: player.name,
          sessionScores: weeklySessionEntries.map((sessionKey) => scoreBySession.get(sessionKey) ?? null),
          average: playerGames.reduce((sum, game) => sum + game.totalScore, 0) / playerGames.length,
        };
      })
      .filter((row): row is { id: string; name: string; sessionScores: Array<number | null>; average: number } => row !== null)
      .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));

    const sessionCount = weeklySessionEntries.length;
    const sessionTotals = weeklySessionEntries.map((sessionKey) =>
      weeklyGames
        .filter((game) => (game.gameSessionId || game.id) === sessionKey)
        .reduce((sum, game) => sum + game.totalScore, 0),
    );
    const playerPercentages = [...playerRows].sort((a, b) => b.strike - a.strike || b.spare - a.spare || a.name.localeCompare(b.name));

    return {
      week,
      weeklyGames,
      hasPreviousWeekStats: weeklyGames.length > 0 && previousGames.length > 0,
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
      sessionCount,
      sessionTotals,
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

  const handleDownloadPdf = async () => {
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

    const allGamesTableHeaders = Array.from({ length: Math.max(1, report.sessionCount) })
      .map((_, index) => `<th>${escapeHtml(`${t('weeklyReport.game')} ${index + 1}`)}</th>`)
      .join('');

    const allGamesTableRows = report.allGamesByPlayer
      .map((row) => {
        const cells = Array.from({ length: Math.max(1, report.sessionCount) }).map((_, index) => {
          const score = row.sessionScores[index];
          return `<td>${score ?? '-'}</td>`;
        });
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            ${cells.join('')}
          </tr>
        `;
      })
      .join('');

    const allGamesTotalsRow = Array.from({ length: Math.max(1, report.sessionCount) }).map((_, index) => {
      const total = report.sessionTotals[index];
      return `<td>${typeof total === 'number' ? total : '-'}</td>`;
    }).join('');

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
          :root {
            --ink: #111;
            --paper: #f7f8fb;
            --coral: #ff5a67;
            --mint: #c5de97;
            --sky: #88b3dc;
            --violet: #6458f5;
          }
          @page { size: A4; margin: 7mm; }
          body {
            font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
            color: var(--ink);
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .wrap {
            width: 100%;
            margin: 0;
            box-sizing: border-box;
            background: #fff;
            border: 2px solid var(--ink);
            border-radius: 0;
            padding: 12px;
          }
          .accent {
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--coral) 0 33%, var(--mint) 33% 66%, var(--sky) 66% 100%);
            margin-bottom: 10px;
          }
          .header {
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 10px;
          }
          .title {
            margin: 0;
            font-size: 31px;
            line-height: 1;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          .subtitle {
            margin: 5px 0 0 0;
            font-size: 13px;
            font-weight: 400;
            color: #202430;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
            margin-bottom: 8px;
          }
          .stat {
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 8px 9px;
            min-height: 72px;
          }
          .stat:nth-child(1) { background: #ffe8ea; }
          .stat:nth-child(2) { background: #eef8dd; }
          .stat:nth-child(3) { background: #e8f2ff; }
          .stat .label {
            font-size: 9px;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .stat .value {
            font-size: 31px;
            font-weight: 400;
            margin-top: 4px;
            line-height: 1;
          }
          .two-col {
            display: grid;
            grid-template-columns: 1fr;
            gap: 7px;
            margin-bottom: 8px;
          }
          .card {
            border: 2px solid var(--ink);
            border-radius: 10px;
            background: var(--paper);
            padding: 7px;
          }
          .card h2 {
            margin: 0 0 10px 0;
            font-size: 14px;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }
          .card table {
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #202530;
            border-right: 0;
            border-bottom: 0;
            padding: 4px 5px;
            text-align: left;
          }
          tr > *:last-child { border-right: 1px solid #202530; }
          tbody tr:last-child td { border-bottom: 1px solid #202530; }
          th {
            background: #1a2232;
            color: #fff;
            text-transform: uppercase;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.35px;
          }
          tbody tr:nth-child(even) td { background: #f3f5fa; }
          .leader {
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 8px;
            margin-bottom: 6px;
            background: #fff;
          }
          .leader:first-child { background: #e8f2ff; }
          .leader:last-child { background: #eef8dd; }
          .leader .k {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 400;
            letter-spacing: 0.4px;
          }
          .leader .v {
            font-size: 18px;
            font-weight: 400;
            margin-top: 3px;
            line-height: 1.1;
          }
          .deltas {
            display: grid;
            grid-template-columns: 1fr;
            gap: 7px;
            margin-bottom: 8px;
          }
          .delta {
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 7px 8px;
            background: #fff;
          }
          .delta .k {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 400;
            letter-spacing: 0.35px;
          }
          .delta .v {
            font-size: 16px;
            font-weight: 400;
            margin-top: 3px;
          }
          .games-by-player {
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 7px;
            margin-bottom: 7px;
            background: var(--paper);
          }
          .games-by-player h2 {
            margin: 0 0 10px 0;
            font-size: 13px;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }
          .games-table th, .games-table td {
            text-align: center;
            font-size: 9px;
            padding: 4px 4px;
          }
          .games-table td:first-child {
            text-align: left;
            font-weight: 400;
            width: 36%;
          }
          .line { font-size: 11px; font-weight: 400; margin: 4px 0; }
          .footer {
            text-align: center;
            font-size: 9px;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-top: 7px;
            color: #222a3b;
          }
          @media screen and (max-width: 820px) {
            body { padding: 6px; }
            .header { flex-direction: column; }
            .title { font-size: 20px; }
            .stats, .two-col, .deltas { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="accent"></div>
          <div class="header">
            <div>
              <h1 class="title">${escapeHtml(t('weeklyReport.title'))}</h1>
              <p class="subtitle">${escapeHtml(formatDateLabel(report.week.start))} - ${escapeHtml(formatDateLabel(report.week.end))}</p>
            </div>
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
                      <tr>
                        <td>${escapeHtml(t('weeklyReport.teamTotal'))}</td>
                        ${allGamesTotalsRow}
                      </tr>
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

    if (isIOS) {
      // iOS Safari can ignore opener-side print callbacks.
      // Trigger print from within the opened document itself with a few retries.
      const htmlWithAutoPrint = html.replace(
        '</body>',
        `
          <script>
            (function () {
              var triggerPrint = function () {
                try {
                  window.focus();
                  window.print();
                } catch (e) {}
              };

              if (document.readyState === 'complete') {
                setTimeout(triggerPrint, 80);
              } else {
                window.addEventListener('load', function () {
                  setTimeout(triggerPrint, 80);
                }, { once: true });
              }

              setTimeout(triggerPrint, 400);
              setTimeout(triggerPrint, 1200);
            })();
          </script>
        </body>
      `,
      );

      const printWindow = window.open('', '_blank', 'width=980,height=720');
      if (!printWindow) return;
      printWindow.document.open();
      printWindow.document.write(htmlWithAutoPrint);
      printWindow.document.close();
      printWindow.focus();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) return;
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
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('weeklyReport.title')}</h1>
                <p className="text-sm sm:text-base text-black font-bold">
                  {formatDateLabel(report.week.start)} - {formatDateLabel(report.week.end)}
                </p>
              </div>
              <button
                onClick={handleDownloadPdf}
                className="bg-white border-4 border-black text-black p-2 md:px-3 md:py-2 font-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                aria-label={t('weeklyReport.downloadPdf')}
              >
                <Download className="w-5 h-5" />
                <span className="hidden md:inline text-sm">{t('weeklyReport.downloadPdf')}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
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
                  <div
                    key={player.id}
                    className={`${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-lime-500' : 'bg-orange-500'} border-4 border-black p-3 flex items-center justify-between`}
                  >
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
                    {Array.from({ length: Math.max(1, report.sessionCount) }).map((_, index) => (
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
                      {Array.from({ length: Math.max(1, report.sessionCount) }).map((_, gameIndex) => (
                        <td key={`${row.id}-${gameIndex}`} className="px-3 py-3 text-center font-black text-black">
                          {row.sessionScores[gameIndex] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-amber-200 border-t-2 border-black">
                    <td className="px-3 py-3 font-black text-black">{t('weeklyReport.teamTotal')}</td>
                    {Array.from({ length: Math.max(1, report.sessionCount) }).map((_, gameIndex) => (
                      <td key={`total-${gameIndex}`} className="px-3 py-3 text-center font-black text-black">
                        {report.sessionTotals[gameIndex] ?? '-'}
                      </td>
                    ))}
                  </tr>
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
