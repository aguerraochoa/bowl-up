import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getGames, getPlayers } from '../utils/storage';
import { calculateTeamStatsFromData, calculatePlayerStatsFromData } from '../utils/stats';
import { calculateSpareSummary, calculateStrikeSummary } from '../utils/scoring';
import type { Game, Player } from '../types';
import { getLanguage, t } from '../i18n';
import { useSeason } from '../contexts/useSeason';

type ComparisonMetric = {
  id: string;
  label: string;
  aValue: string;
  bValue: string;
  winner: 'a' | 'b' | 'tie';
  countsForScore: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toDateOnly = (value: string): Date => new Date(`${value}T00:00:00`);
const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isInRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

const getWeekStartFromDate = (value: Date): Date => {
  const date = new Date(value);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
};

const metricWinner = (a: number, b: number, inverse = false): 'a' | 'b' | 'tie' => {
  if (Math.abs(a - b) < 0.0001) return 'tie';
  if (inverse) return a < b ? 'a' : 'b';
  return a > b ? 'a' : 'b';
};

const formatSigned = (value: number, suffix = ''): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;

const buildWeeklyHtml = (input: {
  weekStart: Date;
  weekEnd: Date;
  weeklyGames: Game[];
  hasPreviousWeekStats: boolean;
  avgDelta: number;
  strikeDelta: number;
  spareDelta: number;
  teamAverage: number;
  bestSession: number | null;
  topPlayers: Array<{ name: string; games: number; average: number; best: number }>;
  strikeLeader: { name: string; strike: number } | null;
  spareLeader: { name: string; spare: number } | null;
  allGamesByPlayer: Array<{ name: string; sessionScores: Array<number | null> }>;
  sessionCount: number;
  sessionTotals: number[];
  playerPercentages: Array<{
    name: string;
    strike: number;
    spare: number;
    strikes: number;
    strikeOpportunities: number;
    spares: number;
    spareOpportunities: number;
    opens: number;
  }>;
}): string => {
  const topPlayersHtml = input.topPlayers.length
    ? input.topPlayers
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

  const allGamesTableHeaders = Array.from({ length: Math.max(1, input.sessionCount) })
    .map((_, index) => `<th>${escapeHtml(`${t('weeklyReport.game')} ${index + 1}`)}</th>`)
    .join('');

  const allGamesTableRows = input.allGamesByPlayer
    .map((row) => {
      const cells = Array.from({ length: Math.max(1, input.sessionCount) }).map((_, index) => {
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

  const allGamesTotalsRow = Array.from({ length: Math.max(1, input.sessionCount) }).map((_, index) => {
    const total = input.sessionTotals[index];
    return `<td>${typeof total === 'number' ? total : '-'}</td>`;
  }).join('');

  const playerPercentRows = input.playerPercentages.length
    ? input.playerPercentages
        .map(
          (player) => `
            <tr>
              <td>${escapeHtml(player.name)}</td>
              <td>${player.strike.toFixed(1)}%</td>
              <td>${player.spare.toFixed(1)}%</td>
              <td>${player.strikes}/${player.strikeOpportunities}</td>
              <td>${player.spares}/${player.spareOpportunities}</td>
              <td>${player.opens}</td>
            </tr>
          `,
        )
        .join('')
    : `<tr><td colspan="6">${escapeHtml(t('weeklyReport.noGamesThisWeek'))}</td></tr>`;

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
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
         @page { size: A4; margin: 4mm; }
        * { box-sizing: border-box; }
        body {
          font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
          color: var(--ink);
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .wrap {
          width: 100%;
          min-height: 100%;
          margin: 0;
          background: #fff;
          padding: 2.4mm;
          display: flex;
          flex-direction: column;
          gap: 2.4mm;
        }
        .accent {
          height: 3.2mm;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--coral) 0 33%, var(--mint) 33% 66%, var(--sky) 66% 100%);
        }
        .header {
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
        }
        .title {
          margin: 0;
          font-size: 46px;
          line-height: 0.98;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          font-weight: 900;
        }
        .subtitle {
          margin: 4px 0 0 0;
          font-size: 18px;
          font-weight: 400;
          color: #202430;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.4mm;
        }
        .stat {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.8mm 3mm;
          min-height: 23mm;
        }
        .stat:nth-child(1) { background: #ffe8ea; }
        .stat:nth-child(2) { background: #eef8dd; }
        .stat:nth-child(3) { background: #e8f2ff; }
        .stat .label {
          font-size: 11px;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }
        .stat .value {
          font-size: 46px;
          font-weight: 400;
          margin-top: 3px;
          line-height: 1;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1.45fr 1fr;
          gap: 2.4mm;
        }
        .card {
          border: 2px solid var(--ink);
          border-radius: 8px;
          background: var(--paper);
          padding: 2.6mm;
          min-height: 52mm;
          overflow: hidden;
        }
        .card h2 {
          margin: 0 0 2.2mm 0;
          font-size: 16px;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 0.25px;
          font-weight: 900;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #202530;
          border-right: 0;
          border-bottom: 0;
          padding: 1.7mm 1.9mm;
          text-align: left;
          overflow-wrap: anywhere;
        }
        tr > *:last-child { border-right: 1px solid #202530; }
        tbody tr:last-child td { border-bottom: 1px solid #202530; }
        th {
          background: #1a2232;
          color: #fff;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.25px;
          white-space: nowrap;
        }
        tbody tr:nth-child(even) td { background: #f3f5fa; }

        .top-players-table col.col-rank { width: 8%; }
        .top-players-table col.col-games { width: 17%; }
        .top-players-table col.col-avg { width: 19%; }
        .top-players-table col.col-high { width: 17%; }
        .top-players-table th:nth-child(1),
        .top-players-table td:nth-child(1),
        .top-players-table th:nth-child(3),
        .top-players-table td:nth-child(3),
        .top-players-table th:nth-child(4),
        .top-players-table td:nth-child(4),
        .top-players-table th:nth-child(5),
        .top-players-table td:nth-child(5) {
          text-align: center;
          white-space: nowrap;
        }

        .leader {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.6mm;
          margin-bottom: 2.4mm;
          background: #fff;
        }
        .leader:last-child { margin-bottom: 0; }
        .leader:first-child { background: #e8f2ff; }
        .leader:last-child { background: #eef8dd; }
        .leader .k {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        .leader .v {
          font-size: 31px;
          font-weight: 400;
          margin-top: 1.2mm;
          line-height: 1.06;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .deltas {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.4mm;
        }
        .delta {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.5mm;
          background: #fff;
          min-height: 20mm;
        }
        .delta .k {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 400;
          letter-spacing: 0.25px;
        }
        .delta .v {
          font-size: 30px;
          font-weight: 400;
          margin-top: 1.4mm;
          line-height: 1;
        }

        .games-by-player {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.6mm;
          background: var(--paper);
          min-height: 52mm;
          overflow: hidden;
        }
        .games-by-player h2 {
          margin: 0 0 2.2mm 0;
          font-size: 16px;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 0.25px;
          font-weight: 900;
        }
        .games-table th, .games-table td {
          text-align: center;
          font-size: 11px;
          padding: 1.35mm 1.7mm;
        }
        .games-table td:first-child {
          text-align: left;
          font-weight: 400;
          width: 34%;
          white-space: nowrap;
        }
        .line { font-size: 13px; font-weight: 400; margin: 0.8mm 0; }
        .footer {
          text-align: center;
          font-size: 10px;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          margin-top: auto;
          color: #222a3b;
          padding-top: 1.5mm;
        }
        @media screen and (max-width: 820px) {
          .header { flex-direction: column; }
          .title { font-size: 24px; }
          .subtitle { font-size: 14px; }
          .stats, .two-col, .deltas { grid-template-columns: 1fr; }
          .stat .value,
          .leader .v,
          .delta .v { font-size: 28px; }
          .card h2,
          .games-by-player h2 { font-size: 18px; }
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="accent"></div>
        <div class="header">
          <div>
            <h1 class="title">${escapeHtml(t('weeklyReport.title'))}</h1>
            <p class="subtitle">${escapeHtml(formatDateLabel(input.weekStart))} - ${escapeHtml(formatDateLabel(input.weekEnd))}</p>
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="label">${escapeHtml(t('weeklyReport.games'))}</div>
            <div class="value">${input.weeklyGames.length}</div>
          </div>
          <div class="stat">
            <div class="label">${escapeHtml(t('weeklyReport.teamAverage'))}</div>
            <div class="value">${input.teamAverage.toFixed(1)}</div>
          </div>
          <div class="stat">
            <div class="label">${escapeHtml(t('weeklyReport.bestSession'))}</div>
            <div class="value">${input.bestSession ?? '-'}</div>
          </div>
        </div>

        <div class="two-col">
          <div class="card">
            <h2>${escapeHtml(t('weeklyReport.topPerformers'))}</h2>
            <table class="top-players-table">
              <colgroup>
                <col class="col-rank" />
                <col />
                <col class="col-games" />
                <col class="col-avg" />
                <col class="col-high" />
              </colgroup>
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
              <div class="v">${escapeHtml(input.strikeLeader ? `${input.strikeLeader.name} (${input.strikeLeader.strike.toFixed(1)}%)` : '-')}</div>
            </div>
            <div class="leader">
              <div class="k">${escapeHtml(t('weeklyReport.spareLeader'))}</div>
              <div class="v">${escapeHtml(input.spareLeader ? `${input.spareLeader.name} (${input.spareLeader.spare.toFixed(1)}%)` : '-')}</div>
            </div>
          </div>
        </div>

        ${
          input.hasPreviousWeekStats
            ? `
            <div class="deltas">
              <div class="delta">
                <div class="k">${escapeHtml(t('weeklyReport.teamAverage'))}</div>
                <div class="v">${formatSigned(input.avgDelta)}</div>
              </div>
              <div class="delta">
                <div class="k">${escapeHtml(t('weeklyReport.strikeDelta'))}</div>
                <div class="v">${formatSigned(input.strikeDelta, '%')}</div>
              </div>
              <div class="delta">
                <div class="k">${escapeHtml(t('weeklyReport.spareDelta'))}</div>
                <div class="v">${formatSigned(input.spareDelta, '%')}</div>
              </div>
            </div>
            `
            : ''
        }

        <div class="games-by-player">
          <h2>${escapeHtml(t('weeklyReport.allGamesByPlayer'))}</h2>
          ${
            input.weeklyGames.length === 0
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
                <th>${escapeHtml(t('players.strikes'))}</th>
                <th>${escapeHtml(t('players.spares'))}</th>
                <th>${escapeHtml(t('weeklyReport.opens'))}</th>
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
};

const buildHeadToHeadHtml = (input: {
  playerA: Player;
  playerB: Player;
  statsA: ReturnType<typeof calculatePlayerStatsFromData>;
  statsB: ReturnType<typeof calculatePlayerStatsFromData>;
  rangeLabel: string;
  comparisonMetrics: ComparisonMetric[];
  summary: { a: number; b: number; tie: number };
}): string => {
  const metricRows = input.comparisonMetrics
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

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
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
         @page { size: A4; margin: 4mm; }
        * { box-sizing: border-box; }
        body {
          font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: var(--ink);
          background: #fff;
        }
        .wrap {
          width: 100%;
          min-height: 100%;
          margin: 0;
          background: #fff;
          padding: 2.4mm;
          display: flex;
          flex-direction: column;
          gap: 2.4mm;
        }
        .accent {
          height: 3.2mm;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--coral) 0 33%, var(--mint) 33% 66%, var(--sky) 66% 100%);
        }
        .head {
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
        }
        h1 {
          font-size: 46px;
          margin: 0;
          line-height: 0.98;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          font-weight: 900;
        }
        p {
          margin: 4px 0 0 0;
          font-size: 18px;
          font-weight: 400;
          color: #202430;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.4mm; }
        .card {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.8mm;
          background: var(--paper);
          min-height: 46mm;
          overflow: hidden;
        }
        .card-a { background: #e8f2ff; }
        .card-b { background: #ffe8ea; }
        .name {
          font-size: 30px;
          line-height: 1;
          font-weight: 400;
          margin-bottom: 2.2mm;
          text-transform: uppercase;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .metric-line { font-size: 16px; font-weight: 400; margin: 1.1mm 0; }
        .metric-line span { font-weight: 400; font-size: 26px; }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          background: #fff;
          border: 2px solid var(--ink);
          border-radius: 8px;
          overflow: hidden;
          table-layout: fixed;
        }
        th, td {
          border-bottom: 1px solid #222a37;
          padding: 1.8mm 2mm;
          text-align: left;
          vertical-align: middle;
          overflow-wrap: anywhere;
        }
        th {
          background: #1a2232;
          color: #fff;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.25px;
          font-weight: 800;
          white-space: nowrap;
        }
        tbody tr:nth-child(even) td { background: #f3f5fa; }
        tbody tr:last-child td { border-bottom: 0; }
        .cell-win-a, .cell-win-b { color: #0f7a2f; font-weight: 400; }
        .summary {
          border: 2px solid var(--ink);
          border-radius: 8px;
          padding: 2.4mm;
          background: #eef8dd;
          font-size: 16px;
          font-weight: 400;
          text-align: center;
          letter-spacing: 0.2px;
          margin-top: auto;
          overflow-wrap: anywhere;
        }
        @media screen and (max-width: 760px) {
          .head { flex-direction: column; }
          .grid { grid-template-columns: 1fr; }
          h1 { font-size: 26px; }
          p { font-size: 14px; }
          .name { font-size: 24px; }
          .metric-line { font-size: 14px; }
          .metric-line span { font-size: 22px; }
          .summary { font-size: 14px; margin-top: 2mm; }
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="accent"></div>
        <div class="head">
          <div>
            <h1>${escapeHtml(t('headToHead.title'))}</h1>
            <p>${escapeHtml(t('headToHead.dateRange'))}: ${escapeHtml(input.rangeLabel)}</p>
          </div>
        </div>
        <div class="grid">
          <div class="card card-a">
            <div class="name">${escapeHtml(input.playerA.name)}</div>
            <div class="metric-line">${escapeHtml(t('headToHead.average'))}: <span>${input.statsA.averageScore.toFixed(1)}</span></div>
            <div class="metric-line">${escapeHtml(t('headToHead.strike'))}: <span>${input.statsA.strikePercentage.toFixed(1)}%</span></div>
            <div class="metric-line">${escapeHtml(t('headToHead.spare'))}: <span>${input.statsA.sparePercentage.toFixed(1)}%</span></div>
          </div>
          <div class="card card-b">
            <div class="name">${escapeHtml(input.playerB.name)}</div>
            <div class="metric-line">${escapeHtml(t('headToHead.average'))}: <span>${input.statsB.averageScore.toFixed(1)}</span></div>
            <div class="metric-line">${escapeHtml(t('headToHead.strike'))}: <span>${input.statsB.strikePercentage.toFixed(1)}%</span></div>
            <div class="metric-line">${escapeHtml(t('headToHead.spare'))}: <span>${input.statsB.sparePercentage.toFixed(1)}%</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t('headToHead.metric'))}</th>
              <th>${escapeHtml(input.playerA.name)}</th>
              <th>${escapeHtml(input.playerB.name)}</th>
            </tr>
          </thead>
          <tbody>
            ${metricRows}
          </tbody>
        </table>
        <div class="summary">${escapeHtml(input.playerA.name)}: ${input.summary.a} | ${escapeHtml(input.playerB.name)}: ${input.summary.b} | ${escapeHtml(t('headToHead.tie'))}: ${input.summary.tie}</div>
      </div>
    </body>
    </html>
  `;
};

export default function Reports() {
  const { querySeason, selectedSeason, currentSeason } = useSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      setPlayers(loadedPlayers.filter((p) => !p.deletedAt));
      setGames(loadedGames);
      setIsLoading(false);
    };

    void loadData();
  }, [querySeason]);

  const weeklyHtml = useMemo(() => {
    const validDates = games
      .map((game) => toDateOnly(game.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const baseDate = validDates.length > 0 ? validDates[validDates.length - 1] : new Date();
    const weekStart = getWeekStartFromDate(baseDate);
    const weekEnd = new Date(weekStart.getTime() + ((WEEK_MS) - 1));

    const previousWeekStart = new Date(weekStart.getTime() - WEEK_MS);
    const previousWeekEnd = new Date(weekEnd.getTime() - WEEK_MS);

    const weeklyGames = games.filter((game) => isInRange(toDateOnly(game.date), weekStart, weekEnd));
    const previousGames = games.filter((game) => isInRange(toDateOnly(game.date), previousWeekStart, previousWeekEnd));

    const weeklyTeamStats = calculateTeamStatsFromData(weeklyGames);
    const previousTeamStats = calculateTeamStatsFromData(previousGames);

    const sessions = new Map<string, Game[]>();
    weeklyGames.forEach((game) => {
      const key = game.gameSessionId || game.id;
      const current = sessions.get(key) || [];
      current.push(game);
      sessions.set(key, current);
    });

    const bestSession = Array.from(sessions.values()).reduce<number | null>((best, sessionGames) => {
      const total = sessionGames.reduce((sum, g) => sum + g.totalScore, 0);
      if (best === null || total > best) return total;
      return best;
    }, null);

    const playerRows = players
      .map((player) => {
        const playerGames = weeklyGames.filter((g) => g.playerId === player.id);
        if (playerGames.length === 0) return null;

        const total = playerGames.reduce((sum, g) => sum + g.totalScore, 0);
        const avg = total / playerGames.length;
        const best = Math.max(...playerGames.map((g) => g.totalScore));
        const strikeTotals = playerGames.reduce(
          (acc, game) => {
            const summary = calculateStrikeSummary(game);
            acc.made += summary.strikes;
            acc.opportunities += summary.opportunities;
            return acc;
          },
          { made: 0, opportunities: 0 },
        );
        const spareTotals = playerGames.reduce(
          (acc, game) => {
            const summary = calculateSpareSummary(game);
            acc.made += summary.spares;
            acc.opportunities += summary.opportunities;
            acc.opens += summary.opens;
            return acc;
          },
          { made: 0, opportunities: 0, opens: 0 },
        );
        const strike = strikeTotals.opportunities > 0 ? (strikeTotals.made / strikeTotals.opportunities) * 100 : 0;
        const spare = spareTotals.opportunities > 0 ? (spareTotals.made / spareTotals.opportunities) * 100 : 0;

        return {
          id: player.id,
          name: player.name,
          games: playerGames.length,
          average: avg,
          best,
          strike,
          spare,
          strikes: strikeTotals.made,
          strikeOpportunities: strikeTotals.opportunities,
          spares: spareTotals.made,
          spareOpportunities: spareTotals.opportunities,
          opens: spareTotals.opens,
        };
      })
      .filter((row): row is {
        id: string;
        name: string;
        games: number;
        average: number;
        best: number;
        strike: number;
        spare: number;
        strikes: number;
        strikeOpportunities: number;
        spares: number;
        spareOpportunities: number;
        opens: number;
      } => row !== null)
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

    return buildWeeklyHtml({
      weekStart,
      weekEnd,
      weeklyGames,
      hasPreviousWeekStats: weeklyGames.length > 0 && previousGames.length > 0,
      avgDelta: weeklyTeamStats.teamGameAverage - previousTeamStats.teamGameAverage,
      strikeDelta: weeklyTeamStats.totalStrikePercentage - previousTeamStats.totalStrikePercentage,
      spareDelta: weeklyTeamStats.totalSparePercentage - previousTeamStats.totalSparePercentage,
      teamAverage: weeklyTeamStats.teamGameAverage,
      bestSession,
      topPlayers: playerRows.slice(0, 3),
      strikeLeader,
      spareLeader,
      allGamesByPlayer,
      sessionCount,
      sessionTotals,
      playerPercentages,
    });
  }, [games, players, currentLang]);

  const headToHeadHtml = useMemo(() => {
    if (players.length < 2) {
      return `
        <!doctype html>
        <html>
          <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
          <body style="font-family: Avenir Next, Arial, sans-serif; padding: 16px;">
            <h2>${escapeHtml(t('headToHead.needTwoPlayers'))}</h2>
          </body>
        </html>
      `;
    }

    const [playerA, playerB] = players;

    const validDates = games
      .map((game) => toDateOnly(game.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const startDate = validDates[0] || new Date();
    const endDate = validDates[validDates.length - 1] || new Date();

    const dateFrom = startDate.toISOString().slice(0, 10);
    const dateTo = endDate.toISOString().slice(0, 10);

    const gamesInRange = games.filter((game) => {
      if (dateFrom && game.date < dateFrom) return false;
      if (dateTo && game.date > dateTo) return false;
      return true;
    });

    const statsA = calculatePlayerStatsFromData(playerA.id, gamesInRange);
    const statsB = calculatePlayerStatsFromData(playerB.id, gamesInRange);

    const comparisonMetrics: ComparisonMetric[] = [
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

    const summary = comparisonMetrics.reduce(
      (acc, metric) => {
        if (!metric.countsForScore) return acc;
        if (metric.winner === 'a') acc.a += 1;
        if (metric.winner === 'b') acc.b += 1;
        if (metric.winner === 'tie') acc.tie += 1;
        return acc;
      },
      { a: 0, b: 0, tie: 0 },
    );

    return buildHeadToHeadHtml({
      playerA,
      playerB,
      statsA,
      statsB,
      rangeLabel: `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`,
      comparisonMetrics,
      summary,
    });
  }, [players, games, currentLang]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-black font-bold text-base">Loading report previews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 space-y-4">
        <div className="bg-white border-4 border-black p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">Report Export Previews</h1>
              <p className="text-sm sm:text-base text-black font-bold">Preview how the downloaded PDFs currently look.</p>
              <p className="text-xs sm:text-sm text-black font-bold mt-1">
                Season scope: {selectedSeason === 'ALL' ? t('profile.allSeasons') : (selectedSeason || currentSeason)}
              </p>
            </div>
            <a
              href="/"
              className="bg-amber-400 border-4 border-black text-black px-4 py-2 font-black hover:bg-amber-500 transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to App
            </a>
          </div>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-black uppercase mb-3">Weekly Report Download Preview</h2>
          <div className="border-4 border-black bg-white overflow-hidden">
            <iframe
              title="Weekly report PDF preview"
              srcDoc={weeklyHtml}
              className="w-full h-[1120px] md:h-[1240px] bg-white"
            />
          </div>
        </div>

        <div className="bg-white border-4 border-black p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-black uppercase mb-3">Head-to-Head Download Preview</h2>
          <div className="border-4 border-black bg-white overflow-hidden">
            <iframe
              title="Head to head PDF preview"
              srcDoc={headToHeadHtml}
              className="w-full h-[1040px] md:h-[1180px] bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
