import { useState, useEffect } from 'react';
import { getAllTeams, getAllLeaguesWithDetails } from '../../utils/adminStorage';
import type { AdminTeam, LeagueDetails } from '../../utils/adminStorage';
import { Users, Trophy, CheckCircle, XCircle } from 'lucide-react';

interface AdminDashboardProps {
  onSignOut: () => void;
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [leagues, setLeagues] = useState<LeagueDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, leaguesData] = await Promise.all([
          getAllTeams(),
          getAllLeaguesWithDetails(),
        ]);
        setTeams(teamsData);
        setLeagues(leaguesData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const enabledTeams = teams.filter(t => t.isEnabled).length;
  const disabledTeams = teams.filter(t => !t.isEnabled).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-black font-black text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-black uppercase">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-orange-500" />
              <h3 className="text-lg font-black text-black uppercase">Total Teams</h3>
            </div>
            <p className="text-3xl font-black text-black">{teams.length}</p>
          </div>

          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-black text-black uppercase">Enabled Teams</h3>
            </div>
            <p className="text-3xl font-black text-black">{enabledTeams}</p>
          </div>

          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-black text-black uppercase">Disabled Teams</h3>
            </div>
            <p className="text-3xl font-black text-black">{disabledTeams}</p>
          </div>

          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-orange-500" />
              <h3 className="text-lg font-black text-black uppercase">Total Leagues</h3>
            </div>
            <p className="text-3xl font-black text-black">{leagues.length}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border-4 border-black p-6">
          <h2 className="text-xl font-black text-black mb-4 uppercase">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('teams')}
              className="w-full text-left bg-orange-50 border-2 border-black p-4 hover:bg-orange-100 transition-all"
            >
              <p className="font-black text-black">View All Teams</p>
              <p className="text-sm text-gray-600">Manage team access and league assignments</p>
            </button>
            <button
              onClick={() => onNavigate('leagues')}
              className="w-full text-left bg-orange-50 border-2 border-black p-4 hover:bg-orange-100 transition-all"
            >
              <p className="font-black text-black">View All Leagues</p>
              <p className="text-sm text-gray-600">Create leagues and manage seasons</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
