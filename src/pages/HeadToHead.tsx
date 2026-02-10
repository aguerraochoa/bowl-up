import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Swords } from 'lucide-react';
import { getGames, getPlayers } from '../utils/storage';
import { calculatePlayerStatsFromData } from '../utils/stats';
import type { Player, Game } from '../types';
import { t, getLanguage } from '../i18n';
import { useSeason } from '../contexts/useSeason';

type ComparisonMetric = {
  label: string;
  aValue: string;
  bValue: string;
  winner: 'a' | 'b' | 'tie';
};

const metricWinner = (a: number, b: number, inverse = false): 'a' | 'b' | 'tie' => {
  if (Math.abs(a - b) < 0.0001) return 'tie';
  if (inverse) return a < b ? 'a' : 'b';
  return a > b ? 'a' : 'b';
};

const playerName = (player: Player | null): string => player?.name || '-';

export default function HeadToHead() {
  const { querySeason, selectedSeason, currentSeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
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

  const statsA = useMemo(
    () => (playerA ? calculatePlayerStatsFromData(playerA.id, games) : null),
    [playerA, games],
  );
  const statsB = useMemo(
    () => (playerB ? calculatePlayerStatsFromData(playerB.id, games) : null),
    [playerB, games],
  );

  const comparisonMetrics = useMemo<ComparisonMetric[]>(() => {
    if (!statsA || !statsB) return [];
    return [
      {
        label: t('headToHead.gamesPlayed'),
        aValue: String(statsA.gamesPlayed),
        bValue: String(statsB.gamesPlayed),
        winner: metricWinner(statsA.gamesPlayed, statsB.gamesPlayed),
      },
      {
        label: t('headToHead.average'),
        aValue: statsA.averageScore.toFixed(1),
        bValue: statsB.averageScore.toFixed(1),
        winner: metricWinner(statsA.averageScore, statsB.averageScore),
      },
      {
        label: t('headToHead.high'),
        aValue: String(statsA.ceiling),
        bValue: String(statsB.ceiling),
        winner: metricWinner(statsA.ceiling, statsB.ceiling),
      },
      {
        label: t('headToHead.low'),
        aValue: String(statsA.floor),
        bValue: String(statsB.floor),
        winner: metricWinner(statsA.floor, statsB.floor, true),
      },
      {
        label: t('headToHead.strike'),
        aValue: `${statsA.strikePercentage.toFixed(1)}%`,
        bValue: `${statsB.strikePercentage.toFixed(1)}%`,
        winner: metricWinner(statsA.strikePercentage, statsB.strikePercentage),
      },
      {
        label: t('headToHead.spare'),
        aValue: `${statsA.sparePercentage.toFixed(1)}%`,
        bValue: `${statsB.sparePercentage.toFixed(1)}%`,
        winner: metricWinner(statsA.sparePercentage, statsB.sparePercentage),
      },
      {
        label: t('headToHead.recent10'),
        aValue: statsA.recentAverage.toFixed(1),
        bValue: statsB.recentAverage.toFixed(1),
        winner: metricWinner(statsA.recentAverage, statsB.recentAverage),
      },
      {
        label: t('headToHead.tenthFrame'),
        aValue: statsA.averageTenthFrame.toFixed(1),
        bValue: statsB.averageTenthFrame.toFixed(1),
        winner: metricWinner(statsA.averageTenthFrame, statsB.averageTenthFrame),
      },
      {
        label: t('headToHead.games200'),
        aValue: String(statsA.gamesAbove200),
        bValue: String(statsB.gamesAbove200),
        winner: metricWinner(statsA.gamesAbove200, statsB.gamesAbove200),
      },
    ];
  }, [statsA, statsB]);

  const summary = useMemo(() => {
    const tally = comparisonMetrics.reduce(
      (acc, metric) => {
        if (metric.winner === 'a') acc.a += 1;
        if (metric.winner === 'b') acc.b += 1;
        if (metric.winner === 'tie') acc.tie += 1;
        return acc;
      },
      { a: 0, b: 0, tie: 0 },
    );
    return tally;
  }, [comparisonMetrics]);

  const generatePdf = () => {
    if (!playerA || !playerB || !statsA || !statsB) return;

    const seasonLabel = selectedSeason === 'ALL' ? t('profile.allSeasons') : (selectedSeason || currentSeason);
    const metricRows = comparisonMetrics
      .map((metric) => {
        const winner =
          metric.winner === 'tie'
            ? t('headToHead.tie')
            : metric.winner === 'a'
            ? playerA.name
            : playerB.name;
        return `
          <tr>
            <td>${metric.label}</td>
            <td>${metric.aValue}</td>
            <td>${metric.bValue}</td>
            <td>${winner}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${t('headToHead.pdfTitle')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { font-size: 28px; margin-bottom: 4px; text-transform: uppercase; }
          p { margin: 0 0 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .card { border: 2px solid #111; padding: 12px; }
          .name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #111; padding: 8px; text-align: left; }
          th { background: #f2f2f2; text-transform: uppercase; font-size: 12px; }
          .summary { margin-top: 16px; padding: 12px; border: 2px solid #111; background: #fff4d6; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${t('headToHead.title')}</h1>
        <p>${t('headToHead.seasonScope')}: ${seasonLabel}</p>
        <div class="grid">
          <div class="card">
            <div class="name">${playerA.name}</div>
            <div>${t('headToHead.average')}: ${statsA.averageScore.toFixed(1)}</div>
            <div>${t('headToHead.strike')}: ${statsA.strikePercentage.toFixed(1)}%</div>
            <div>${t('headToHead.spare')}: ${statsA.sparePercentage.toFixed(1)}%</div>
          </div>
          <div class="card">
            <div class="name">${playerB.name}</div>
            <div>${t('headToHead.average')}: ${statsB.averageScore.toFixed(1)}</div>
            <div>${t('headToHead.strike')}: ${statsB.strikePercentage.toFixed(1)}%</div>
            <div>${t('headToHead.spare')}: ${statsB.sparePercentage.toFixed(1)}%</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>${t('headToHead.metric')}</th>
              <th>${playerA.name}</th>
              <th>${playerB.name}</th>
              <th>${t('headToHead.winner')}</th>
            </tr>
          </thead>
          <tbody>
            ${metricRows}
          </tbody>
        </table>
        <div class="summary">${playerA.name}: ${summary.a} | ${playerB.name}: ${summary.b} | ${t('headToHead.tie')}: ${summary.tie}</div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
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
            </div>
            <button
              onClick={generatePdf}
              disabled={!playerA || !playerB || playerA.id === playerB.id}
              className="bg-amber-400 border-4 border-black text-black px-4 py-2 font-black hover:bg-amber-500 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {t('headToHead.downloadPdf')}
            </button>
          </div>
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
              <div className="bg-white border-4 border-black p-4 sm:p-6">
                <p className="text-xs uppercase font-black text-black">{t('headToHead.contender')}</p>
                <h2 className="text-2xl font-black text-black uppercase">{playerName(playerA)}</h2>
                <p className="text-sm font-bold text-black mt-2">{t('headToHead.average')}: {statsA.averageScore.toFixed(1)}</p>
                <p className="text-sm font-bold text-black">{t('headToHead.strike')}: {statsA.strikePercentage.toFixed(1)}%</p>
                <p className="text-sm font-bold text-black">{t('headToHead.spare')}: {statsA.sparePercentage.toFixed(1)}%</p>
              </div>
              <div className="bg-white border-4 border-black p-4 sm:p-6">
                <p className="text-xs uppercase font-black text-black">{t('headToHead.contender')}</p>
                <h2 className="text-2xl font-black text-black uppercase">{playerName(playerB)}</h2>
                <p className="text-sm font-bold text-black mt-2">{t('headToHead.average')}: {statsB.averageScore.toFixed(1)}</p>
                <p className="text-sm font-bold text-black">{t('headToHead.strike')}: {statsB.strikePercentage.toFixed(1)}%</p>
                <p className="text-sm font-bold text-black">{t('headToHead.spare')}: {statsB.sparePercentage.toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-4 sm:p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Swords className="w-5 h-5 text-black" />
                <h3 className="text-xl font-black text-black uppercase">{t('headToHead.metricBreakdown')}</h3>
              </div>
              <div className="space-y-2">
                {comparisonMetrics.map((metric) => (
                  <div key={metric.label} className="grid grid-cols-[1fr_auto_auto] gap-3 border-4 border-black p-3 items-center bg-white">
                    <div>
                      <p className="font-black text-black">{metric.label}</p>
                      <p className="text-xs font-bold text-black">
                        {metric.winner === 'tie'
                          ? t('headToHead.tie')
                          : `${t('headToHead.winner')}: ${metric.winner === 'a' ? playerA.name : playerB.name}`}
                      </p>
                    </div>
                    <p className={`font-black ${metric.winner === 'a' ? 'text-lime-600' : 'text-black'}`}>{metric.aValue}</p>
                    <p className={`font-black ${metric.winner === 'b' ? 'text-lime-600' : 'text-black'}`}>{metric.bValue}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-400 border-4 border-black p-4">
              <p className="font-black text-black">
                {playerA.name}: {summary.a} | {playerB.name}: {summary.b} | {t('headToHead.tie')}: {summary.tie}
              </p>
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
