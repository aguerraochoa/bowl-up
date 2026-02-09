import { useState, useEffect } from 'react';
import { getAllLeaguesWithDetails, createLeague, updateLeague, deleteLeague, startNewLeagueSeason, getTeamsByLeague } from '../../utils/adminStorage';
import type { LeagueDetails, AdminTeam } from '../../utils/adminStorage';
import { Plus, Edit2, Trash2, Calendar, Users, X } from 'lucide-react';

interface AdminLeaguesProps {
  onSignOut: () => void;
  onNavigate: (page: string) => void;
}

export default function AdminLeagues({ onNavigate: _onNavigate }: AdminLeaguesProps) {
  void _onNavigate;
  const [leagues, setLeagues] = useState<LeagueDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueDetails | null>(null);
  const [leagueName, setLeagueName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [teamsInLeague, setTeamsInLeague] = useState<AdminTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [isClosingCreate, setIsClosingCreate] = useState(false);
  const [isClosingEdit, setIsClosingEdit] = useState(false);
  const [isClosingDelete, setIsClosingDelete] = useState(false);
  const [isClosingSeason, setIsClosingSeason] = useState(false);
  const [isClosingTeams, setIsClosingTeams] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      const data = await getAllLeaguesWithDetails();
      setLeagues(data);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCreate = () => {
    setIsClosingCreate(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setIsClosingCreate(false);
      setLeagueName('');
    }, 300);
  };

  const handleCreateLeague = async () => {
    if (!leagueName.trim()) {
      alert('League name cannot be empty');
      return;
    }

    setIsProcessing(true);
    try {
      await createLeague(leagueName.trim());
      handleCloseCreate();
      await loadLeagues();
    } catch (error) {
      console.error('Error creating league:', error);
      alert('Error creating league');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseEdit = () => {
    setIsClosingEdit(true);
    setTimeout(() => {
      setShowEditModal(false);
      setIsClosingEdit(false);
      setSelectedLeague(null);
      setLeagueName('');
    }, 300);
  };

  const handleEditLeague = async () => {
    if (!selectedLeague || !leagueName.trim()) {
      alert('League name cannot be empty');
      return;
    }

    setIsProcessing(true);
    try {
      await updateLeague(selectedLeague.id, leagueName.trim());
      handleCloseEdit();
      await loadLeagues();
    } catch (error) {
      console.error('Error updating league:', error);
      alert('Error updating league');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseDelete = () => {
    setIsClosingDelete(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setIsClosingDelete(false);
      setSelectedLeague(null);
    }, 300);
  };

  const handleDeleteLeague = async () => {
    if (!selectedLeague) return;

    setIsProcessing(true);
    try {
      await deleteLeague(selectedLeague.id);
      handleCloseDelete();
      await loadLeagues();
    } catch (error) {
      console.error('Error deleting league:', error);
      alert('Error deleting league');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSeason = () => {
    setIsClosingSeason(true);
    setTimeout(() => {
      setShowSeasonModal(false);
      setIsClosingSeason(false);
      setSelectedLeague(null);
    }, 300);
  };

  const handleStartNewSeason = async () => {
    if (!selectedLeague) return;

    const confirmMessage = `Start a new season for ${selectedLeague.name}? This will increment the season number for all teams in this league.`;
    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      await startNewLeagueSeason(selectedLeague.id);
      handleCloseSeason();
      await loadLeagues();
      alert('New season started successfully!');
    } catch (error) {
      console.error('Error starting new season:', error);
      alert('Error starting new season');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseTeams = () => {
    setIsClosingTeams(true);
    setTimeout(() => {
      setShowTeamsModal(false);
      setIsClosingTeams(false);
      setSelectedLeague(null);
      setTeamsInLeague([]);
    }, 300);
  };

  const handleViewTeams = async (league: LeagueDetails) => {
    setSelectedLeague(league);
    setLoadingTeams(true);
    setShowTeamsModal(true);
    try {
      const teams = await getTeamsByLeague(league.id);
      setTeamsInLeague(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoadingTeams(false);
    }
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
          <h1 className="text-3xl font-black text-black uppercase">Manage Leagues</h1>
          <button
            onClick={() => {
              setLeagueName('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-orange-500 border-4 border-black text-black px-4 py-2 rounded-none font-black hover:bg-orange-600 transition-all"
          >
            <Plus className="w-5 h-5 sm:w-5 md:w-5" />
            <span className="hidden sm:inline">Create League</span>
          </button>
        </div>

        {/* Leagues List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues.map(league => (
            <div key={league.id} className="bg-white border-4 border-black p-6">
              <h3 className="text-xl font-black text-black mb-2">{league.name}</h3>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Current Season: {league.currentSeason}
                </p>
                <p className="text-sm text-gray-600">
                  <Users className="w-4 h-4 inline mr-2" />
                  Teams: {league.teamCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleViewTeams(league)}
                  className="flex-1 bg-orange-500 border-2 border-black text-black px-3 py-2 rounded-none font-black hover:bg-orange-600 transition-all text-sm"
                >
                  <span className="hidden sm:inline">View Teams</span>
                  <Users className="w-4 h-4 sm:hidden" />
                </button>
                <button
                  onClick={() => {
                    setSelectedLeague(league);
                    setLeagueName(league.name);
                    setShowEditModal(true);
                  }}
                  className="bg-white border-2 border-black text-black px-3 py-2 rounded-none font-black hover:bg-orange-500 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedLeague(league);
                    setShowSeasonModal(true);
                  }}
                  className="bg-white border-2 border-black text-black px-3 py-2 rounded-none font-black hover:bg-orange-500 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                {league.name !== 'Unassigned' && (
                  <button
                    onClick={() => {
                      setSelectedLeague(league);
                      setShowDeleteModal(true);
                    }}
                    className="bg-red-500 border-2 border-black text-white px-3 py-2 rounded-none font-black hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseCreate();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingCreate ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">Create League</h2>
                <button
                  onClick={handleCloseCreate}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="League name"
                  className="w-full px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white mb-4"
                  autoFocus
                />
                <div className="flex gap-4">
                <button
                  onClick={handleCreateLeague}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-500 border-4 border-black text-black py-3 rounded-none font-black hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={handleCloseCreate}
                  className="flex-1 bg-white border-4 border-black text-black py-3 rounded-none font-black hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedLeague && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseEdit();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingEdit ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">Edit League</h2>
                <button
                  onClick={handleCloseEdit}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="League name"
                  className="w-full px-4 py-3 border-4 border-black focus:outline-none font-bold bg-white mb-4"
                  autoFocus
                />
                <div className="flex gap-4">
                <button
                  onClick={handleEditLeague}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-500 border-4 border-black text-black py-3 rounded-none font-black hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCloseEdit}
                  className="flex-1 bg-white border-4 border-black text-black py-3 rounded-none font-black hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedLeague && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseDelete();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingDelete ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">Delete League</h2>
                <button
                  onClick={handleCloseDelete}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <p className="text-black font-bold mb-4">
                  Are you sure you want to delete "{selectedLeague.name}"? All teams in this league will be moved to "Unassigned".
                </p>
                <div className="flex gap-4">
                <button
                  onClick={handleDeleteLeague}
                  disabled={isProcessing}
                  className="flex-1 bg-red-500 border-4 border-black text-white py-3 rounded-none font-black hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={handleCloseDelete}
                  className="flex-1 bg-white border-4 border-black text-black py-3 rounded-none font-black hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Season Modal */}
        {showSeasonModal && selectedLeague && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseSeason();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingSeason ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">Start New Season</h2>
                <button
                  onClick={handleCloseSeason}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <p className="text-black font-bold mb-4">
                  Start a new season for "{selectedLeague.name}"? This will increment the season for all teams in this league.
                </p>
                <div className="flex gap-4">
                <button
                  onClick={handleStartNewSeason}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-500 border-4 border-black text-black py-3 rounded-none font-black hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Starting...' : 'Start Season'}
                </button>
                <button
                  onClick={handleCloseSeason}
                  className="flex-1 bg-white border-4 border-black text-black py-3 rounded-none font-black hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams Modal */}
        {showTeamsModal && selectedLeague && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseTeams();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-2xl sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingTeams ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">Teams in {selectedLeague.name}</h2>
                <button
                  onClick={handleCloseTeams}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                {loadingTeams ? (
                  <p className="text-black font-bold">Loading teams...</p>
                ) : teamsInLeague.length === 0 ? (
                  <p className="text-black font-bold">No teams in this league</p>
                ) : (
                  <div className="space-y-2">
                    {teamsInLeague.map(team => (
                      <div key={team.id} className="bg-orange-50 border-2 border-black p-3">
                        <p className="font-black text-black">{team.name}</p>
                        <p className="text-sm text-gray-600">{team.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
