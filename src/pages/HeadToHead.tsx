import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Swords } from 'lucide-react';
import { getGames, getPlayers } from '../utils/storage';
import { calculatePlayerStatsFromData } from '../utils/stats';
import { downloadOrSharePdf, renderPdfBlobFromHtml } from '../utils/pdfExport';
import type { Player, Game } from '../types';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/useSeason';

type ComparisonMetric = {
  id: string;
  label: string;
  aValue: string;
  bValue: string;
  winner: 'a' | 'b' | 'tie';
  countsForScore: boolean;
};

const metricWinner = (a: number, b: number, inverse = false): 'a' | 'b' | 'tie' => {
  if (Math.abs(a - b) < 0.0001) return 'tie';
  if (inverse) return a < b ? 'a' : 'b';
  return a > b ? 'a' : 'b';
};

const playerName = (player: Player | null): string => player?.name || '-';
const toDateOnly = (value: string): Date => new Date(`${value}T00:00:00`);
const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);
const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function HeadToHead() {
  const { querySeason, selectedSeason, currentSeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());

  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => setCurrentLang(e.detail);
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
      const activePlayers = loadedPlayers.filter((player) => !player.deletedAt);
      setPlayers(activePlayers);
      setGames(loadedGames);

      const validDates = loadedGames
        .map((game) => toDateOnly(game.date))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (validDates.length > 0) {
        const minDate = toDateInputValue(validDates[0]);
        const maxDate = toDateInputValue(validDates[validDates.length - 1]);
        setDateFrom((prev) => {
          if (!prev || prev < minDate || prev > maxDate) return minDate;
          return prev;
        });
        setDateTo((prev) => {
          if (!prev || prev < minDate || prev > maxDate) return maxDate;
          return prev;
        });
      } else {
        setDateFrom('');
        setDateTo('');
      }

      if (activePlayers.length >= 2) {
        setPlayerAId((prev) => (prev && activePlayers.some((p) => p.id === prev) ? prev : activePlayers[0].id));
        setPlayerBId((prev) => {
          if (prev && activePlayers.some((p) => p.id === prev) && prev !== activePlayers[0].id) {
            return prev;
          }
          return activePlayers[1].id;
        });
      }

      setIsLoading(false);
    };

    void loadData();
  }, [querySeason]);

  const playerA = players.find((p) => p.id === playerAId) || null;
  const playerB = players.find((p) => p.id === playerBId) || null;

  const gamesInRange = useMemo(
    () =>
      games.filter((game) => {
        if (dateFrom && game.date < dateFrom) return false;
        if (dateTo && game.date > dateTo) return false;
        return true;
      }),
    [games, dateFrom, dateTo],
  );

  const statsA = useMemo(
    () => (playerA ? calculatePlayerStatsFromData(playerA.id, gamesInRange) : null),
    [playerA, gamesInRange],
  );
  const statsB = useMemo(
    () => (playerB ? calculatePlayerStatsFromData(playerB.id, gamesInRange) : null),
    [playerB, gamesInRange],
  );

  const rangeLabel = useMemo(() => {
    void currentLang;
    if (!dateFrom && !dateTo) return t('headToHead.allDates');
    if (!dateFrom || !dateTo) return t('headToHead.allDates');
    const start = toDateOnly(dateFrom);
    const end = toDateOnly(dateTo);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return t('headToHead.allDates');
    return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
  }, [dateFrom, dateTo, currentLang]);

  const comparisonMetrics = useMemo<ComparisonMetric[]>(() => {
    if (!statsA || !statsB) return [];
    return [
      {
        id: 'games_played',
        label: t('headToHead.gamesPlayed'),
        aValue: String(statsA.gamesPlayed),
        bValue: String(statsB.gamesPlayed),
        winner: metricWinner(statsA.gamesPlayed, statsB.gamesPlayed),
        countsForScore: false,
      },
      {
        id: 'average',
        label: t('headToHead.average'),
        aValue: statsA.averageScore.toFixed(1),
        bValue: statsB.averageScore.toFixed(1),
        winner: metricWinner(statsA.averageScore, statsB.averageScore),
        countsForScore: true,
      },
      {
        id: 'high',
        label: t('headToHead.high'),
        aValue: String(statsA.ceiling),
        bValue: String(statsB.ceiling),
        winner: metricWinner(statsA.ceiling, statsB.ceiling),
        countsForScore: true,
      },
      {
        id: 'best_low',
        label: t('headToHead.low'),
        aValue: String(statsA.floor),
        bValue: String(statsB.floor),
        winner: metricWinner(statsA.floor, statsB.floor),
        countsForScore: true,
      },
      {
        id: 'strike',
        label: t('headToHead.strike'),
        aValue: `${statsA.strikePercentage.toFixed(1)}%`,
        bValue: `${statsB.strikePercentage.toFixed(1)}%`,
        winner: metricWinner(statsA.strikePercentage, statsB.strikePercentage),
        countsForScore: true,
      },
      {
        id: 'spare',
        label: t('headToHead.spare'),
        aValue: `${statsA.sparePercentage.toFixed(1)}%`,
        bValue: `${statsB.sparePercentage.toFixed(1)}%`,
        winner: metricWinner(statsA.sparePercentage, statsB.sparePercentage),
        countsForScore: true,
      },
      {
        id: 'tenth_frame',
        label: t('headToHead.tenthFrame'),
        aValue: statsA.averageTenthFrame.toFixed(1),
        bValue: statsB.averageTenthFrame.toFixed(1),
        winner: metricWinner(statsA.averageTenthFrame, statsB.averageTenthFrame),
        countsForScore: true,
      },
      {
        id: 'games_200',
        label: t('headToHead.games200'),
        aValue: String(statsA.gamesAbove200),
        bValue: String(statsB.gamesAbove200),
        winner: metricWinner(statsA.gamesAbove200, statsB.gamesAbove200),
        countsForScore: true,
      },
    ];
  }, [statsA, statsB]);

  const summary = useMemo(() => {
    const tally = comparisonMetrics.reduce(
      (acc, metric) => {
        if (!metric.countsForScore) return acc;
        if (metric.winner === 'a') acc.a += 1;
        if (metric.winner === 'b') acc.b += 1;
        if (metric.winner === 'tie') acc.tie += 1;
        return acc;
      },
      { a: 0, b: 0, tie: 0 },
    );
    return tally;
  }, [comparisonMetrics]);

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    if (dateTo && value && value > dateTo) {
      setDateTo(value);
    }
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    if (dateFrom && value && value < dateFrom) {
      setDateFrom(value);
    }
  };

  const resetDateRange = () => {
    const validDates = games
      .map((game) => toDateOnly(game.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (validDates.length === 0) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    setDateFrom(toDateInputValue(validDates[0]));
    setDateTo(toDateInputValue(validDates[validDates.length - 1]));
  };

  const handleDownloadPdf = async () => {
    if (!playerA || !playerB || !statsA || !statsB) return;

    const metricRows = comparisonMetrics
      .map((metric) => {
        const isScoredMetric = metric.countsForScore;
        const aWin = isScoredMetric && metric.winner === 'a';
        const bWin = isScoredMetric && metric.winner === 'b';
        return `
          <tr>
            <td>${escapeHtml(metric.label)}</td>
            <td class="${aWin ? 'cell-win-a' : ''}">${escapeHtml(metric.aValue)}</td>
            <td class="${bWin ? 'cell-win-b' : ''}">${escapeHtml(metric.bValue)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t('headToHead.pdfTitle'))}</title>
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
            margin: 0;
            padding: 0;
            color: var(--ink);
            background: #fff;
          }
          .wrap {
            width: 100%;
            margin: 0;
            background: #fff;
            border: 2px solid var(--ink);
            border-radius: 0;
            padding: 12px;
            box-sizing: border-box;
          }
          .accent {
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--coral) 0 33%, var(--mint) 33% 66%, var(--sky) 66% 100%);
            margin-bottom: 10px;
          }
          .head {
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 31px;
            margin: 0;
            line-height: 1;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          p {
            margin: 5px 0 0 0;
            font-size: 12px;
            font-weight: 400;
            color: #202430;
          }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
          .card {
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 9px;
            background: var(--paper);
          }
          .card-a { background: #e8f2ff; }
          .card-b { background: #ffe8ea; }
          .name { font-size: 22px; line-height: 1; font-weight: 400; margin-bottom: 6px; text-transform: uppercase; }
          .metric-line { font-size: 12px; font-weight: 400; margin: 4px 0; }
          .metric-line span { font-weight: 400; font-size: 18px; }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 11px;
            background: #fff;
            border: 2px solid var(--ink);
            border-radius: 10px;
            overflow: hidden;
          }
          th, td {
            border-bottom: 1px solid #222a37;
            padding: 6px 8px;
            text-align: left;
            vertical-align: middle;
          }
          th {
            background: #1a2232;
            color: #fff;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.4px;
            font-weight: 800;
          }
          tbody tr:nth-child(even) td { background: #f3f5fa; }
          tbody tr:last-child td { border-bottom: 0; }
          .cell-win-a, .cell-win-b { color: #0f7a2f; font-weight: 400; }
          .summary {
            margin-top: 8px;
            border: 2px solid var(--ink);
            border-radius: 10px;
            padding: 8px;
            background: #eef8dd;
            font-size: 12px;
            font-weight: 400;
            text-align: center;
            letter-spacing: 0.25px;
          }
          @media screen and (max-width: 760px) {
            body { padding: 6px; }
            .head { flex-direction: column; }
            .grid { grid-template-columns: 1fr; }
            h1 { font-size: 22px; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="accent"></div>
          <div class="head">
            <div>
              <h1>${escapeHtml(t('headToHead.title'))}</h1>
              <p>${escapeHtml(t('headToHead.dateRange'))}: ${escapeHtml(rangeLabel)}</p>
            </div>
          </div>
          <div class="grid">
            <div class="card card-a">
              <div class="name">${escapeHtml(playerA.name)}</div>
              <div class="metric-line">${escapeHtml(t('headToHead.average'))}: <span>${statsA.averageScore.toFixed(1)}</span></div>
              <div class="metric-line">${escapeHtml(t('headToHead.strike'))}: <span>${statsA.strikePercentage.toFixed(1)}%</span></div>
              <div class="metric-line">${escapeHtml(t('headToHead.spare'))}: <span>${statsA.sparePercentage.toFixed(1)}%</span></div>
            </div>
            <div class="card card-b">
              <div class="name">${escapeHtml(playerB.name)}</div>
              <div class="metric-line">${escapeHtml(t('headToHead.average'))}: <span>${statsB.averageScore.toFixed(1)}</span></div>
              <div class="metric-line">${escapeHtml(t('headToHead.strike'))}: <span>${statsB.strikePercentage.toFixed(1)}%</span></div>
              <div class="metric-line">${escapeHtml(t('headToHead.spare'))}: <span>${statsB.sparePercentage.toFixed(1)}%</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t('headToHead.metric'))}</th>
                <th>${escapeHtml(playerA.name)}</th>
                <th>${escapeHtml(playerB.name)}</th>
              </tr>
            </thead>
            <tbody>
              ${metricRows}
            </tbody>
          </table>
          <div class="summary">${escapeHtml(playerA.name)}: ${summary.a} | ${escapeHtml(playerB.name)}: ${summary.b} | ${escapeHtml(t('headToHead.tie'))}: ${summary.tie}</div>
        </div>
      </body>
      </html>
    `;

    try {
      const pdfBlob = await renderPdfBlobFromHtml({
        html,
        selector: '.wrap',
        orientation: 'p',
        format: 'a4',
      });

      const sanitizeName = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'jugador';
      const startLabel = dateFrom || 'all';
      const endLabel = dateTo || 'all';

      await downloadOrSharePdf(
        pdfBlob,
        `cara-a-cara-${sanitizeName(playerA.name)}-vs-${sanitizeName(playerB.name)}-${startLabel}-${endLabel}.pdf`,
        t('headToHead.title'),
      );
    } catch (error) {
      console.error('Error downloading head-to-head PDF:', error);
      alert('Could not download PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-black font-bold text-base">{t('headToHead.loading')}</p>
        </div>
      </div>
    );
  }

  if (players.length < 2) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center px-4">
        <div className="bg-white border-4 border-black p-6 text-center max-w-md">
          <p className="text-black font-black text-lg">{t('headToHead.needTwoPlayers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">{t('headToHead.title')}</h1>
              <p className="text-sm sm:text-base text-black font-bold">{t('headToHead.subtitle')}</p>
              <p className="text-xs sm:text-sm text-black font-bold mt-1">
                {t('headToHead.seasonScope')}: {selectedSeason === 'ALL' ? t('profile.allSeasons') : (selectedSeason || currentSeason)}
              </p>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={!playerA || !playerB || playerA.id === playerB.id}
              className="bg-amber-400 border-4 border-black text-black px-4 py-2 font-black hover:bg-amber-500 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {t('headToHead.downloadPdf')}
            </button>
          </div>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
          <p className="text-xs uppercase font-black text-black mb-3">{t('headToHead.dateRange')}</p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <div className="min-w-0">
              <label className="block text-xs uppercase font-black text-black mb-2">{t('headToHead.startDate')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs uppercase font-black text-black mb-2">{t('headToHead.endDate')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white"
              />
            </div>
            <button
              onClick={resetDateRange}
              className="h-fit self-end bg-white border-4 border-black text-black px-4 py-3 font-black hover:bg-gray-100 transition-all"
            >
              {t('headToHead.allDates')}
            </button>
          </div>
          <p className="text-xs sm:text-sm text-black font-bold mt-3">
            {rangeLabel} · {t('headToHead.gamesInRange')}: {gamesInRange.length}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <label className="block text-xs uppercase font-black text-black mb-2">{t('headToHead.playerA')}</label>
            <select
              value={playerAId}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="w-full px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <label className="block text-xs uppercase font-black text-black mb-2">{t('headToHead.playerB')}</label>
            <select
              value={playerBId}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="w-full px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </div>
        </div>

        {playerA && playerB && playerA.id !== playerB.id && statsA && statsB ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white border-4 border-black overflow-hidden">
                <div className="bg-amber-400 border-b-4 border-black px-4 py-3">
                  <p className="text-xs uppercase font-black text-black">{t('headToHead.contender')}</p>
                  <h2 className="text-2xl font-black text-black uppercase">{playerName(playerA)}</h2>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm font-bold text-black">{t('headToHead.average')}: <span className="font-black">{statsA.averageScore.toFixed(1)}</span></p>
                  <p className="text-sm font-bold text-black">{t('headToHead.strike')}: <span className="font-black">{statsA.strikePercentage.toFixed(1)}%</span></p>
                  <p className="text-sm font-bold text-black">{t('headToHead.spare')}: <span className="font-black">{statsA.sparePercentage.toFixed(1)}%</span></p>
                </div>
              </div>
              <div className="bg-white border-4 border-black overflow-hidden">
                <div className="bg-orange-500 border-b-4 border-black px-4 py-3">
                  <p className="text-xs uppercase font-black text-black">{t('headToHead.contender')}</p>
                  <h2 className="text-2xl font-black text-black uppercase">{playerName(playerB)}</h2>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm font-bold text-black">{t('headToHead.average')}: <span className="font-black">{statsB.averageScore.toFixed(1)}</span></p>
                  <p className="text-sm font-bold text-black">{t('headToHead.strike')}: <span className="font-black">{statsB.strikePercentage.toFixed(1)}%</span></p>
                  <p className="text-sm font-bold text-black">{t('headToHead.spare')}: <span className="font-black">{statsB.sparePercentage.toFixed(1)}%</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Swords className="w-5 h-5 text-black" />
                <h3 className="text-xl font-black text-black uppercase">{t('headToHead.metricBreakdown')}</h3>
              </div>
              <div className="border-4 border-black overflow-hidden">
                {comparisonMetrics.map((metric, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-orange-50';
                  const isInfoOnly = !metric.countsForScore;
                  return (
                    <div key={metric.id} className={`${rowBg} border-b-2 border-black last:border-b-0`}>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-4 sm:px-5">
                        <div className="text-left">
                          <p className={`text-3xl sm:text-4xl font-black ${metric.winner === 'a' && !isInfoOnly ? 'text-lime-600' : 'text-black'}`}>
                            {metric.aValue}
                          </p>
                          <p className="text-xs font-black uppercase text-black mt-1">{playerA.name}</p>
                        </div>

                        <div className="text-center px-2">
                          <p className="text-lg sm:text-2xl font-black text-black">{metric.label}</p>
                        </div>

                        <div className="text-right">
                          <p className={`text-3xl sm:text-4xl font-black ${metric.winner === 'b' && !isInfoOnly ? 'text-lime-600' : 'text-black'}`}>
                            {metric.bValue}
                          </p>
                          <p className="text-xs font-black uppercase text-black mt-1">{playerB.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-amber-400 border-4 border-black p-4 text-center">
                <p className="text-xs uppercase font-black text-black">{playerA.name}</p>
                <p className="text-3xl font-black text-black">{summary.a}</p>
              </div>
              <div className="bg-white border-4 border-black p-4 text-center">
                <p className="text-xs uppercase font-black text-black">{t('headToHead.tie')}</p>
                <p className="text-3xl font-black text-black">{summary.tie}</p>
              </div>
              <div className="bg-orange-500 border-4 border-black p-4 text-center">
                <p className="text-xs uppercase font-black text-black">{playerB.name}</p>
                <p className="text-3xl font-black text-black">{summary.b}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border-4 border-black p-6 text-center">
            <p className="text-black font-black">{t('headToHead.selectDifferentPlayers')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
