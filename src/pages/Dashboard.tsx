import { useEffect, useState } from 'react';
import KPICard from '../components/KPICard';
import LeaderboardCard from '../components/LeaderboardCard';
import { calculateTeamStatsFromData, getTopIndividualGamesFromData, getTopTeamSumGamesFromData, getTopIndividualAveragesFromData, getTopTenthFrameAveragesFromData } from '../utils/stats';
import { getPlayers, getGames } from '../utils/storage';
import { Target, Zap, Gamepad2, TrendingUp, X, Loader2 } from 'lucide-react';
import type { Game } from '../types';

export default function Dashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState({
    teamGameAverage: 0,
    totalGames: 0,
    totalStrikePercentage: 0,
    totalSparePercentage: 0,
    averageTenthFrame: 0,
  });
  const [topGames, setTopGames] = useState<Array<{ playerName: string; totalScore: number; date: string }>>([]);
  const [topTeamSums, setTopTeamSums] = useState<Array<{ date: string; totalSum: number; players: string[]; games: Game[] }>>([]);
  const [topAverages, setTopAverages] = useState<Array<{ playerName: string; average: number }>>([]);
  const [topTenthFrameAverages, setTopTenthFrameAverages] = useState<Array<{ playerName: string; average: number }>>([]);
  const [selectedTeamGame, setSelectedTeamGame] = useState<{ date: string; totalSum: number; games: Game[] } | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showMoreGames, setShowMoreGames] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    
    // Fetch data once
    const [allGames, loadedPlayers] = await Promise.all([
      getGames(),
      getPlayers(),
    ]);
    
    setPlayers(loadedPlayers);
    
    // Calculate all stats in parallel using the fetched data
    const [
      stats,
      topGamesData,
      teamSumsData,
      averagesData,
      tenthFrameAveragesData,
    ] = await Promise.all([
      calculateTeamStatsFromData(allGames),
      getTopIndividualGamesFromData(allGames, loadedPlayers, 10),
      getTopTeamSumGamesFromData(allGames, 5),
      getTopIndividualAveragesFromData(allGames, loadedPlayers, 100),
      getTopTenthFrameAveragesFromData(allGames, loadedPlayers, 100),
    ]);
    
    setTeamStats(stats);
    setTopGames(topGamesData.map(g => ({
      playerName: g.playerName,
      totalScore: g.totalScore,
      date: g.date,
    })));
    setTopTeamSums(teamSumsData);
    setTopAverages(averagesData.map(a => ({
      playerName: a.playerName,
      average: a.average,
    })));
    setTopTenthFrameAverages(tenthFrameAveragesData.map(a => ({
      playerName: a.playerName,
      average: a.average,
    })));
    
    if (showLoading) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load with loading state
    refreshData(true);
    // Refresh every 5 seconds to catch updates (Supabase is real-time, but keeping for safety)
    // Don't show loading spinner on subsequent refreshes
    const interval = setInterval(() => refreshData(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedTeamGame && !isClosingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTeamGame, isClosingModal]);

  const handleTeamGameClick = (teamSum: { date: string; totalSum: number; games: Game[] }) => {
    setSelectedTeamGame(teamSum);
    setIsClosingModal(false);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setSelectedTeamGame(null);
      setIsClosingModal(false);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 md:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-black font-black text-xl uppercase">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 md:pb-6 safe-top relative">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-2 uppercase">Dashboard</h1>
          <p className="text-sm sm:text-base text-black font-bold">Team performance overview</p>
        </div>

        {/* Desktop One-Pager Layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Column - KPIs */}
            <div className="col-span-3">
              <div className="grid grid-cols-1 gap-4">
                <KPICard
                  title="Team Average"
                  value={teamStats.teamGameAverage.toFixed(1)}
                  subtitle="Average score"
                  icon={<Target className="w-6 h-6 opacity-60" />}
                  color="primary"
                />
                <KPICard
                  title="Total Games"
                  value={teamStats.totalGames}
                  subtitle="Games played"
                  icon={<Gamepad2 className="w-6 h-6 opacity-60" />}
                  color="accent"
                />
                <KPICard
                  title="Strike %"
                  value={`${teamStats.totalStrikePercentage.toFixed(1)}%`}
                  subtitle="Team strike %"
                  icon={<Zap className="w-6 h-6 opacity-60" />}
                  color="purple"
                />
                <KPICard
                  title="Spare %"
                  value={`${teamStats.totalSparePercentage.toFixed(1)}%`}
                  subtitle="Team spare %"
                  icon={<TrendingUp className="w-6 h-6 opacity-60" />}
                  color="orange"
                />
              </div>
            </div>

            {/* Middle Column - Top Games */}
            <div className="col-span-5">
              <div className="space-y-4">
                <LeaderboardCard
                  title="🏆 Top Individual Games"
                  items={(showMoreGames ? topGames : topGames.slice(0, 5)).map((game, index) => ({
                    rank: index + 1,
                    name: game.playerName,
                    value: game.totalScore,
                    subtitle: new Date(game.date).toLocaleDateString(),
                  }))}
                  emptyMessage="No games recorded yet"
                  showMoreButton={!showMoreGames && topGames.length > 5}
                  onShowMore={() => setShowMoreGames(true)}
                  showMoreLabel="Show More"
                />
                <LeaderboardCard
                  title="👥 Top Team Sum Games"
                  items={topTeamSums.map((sum, index) => ({
                    rank: index + 1,
                    name: `${sum.players.length} players`,
                    value: sum.totalSum,
                    subtitle: new Date(sum.date).toLocaleDateString(),
                    onClick: () => handleTeamGameClick(sum),
                  }))}
                  emptyMessage="No team games recorded yet"
                />
              </div>
            </div>

            {/* Right Column - Averages */}
            <div className="col-span-4">
              <div className="space-y-4">
                <LeaderboardCard
                  title="⭐ Individual Averages"
                  items={topAverages.map((avg, index) => ({
                    rank: index + 1,
                    name: avg.playerName,
                    value: avg.average.toFixed(1),
                    subtitle: "Season average",
                  }))}
                  emptyMessage="No averages calculated yet"
                />
                <LeaderboardCard
                  title="🎯 Avg 10th Frame"
                  items={topTenthFrameAverages.map((avg, index) => ({
                    rank: index + 1,
                    name: avg.playerName,
                    value: avg.average.toFixed(1),
                    subtitle: "Clutch performance",
                  }))}
                  emptyMessage="No 10th frame data yet"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KPICard
              title="Team Average"
              value={teamStats.teamGameAverage.toFixed(1)}
              subtitle="Average score across all games"
              icon={<Target className="w-8 h-8 opacity-60" />}
              color="primary"
            />
            <KPICard
              title="Total Games"
              value={teamStats.totalGames}
              subtitle="Individual games played"
              icon={<Gamepad2 className="w-8 h-8 opacity-60" />}
              color="accent"
            />
            <KPICard
              title="Strike %"
              value={`${teamStats.totalStrikePercentage.toFixed(1)}%`}
              subtitle="Team strike percentage"
              icon={<Zap className="w-8 h-8 opacity-60" />}
              color="purple"
            />
            <KPICard
              title="Spare %"
              value={`${teamStats.totalSparePercentage.toFixed(1)}%`}
              subtitle="Team spare percentage"
              icon={<TrendingUp className="w-8 h-8 opacity-60" />}
              color="orange"
            />
          </div>

          {/* Leaderboards */}
          <div className="space-y-6">
            <LeaderboardCard
              title="🏆 Top Individual Games"
              items={(showMoreGames ? topGames : topGames.slice(0, 5)).map((game, index) => ({
                rank: index + 1,
                name: game.playerName,
                value: game.totalScore,
                subtitle: new Date(game.date).toLocaleDateString(),
              }))}
              emptyMessage="No games recorded yet"
              showMoreButton={!showMoreGames && topGames.length > 5}
              onShowMore={() => setShowMoreGames(true)}
              showMoreLabel="Show More"
            />

            <LeaderboardCard
              title="👥 Top Team Sum Games"
              items={topTeamSums.map((sum, index) => ({
                rank: index + 1,
                name: `${sum.players.length} players`,
                value: sum.totalSum,
                subtitle: new Date(sum.date).toLocaleDateString(),
                onClick: () => handleTeamGameClick(sum),
              }))}
              emptyMessage="No team games recorded yet"
            />

            <LeaderboardCard
              title="⭐ Individual Averages"
              items={topAverages.map((avg, index) => ({
                rank: index + 1,
                name: avg.playerName,
                value: avg.average.toFixed(1),
                subtitle: "Season average",
              }))}
              emptyMessage="No averages calculated yet"
            />

            <LeaderboardCard
              title="🎯 Avg 10th Frame"
              items={topTenthFrameAverages.map((avg, index) => ({
                rank: index + 1,
                name: avg.playerName,
                value: avg.average.toFixed(1),
                subtitle: "Clutch performance",
              }))}
              emptyMessage="No 10th frame data yet"
            />
          </div>
        </div>

        {/* Team Game Details Modal */}
        {selectedTeamGame && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-yellow-100/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingModal ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-yellow-300 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  Team Game Details
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 bg-red-400 border-4 border-black text-black hover:bg-red-500 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <div className="mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-black font-bold">
                    Date: {new Date(selectedTeamGame.date).toLocaleDateString()}
                  </p>
                  <p className="text-lg sm:text-xl text-black font-black mt-2">
                    Total: {selectedTeamGame.totalSum}
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedTeamGame.games
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((game, index) => {
                      const player = players.find((p: any) => p.id === game.playerId);
                      return (
                        <div
                          key={game.id}
                          className="flex items-center justify-between p-4 bg-yellow-300 border-4 border-black"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl sm:text-2xl font-black text-black w-8 sm:w-10 text-center">
                              {index + 1}
                            </span>
                            <span className="font-black text-base sm:text-lg text-black">
                              {player?.name || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-2xl sm:text-3xl font-black text-black">
                            {game.totalScore}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
