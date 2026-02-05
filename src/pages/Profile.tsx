import { useState, useEffect } from 'react';
import { getTeam, saveTeam, startNewSeason } from '../utils/storage';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { t, setLanguage, getLanguage } from '../i18n';
import { useSeason } from '../contexts/SeasonContext';
import type { Team } from '../types';
import { User, LogOut, Edit2, Check, X, Loader2, Globe, Calendar, Plus } from 'lucide-react';

interface ProfileProps {
  onSignOut: () => void;
}

export default function Profile({ onSignOut }: ProfileProps) {
  const { currentSeason, selectedSeason, availableSeasons, setSelectedSeason, isViewingAllSeasons, isViewingPastSeason, refreshSeasons } = useSeason();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentLang, setCurrentLang] = useState<'es' | 'en'>(() => getLanguage());

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (e: CustomEvent) => {
      setCurrentLang(e.detail);
    };
    
    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadTeam = async () => {
      setIsLoading(true);
      try {
        const teamData = await getTeam();
        setTeam(teamData);
        if (teamData) {
          setEditedTeamName(teamData.name);
        }
      } catch (error) {
        console.error('Error loading team:', error);
        setError('Error loading team information');
      } finally {
        setIsLoading(false);
      }
    };
    loadTeam();
  }, []);

  const handleStartEdit = () => {
    if (team) {
      setEditedTeamName(team.name);
      setIsEditingName(true);
      setError('');
    }
  };

  const handleCancelEdit = () => {
    if (team) {
      setEditedTeamName(team.name);
      setIsEditingName(false);
      setError('');
    }
  };

  const handleSaveName = async () => {
    if (!team || !editedTeamName.trim()) {
      setError(t('profile.teamNameEmpty'));
      return;
    }

    if (editedTeamName.trim() === team.name) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedTeam: Team = {
        ...team,
        name: editedTeamName.trim(),
      };

      await saveTeam(updatedTeam);
      
      // Invalidate team cache
      cache.invalidate('team_id');
      
      setTeam(updatedTeam);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error saving team name:', error);
      setError(t('profile.errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = (lang: 'es' | 'en') => {
    setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const handleSeasonChange = (season: string) => {
    if (season === 'ALL') {
      setSelectedSeason('ALL');
    } else {
      setSelectedSeason(season);
    }
  };

  const handleStartNewSeason = async () => {
    const confirmMessage = `${t('profile.confirmStartNewSeason')}\n\n${t('profile.startNewSeasonWarning')}`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsStartingSeason(true);
    setError('');

    try {
      await startNewSeason();
      await refreshSeasons();
      setSelectedSeason(null); // Reset to current season
      alert(t('profile.seasonStarted'));
    } catch (error) {
      console.error('Error starting new season:', error);
      setError(t('profile.errorStartingSeason'));
    } finally {
      setIsStartingSeason(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-black font-bold text-base">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative flex items-center justify-center">
        <div className="text-center">
          <p className="text-black font-bold text-base mb-4">{t('profile.errorLoading')}</p>
          {error && (
            <p className="text-sm text-black font-bold">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black mb-2 uppercase">{t('profile.title')}</h1>
            <p className="text-sm sm:text-base text-black font-bold">{t('profile.subtitle')}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-600 border-4 border-black text-white px-3 sm:px-4 py-2 sm:py-3 rounded-none font-black flex items-center gap-2 hover:bg-red-700 transition-all flex-shrink-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{t('nav.signOut')}</span>
          </button>
        </div>

        {/* Team Name Section */}
        <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-black uppercase">{t('profile.teamName')}</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          {isEditingName ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editedTeamName}
                onChange={(e) => setEditedTeamName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-base sm:text-lg"
                placeholder="Enter team name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveName}
                  disabled={isSaving || !editedTeamName.trim()}
                  className="flex-1 bg-lime-500 border-4 border-black text-black py-2 sm:py-3 rounded-none font-black flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('profile.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{t('profile.save')}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 bg-white border-4 border-black text-black py-2 sm:py-3 rounded-none font-black flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{t('profile.cancel')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base sm:text-lg font-black text-black">{team.name}</p>
                {team.league && (
                  <p className="text-sm text-black font-bold mt-1">{t('profile.league')}: {team.league}</p>
                )}
              </div>
              <button
                onClick={handleStartEdit}
                className="bg-orange-500 border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none font-black flex items-center gap-2 hover:bg-orange-600 transition-all"
                aria-label={t('profile.edit')}
              >
                <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t('profile.edit')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-black uppercase">{t('profile.language')}</h2>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black mb-2">{t('profile.selectLanguage')}</label>
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value as 'es' | 'en')}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-base sm:text-lg"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Season Section */}
        <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-black uppercase">{t('profile.season')}</h2>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">{t('profile.selectSeason')}</label>
              <select
                value={selectedSeason === null ? currentSeason : (selectedSeason === 'ALL' ? 'ALL' : selectedSeason)}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-base sm:text-lg"
              >
                <option value={currentSeason}>{t('profile.currentSeason')}: {currentSeason}</option>
                {availableSeasons.filter((s: string) => s !== currentSeason).map((season: string) => (
                  <option key={season} value={season}>{season}</option>
                ))}
                <option value="ALL">{t('profile.allSeasons')}</option>
              </select>
            </div>

            {/* Start New Season button - only show when viewing current season */}
            {!isViewingPastSeason && !isViewingAllSeasons && (
              <button
                onClick={handleStartNewSeason}
                disabled={isStartingSeason}
                className="w-full bg-amber-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2 hover:bg-amber-500 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isStartingSeason ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('profile.saving')}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{t('profile.startNewSeason')}</span>
                  </>
                )}
              </button>
            )}

            {(isViewingPastSeason || isViewingAllSeasons) && (
              <div className="p-3 bg-yellow-300 border-4 border-black rounded-none text-black text-sm font-bold">
                {isViewingAllSeasons 
                  ? `${t('profile.allSeasons')} - ${t('profile.readOnly')}` 
                  : `${selectedSeason} - ${t('profile.readOnly')}`}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
