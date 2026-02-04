import { useState, useEffect, lazy, Suspense } from 'react';
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';
import { initializeDefaultData } from './utils/storage';

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
  // Initialize activeTab from sessionStorage or default to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('activeTab');
      if (savedTab) {
        return savedTab;
      }
    }
    return 'dashboard';
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Save activeTab to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab !== 'login' && activeTab !== 'signup') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

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
      return;
    }

    // Only initialize once
    if (!hasInitialized) {
      // Initialize default data on first load
      initializeDefaultData();
      
      // Handle routing only on initial mount
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
          // Only set to dashboard if no saved tab exists
          const savedTab = sessionStorage.getItem('activeTab');
          if (savedTab && savedTab !== 'login' && savedTab !== 'signup') {
            setActiveTab(savedTab);
          } else {
            setActiveTab('dashboard');
          }
        }
      };

      handleRoute();
      setHasInitialized(true);
      window.addEventListener('popstate', handleRoute);
      return () => window.removeEventListener('popstate', handleRoute);
    }
  }, [user, hasInitialized]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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

  // Empty fallback for main pages - they have their own loading states
  const EmptyFallback = () => null;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Suspense fallback={<EmptyFallback />}><Dashboard /></Suspense>;
      case 'add-game':
        return <Suspense fallback={<EmptyFallback />}><AddGame /></Suspense>;
      case 'players':
        return <Suspense fallback={<EmptyFallback />}><Players /></Suspense>;
      case 'debts':
        return <Suspense fallback={<EmptyFallback />}><Debts /></Suspense>;
      case 'bet-tracker':
        return <Suspense fallback={<EmptyFallback />}><BetTracker /></Suspense>;
      case 'designs':
        return <Suspense fallback={<LoadingSpinner />}><Designs /></Suspense>;
      case 'debts-designs':
        return <Suspense fallback={<LoadingSpinner />}><DebtsDesigns /></Suspense>;
      case 'color':
        return <Suspense fallback={<LoadingSpinner />}><ColorPalettes /></Suspense>;
      default:
        return <Suspense fallback={<EmptyFallback />}><Dashboard /></Suspense>;
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="lg:pl-64">
        {renderContent()}
      </div>
      {activeTab !== 'designs' && activeTab !== 'debts-designs' && activeTab !== 'color' && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />}
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
