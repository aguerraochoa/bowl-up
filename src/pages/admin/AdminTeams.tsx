import { useState, useEffect } from 'react';
import { getAllTeams, enableTeam, disableTeam, updateTeamLeague, getAllLeagues } from '../../utils/adminStorage';
import type { AdminTeam } from '../../utils/adminStorage';
import type { League } from '../../types';
import { CheckCircle, XCircle, Search } from 'lucide-react';

interface AdminTeamsProps {
  onSignOut: () => void;
  onNavigate: (page: string) => void;
}

export default function AdminTeams({ onNavigate: _onNavigate }: AdminTeamsProps) {
  void _onNavigate;
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeague, setFilterLeague] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [updatingTeam, setUpdatingTeam] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, leaguesData] = await Promise.all([
          getAllTeams(),
          getAllLeagues(),
        ]);
        console.log('Loaded teams:', teamsData);
        console.log('Teams count:', teamsData.length);
        setTeams(teamsData);
        setLeagues(leaguesData);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleToggleEnabled = async (teamId: string, currentStatus: boolean) => {
    setUpdatingTeam(teamId);
    try {
      if (currentStatus) {
        await disableTeam(teamId);
      } else {
        await enableTeam(teamId);
      }
      setTeams(prev => prev.map(t => 
        t.id === teamId ? { ...t, isEnabled: !currentStatus } : t
      ));
    } catch (error) {
      console.error('Error updating team:', error);
      alert('Error updating team status');
    } finally {
      setUpdatingTeam(null);
    }
  };

  const handleLeagueChange = async (teamId: string, leagueId: string | null) => {
    setUpdatingTeam(teamId);
    try {
      await updateTeamLeague(teamId, leagueId);
      const league = leagues.find(l => l.id === leagueId);
      setTeams(prev => prev.map(t => 
        t.id === teamId ? { ...t, leagueId, leagueName: league?.name || null } : t
      ));
    } catch (error) {
      console.error('Error updating team league:', error);
      alert('Error updating team league');
    } finally {
      setUpdatingTeam(null);
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = !searchTerm || 
                         team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (team.email && team.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLeague = filterLeague === 'all' || team.leagueId === filterLeague;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && team.isEnabled) ||
                         (filterStatus === 'disabled' && !team.isEnabled);
    return matchesSearch && matchesLeague && matchesStatus;
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };


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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-black uppercase">Manage Teams</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-4 border-black p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teams..."
                className="w-full pl-10 pr-4 py-2 border-4 border-black focus:outline-none font-bold bg-white"
              />
            </div>
            <select
              value={filterLeague}
              onChange={(e) => setFilterLeague(e.target.value)}
              className="px-4 py-2 border-4 border-black focus:outline-none font-bold bg-white"
            >
              <option value="all">All Leagues</option>
              {leagues.map(league => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="px-4 py-2 border-4 border-black focus:outline-none font-bold bg-white"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Teams List */}
        {filteredTeams.length === 0 ? (
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="text-black font-bold text-lg">No teams found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredTeams.map(team => {
                const isExpanded = expandedTeams.has(team.id);
                return (
                  <div key={team.id} className="bg-white border-4 border-black">
                    {/* Collapsed View */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(team.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 flex items-start gap-6">
                          {/* Team Name */}
                          <div>
                            <h3 className="text-lg font-black text-black uppercase mb-1">Team Name</h3>
                            <p className="text-black font-bold">{team.name}</p>
                          </div>
                          
                          {/* Status - on same line */}
                          <div>
                            <h3 className="text-lg font-black text-black uppercase mb-1">Status</h3>
                            {team.isEnabled ? (
                              <span className="flex items-center gap-2 text-green-600 font-bold">
                                <CheckCircle className="w-5 h-5" />
                                Enabled
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-red-600 font-bold">
                                <XCircle className="w-5 h-5" />
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Toggle Status Button (when collapsed) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEnabled(team.id, team.isEnabled);
                          }}
                          disabled={updatingTeam === team.id}
                          className={`flex-shrink-0 p-3 border-4 border-black font-black transition-all ${
                            team.isEnabled
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          } disabled:opacity-50`}
                        >
                          {updatingTeam === team.id ? (
                            '...'
                          ) : team.isEnabled ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded View */}
                    {isExpanded && (
                      <div className="border-t-4 border-black p-4 space-y-3">
                        {/* Email */}
                        <div>
                          <h3 className="text-lg font-black text-black uppercase mb-1">Email</h3>
                          <p className="text-black font-bold break-all">{team.email}</p>
                        </div>
                        
                        {/* League */}
                        <div>
                          <h3 className="text-lg font-black text-black uppercase mb-1">League</h3>
                          <select
                            value={team.leagueId || ''}
                            onChange={(e) => handleLeagueChange(team.id, e.target.value || null)}
                            disabled={updatingTeam === team.id}
                            className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold bg-white"
                          >
                            <option value="">Unassigned</option>
                            {leagues.map(league => (
                              <option key={league.id} value={league.id}>{league.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border-4 border-black">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-black uppercase border-b-4 border-black">Team Name</th>
                      <th className="px-4 py-3 text-left font-black text-black uppercase border-b-4 border-black">Email</th>
                      <th className="px-4 py-3 text-left font-black text-black uppercase border-b-4 border-black">League</th>
                      <th className="px-4 py-3 text-left font-black text-black uppercase border-b-4 border-black">Status</th>
                      <th className="px-4 py-3 text-left font-black text-black uppercase border-b-4 border-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.map(team => (
                      <tr key={team.id} className="border-b-2 border-gray-200 hover:bg-orange-50">
                        <td className="px-4 py-3 font-bold text-black">{team.name}</td>
                        <td className="px-4 py-3 text-black">{team.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={team.leagueId || ''}
                            onChange={(e) => handleLeagueChange(team.id, e.target.value || null)}
                            disabled={updatingTeam === team.id}
                            className="px-3 py-1 border-2 border-black focus:outline-none font-bold bg-white text-sm"
                          >
                            <option value="">Unassigned</option>
                            {leagues.map(league => (
                              <option key={league.id} value={league.id}>{league.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {team.isEnabled ? (
                            <span className="flex items-center gap-2 text-green-600 font-bold">
                              <CheckCircle className="w-5 h-5" />
                              Enabled
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-red-600 font-bold">
                              <XCircle className="w-5 h-5" />
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleEnabled(team.id, team.isEnabled)}
                            disabled={updatingTeam === team.id}
                            className={`flex items-center gap-1 px-3 py-1 border-2 border-black font-black text-sm transition-all ${
                              team.isEnabled
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            } disabled:opacity-50`}
                          >
                            {updatingTeam === team.id ? '...' : team.isEnabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
