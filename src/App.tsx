import { useState, useEffect, lazy, Suspense } from 'react';
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';
import { initializeDefaultData, getTeam } from './utils/storage';

// Lazy load main pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddGame = lazy(() => import('./pages/AddGame'));
const Players = lazy(() => import('./pages/Players'));
const Debts = lazy(() => import('./pages/Debts'));
const BetTracker = lazy(() => import('./pages/BetTracker'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

// Lazy load design/preview pages (rarely used)
const Designs = lazy(() => import('./pages/Designs'));
const DebtsDesigns = lazy(() => import('./pages/DebtsDesigns'));
const ColorPalettes = lazy(() => import('./pages/ColorPalettes'));

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBetTracker, setShowBetTracker] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setShowBetTracker(false);
      return;
    }

    // Initialize default data on first load
    initializeDefaultData();
    
    // Check if tracker feature is enabled
    getTeam().then(team => {
      if (team) {
        setShowBetTracker(team.features?.betTracker === true);
      } else {
        setShowBetTracker(false);
      }
    }).catch(error => {
      console.error('Error loading team:', error);
      setShowBetTracker(false);
    });
    
    // Handle routing
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path === '/login') {
        setActiveTab('login');
      } else if (path === '/signup') {
        setActiveTab('signup');
      } else if (path === '/designs') {
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
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowBetTracker(false);
    setActiveTab('login');
    window.history.pushState({}, '', '/login');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'login') {
      window.history.pushState({}, '', '/login');
    } else if (tab === 'signup') {
      window.history.pushState({}, '', '/signup');
    } else if (tab === 'designs') {
      window.history.pushState({}, '', '/designs');
    } else if (tab === 'debts-designs') {
      window.history.pushState({}, '', '/debts-designs');
    } else if (tab === 'color') {
      window.history.pushState({}, '', '/color');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Show login/signup if not authenticated
  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-black font-black text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    const LoadingSpinner = () => (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-black font-black text-xl">Loading...</div>
      </div>
    );
    if (activeTab === 'signup' || window.location.pathname === '/signup') {
      return <Suspense fallback={<LoadingSpinner />}><Signup /></Suspense>;
    }
    return <Suspense fallback={<LoadingSpinner />}><Login /></Suspense>;
  }

  const LoadingSpinner = () => (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="text-black font-black text-xl">Loading...</div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>;
      case 'add-game':
        return <Suspense fallback={<LoadingSpinner />}><AddGame /></Suspense>;
      case 'players':
        return <Suspense fallback={<LoadingSpinner />}><Players /></Suspense>;
      case 'debts':
        return <Suspense fallback={<LoadingSpinner />}><Debts /></Suspense>;
      case 'bet-tracker':
        return <Suspense fallback={<LoadingSpinner />}><BetTracker /></Suspense>;
      case 'designs':
        return <Suspense fallback={<LoadingSpinner />}><Designs /></Suspense>;
      case 'debts-designs':
        return <Suspense fallback={<LoadingSpinner />}><DebtsDesigns /></Suspense>;
      case 'color':
        return <Suspense fallback={<LoadingSpinner />}><ColorPalettes /></Suspense>;
      default:
        return <Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>;
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="md:pl-64">
        {renderContent()}
      </div>
      {activeTab !== 'designs' && activeTab !== 'debts-designs' && activeTab !== 'color' && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} showBetTracker={showBetTracker} onSignOut={handleSignOut} />}
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
