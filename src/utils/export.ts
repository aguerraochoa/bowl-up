import type { Game, Player } from '../types';
import { calculatePlayerStatsFromData } from './stats';

const escapeCsvCell = (value: string | number): string => {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>): void => {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getSeasonLabel = (querySeason: string | null | undefined): string =>
  querySeason === null ? 'all-seasons' : (querySeason || 'current-season').replace(/\s+/g, '-').toLowerCase();

const formatTenthFrameForCsv = (value: string): string => {
  const notation = String(value || '').trim().toUpperCase();
  if (!notation) return '';
  // Keep 10th-frame notation as text so spreadsheet apps do not coerce values like "8-" into "-8".
  return `="${notation.replace(/"/g, '""')}"`;
};

export const exportGamesCsv = (games: Game[], players: Player[], querySeason: string | null | undefined): void => {
  const playerById = new Map(players.map((p) => [p.id, p.name]));
  const rows = [...games]
    .sort((a, b) => {
      const aDate = a.created_at || a.date;
      const bDate = b.created_at || b.date;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })
    .map((game) => [
      game.season,
      game.date,
      game.gameSessionId || '',
      game.playerId ? (playerById.get(game.playerId) || 'Removed Player') : 'Removed Player',
      game.totalScore,
      game.strikesFrames1to9,
      game.sparesFrames1to9,
      formatTenthFrameForCsv(game.tenthFrame),
      game.created_at || '',
    ]);

  downloadCsv(
    `bowlup_games_${getSeasonLabel(querySeason)}.csv`,
    [
      'season',
      'date',
      'session_id',
      'player_name',
      'total_score',
      'strikes_1_to_9',
      'spares_1_to_9',
      'tenth_frame',
      'created_at',
    ],
    rows,
  );
};

export const exportPlayerStatsCsv = (games: Game[], players: Player[], querySeason: string | null | undefined): void => {
  const rows = players
    .map((player) => {
      const stats = calculatePlayerStatsFromData(player.id, games);
      return [
        querySeason === null ? 'All Seasons' : (querySeason || 'Current Season'),
        player.name,
        stats.gamesPlayed,
        stats.averageScore,
        stats.ceiling,
        stats.floor,
        stats.strikePercentage,
        stats.sparePercentage,
        stats.recentAverage,
        stats.averageTenthFrame,
        stats.gamesAbove200,
      ];
    })
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  downloadCsv(
    `bowlup_player_stats_${getSeasonLabel(querySeason)}.csv`,
    [
      'season_scope',
      'player_name',
      'games_played',
      'average_score',
      'high_score',
      'low_score',
      'strike_percentage',
      'spare_percentage',
      'recent_10_average',
      'average_tenth_frame',
      'games_above_200',
    ],
    rows,
  );
};
