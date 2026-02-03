import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import AddGame from './pages/AddGame';
import Players from './pages/Players';
import Debts from './pages/Debts';
import BetTracker from './pages/BetTracker';
import Designs from './pages/Designs';
import DebtsDesigns from './pages/DebtsDesigns';
import ColorPalettes from './pages/ColorPalettes';
import { initializeDefaultData, getTeam } from './utils/storage';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBetTracker, setShowBetTracker] = useState(false);

  useEffect(() => {
    // Initialize default data on first load
    initializeDefaultData();
    
    // Check if tracker feature is enabled
    const team = getTeam();
    setShowBetTracker(team?.features?.betTracker === true);
    
    // Handle routing
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path === '/designs') {
        setActiveTab('designs');
      } else if (path === '/debts-designs') {
        setActiveTab('debts-designs');
      } else if (path === '/color') {
        setActiveTab('color');
      } else if (path === '/' || path === '') {
        setActiveTab('dashboard');
      }
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'designs') {
      window.history.pushState({}, '', '/designs');
    } else if (tab === 'debts-designs') {
      window.history.pushState({}, '', '/debts-designs');
    } else if (tab === 'color') {
      window.history.pushState({}, '', '/color');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-game':
        return <AddGame />;
      case 'players':
        return <Players />;
      case 'debts':
        return <Debts />;
      case 'bet-tracker':
        return <BetTracker />;
      case 'designs':
        return <Designs />;
      case 'debts-designs':
        return <DebtsDesigns />;
      case 'color':
        return <ColorPalettes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="md:pl-64">
        {renderContent()}
      </div>
      {activeTab !== 'designs' && activeTab !== 'debts-designs' && activeTab !== 'color' && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} showBetTracker={showBetTracker} />}
      {(activeTab === 'designs' || activeTab === 'debts-designs' || activeTab === 'color') && (
        <div className="fixed bottom-4 right-4">
          <a
            href="/"
            className="bg-orange-500 border-4 border-black text-black px-6 py-3 rounded-none font-black  hover:bg-orange-600 transition-all"
          >
            Back to App
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
