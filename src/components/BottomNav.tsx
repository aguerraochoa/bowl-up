import { useState, useEffect } from 'react';
import { Home, Plus, Users, DollarSign, Target, LogOut, MoreHorizontal, X, User, Swords, FileText } from 'lucide-react';
import { t, getLanguage } from '../i18n';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut?: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onSignOut }: BottomNavProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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

  // Use currentLang to trigger re-renders when language changes
  const mainTabs = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'add-game', label: t('nav.addGame'), icon: Plus },
    { id: 'players', label: t('nav.players'), icon: Users },
    { id: 'debts', label: t('nav.debts'), icon: DollarSign },
  ];
  
  // Force re-render when language changes (currentLang is used implicitly via t() calls)
  void currentLang;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showMoreMenu && !isClosing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMoreMenu, isClosing]);

  const handleMoreClick = () => {
    setIsClosing(false);
    setShowMoreMenu(true);
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowMoreMenu(false);
      setIsClosing(false);
    }, 300);
  };

  const handleMenuOptionClick = (action: () => void) => {
    handleCloseMenu();
    // Small delay to allow animation to start
    setTimeout(() => {
      action();
    }, 100);
  };

  const menuOptions = [
    { id: 'weekly-report', label: t('nav.weeklyReport'), icon: FileText, action: () => onTabChange('weekly-report') },
    { id: 'bet-tracker', label: t('nav.betTracker'), icon: Target, action: () => onTabChange('bet-tracker') },
    { id: 'head-to-head', label: t('nav.headToHead'), icon: Swords, action: () => onTabChange('head-to-head') },
    { id: 'profile', label: t('nav.profile'), icon: User, action: () => onTabChange('profile') },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r-4 border-black z-50">
        <div className="flex flex-col justify-between items-start w-full h-full pt-6">
          <div className="w-full">
            {[
              ...mainTabs,
              { id: 'weekly-report', label: t('nav.weeklyReport'), icon: FileText },
              { id: 'bet-tracker', label: t('nav.betTracker'), icon: Target },
              { id: 'head-to-head', label: t('nav.headToHead'), icon: Swords },
              { id: 'profile', label: t('nav.profile'), icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`w-full flex flex-row items-center justify-start gap-3 px-6 py-4 transition-all ${
                  activeTab === id
                    ? 'bg-orange-500 text-black font-black border-l-4 border-black'
                    : 'text-black hover:bg-amber-400 font-bold'
                }`}
              >
                <Icon className={`w-6 h-6 flex-shrink-0 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
                <span className="text-sm uppercase font-black">{label}</span>
              </button>
            ))}
          </div>
          {/* Sign Out at bottom */}
          <div className="w-full border-t-4 border-black">
            <button
              onClick={() => onSignOut && onSignOut()}
              className="w-full flex flex-row items-center justify-start gap-3 px-6 py-4 transition-all text-black hover:bg-red-600 hover:text-white font-bold"
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              <span className="text-sm uppercase font-black">{t('nav.signOut')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 8px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 8px)',
        }}
      >
        <div className="flex justify-around items-center h-16">
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full px-1 transition-all ${
                activeTab === id
                  ? 'bg-orange-500 text-black font-black'
                  : 'text-black hover:bg-amber-400 font-bold'
              }`}
            >
              <Icon className={`w-6 h-6 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[11px] mt-1 uppercase leading-tight whitespace-nowrap">{label}</span>
            </button>
          ))}
          <button
            onClick={handleMoreClick}
            className="flex flex-col items-center justify-center flex-1 min-w-0 h-full px-1 transition-all text-black hover:bg-amber-400 font-bold"
          >
            <MoreHorizontal className="w-6 h-6 transition-transform" />
            <span className="text-[11px] mt-1 uppercase leading-tight whitespace-nowrap">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu Modal */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseMenu();
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-orange-50/90" />
          
          {/* Modal Content */}
          <div 
            className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[50vh] flex flex-col ${
              isClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase flex-1">
                {t('nav.more')}
              </h2>
              <button
                onClick={handleCloseMenu}
                className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {/* Menu Options */}
            <div className="flex-1 overflow-y-auto bg-white min-h-0">
              {menuOptions.map(({ id, label, icon: Icon, action }) => (
                <button
                  key={id}
                  onClick={() => handleMenuOptionClick(action)}
                  className={`w-full flex flex-row items-center gap-4 px-6 py-4 border-b-2 border-black transition-all ${
                    activeTab === id
                      ? 'bg-orange-500 text-black font-black'
                      : 'text-black hover:bg-amber-400 font-bold'
                  }`}
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="text-base uppercase font-black">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
