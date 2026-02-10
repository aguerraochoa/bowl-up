import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import BottomNav from './components/BottomNav';
import AdminBottomNav from './components/AdminBottomNav';
import DisabledTeam from './components/DisabledTeam';
import Dashboard from './pages/Dashboard';
import AddGame from './pages/AddGame';
import Players from './pages/Players';
import Debts from './pages/Debts';
import BetTracker from './pages/BetTracker';
import Profile from './pages/Profile';
import WeeklyReport from './pages/WeeklyReport';
import HeadToHead from './pages/HeadToHead';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { supabase } from './lib/supabase';
import { initializeDefaultData, clearCache, checkTeamEnabled } from './utils/storage';
import { isUserAdmin } from './utils/adminStorage';
import { SeasonProvider } from './contexts/SeasonContext';

// Lazy load admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'));
const AdminLeagues = lazy(() => import('./pages/admin/AdminLeagues'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));

// Lazy load design/preview pages (rarely used)
const Designs = lazy(() => import('./pages/Designs'));
const DebtsDesigns = lazy(() => import('./pages/DebtsDesigns'));
const ColorPalettes = lazy(() => import('./pages/ColorPalettes'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="text-black font-black text-xl">Loading...</div>
    </div>
  );
}

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [teamEnabled, setTeamEnabled] = useState<boolean | null>(null);
  const [adminPage, setAdminPage] = useState<string>('dashboard');
  const hasInitializedRef = useRef(false);

  // Save activeTab to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab !== 'login' && activeTab !== 'signup') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    // Check authentication state
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // ALWAYS set loading to false immediately - don't block on admin checks
      setLoading(false);
      
      if (session?.user) {
        // Default to regular user - check admin status in background (non-blocking)
        setIsAdmin(false);
        setTeamEnabled(true);
        
        // Check admin/team status in background (don't block app loading)
        (async () => {
          try {
            const admin = await isUserAdmin();
            setIsAdmin(admin);
            
            if (!admin) {
              const enabled = await checkTeamEnabled();
              setTeamEnabled(enabled);
            } else {
              setTeamEnabled(true);
            }
          } catch (error) {
            console.error('Error checking user access (non-blocking):', error);
            // Keep defaults (regular user, enabled)
          }
        })();
      } else {
        // No user - reset states
        setIsAdmin(null);
        setTeamEnabled(null);
        hasInitializedRef.current = false;
      }
    }).catch((error) => {
      console.error('Error getting session:', error);
      // On error, reset states and allow login
      setUser(null);
      setIsAdmin(null);
      setTeamEnabled(null);
      hasInitializedRef.current = false;
      setLoading(false);
    });
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Default to regular user immediately
        setIsAdmin(false);
        setTeamEnabled(true);
        
        // Check admin/team status in background (non-blocking)
        (async () => {
          try {
            const admin = await isUserAdmin();
            setIsAdmin(admin);
            
            if (!admin) {
              const enabled = await checkTeamEnabled();
              setTeamEnabled(enabled);
            } else {
              setTeamEnabled(true);
            }
          } catch (error) {
            console.error('Error checking user access on auth change (non-blocking):', error);
            // Keep defaults
          }
        })();
      } else {
        // User signed out - reset everything and stop checking
        setIsAdmin(null);
        setTeamEnabled(null);
        hasInitializedRef.current = false;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || hasInitializedRef.current) {
      return;
    }

    // Initialize default data on first load
    initializeDefaultData();

    // Handle routing only on initial mount
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        const adminPath = path.replace('/admin', '').replace('/', '') || 'dashboard';
        setAdminPage(adminPath === 'login' ? 'login' : adminPath || 'dashboard');
      } else if (path === '/login' || path === '/signup') {
        setActiveTab('dashboard');
        window.history.replaceState({}, '', '/');
      } else if (path === '/designs') {
        setActiveTab('designs');
      } else if (path === '/debts-designs') {
        setActiveTab('debts-designs');
      } else if (path === '/color') {
        setActiveTab('color');
      } else if (path === '/weekly-report') {
        setActiveTab('weekly-report');
      } else if (path === '/head-to-head') {
        setActiveTab('head-to-head');
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
    hasInitializedRef.current = true;
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      hasInitializedRef.current = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCache(); // Clear cache on logout
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
    } else if (tab === 'weekly-report') {
      window.history.pushState({}, '', '/weekly-report');
    } else if (tab === 'head-to-head') {
      window.history.pushState({}, '', '/head-to-head');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleAdminNavigate = (page: string) => {
    setAdminPage(page);
    window.history.pushState({}, '', `/admin/${page}`);
  };

  // Show login/signup if not authenticated
  // Only show loading if we're actually loading the session, not checking access
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Check if we're on admin login path - show AdminLogin
    const currentPath = window.location.pathname;
    if (currentPath === '/admin/login' || currentPath.startsWith('/admin/login')) {
      return <Suspense fallback={<LoadingSpinner />}><AdminLogin /></Suspense>;
    }
    if (activeTab === 'signup' || currentPath === '/signup') {
      return <Signup />;
    }
    return <Login />;
  }

  // Check if we're on an admin path - if so, don't render normal user layout
  const isAdminPath = window.location.pathname.startsWith('/admin');
  
  // Admin checks happen in background - don't block rendering
  // Default to regular user if states are null (admin check still running)
  const effectiveIsAdmin = isAdmin ?? false;
  const effectiveTeamEnabled = teamEnabled ?? true;

  // If on admin path, wait for admin check before rendering normal user layout
  // This prevents the flash of normal user layout
  if (isAdminPath && isAdmin === null) {
    return <LoadingSpinner />;
  }

  // Check if user is admin (no team) - route to admin portal
  if (effectiveIsAdmin === true) {
    if (adminPage === 'login') {
      return <Suspense fallback={<LoadingSpinner />}><AdminLogin /></Suspense>;
    }

    const handleAdminSignOut = async () => {
      await supabase.auth.signOut();
      clearCache();
      setUser(null);
      setAdminPage('login');
      window.history.pushState({}, '', '/admin/login');
    };

    return (
      <div className="min-h-screen bg-orange-50">
        <div className="lg:pl-64">
          {adminPage === 'dashboard' && <Suspense fallback={<LoadingSpinner />}><AdminDashboard onSignOut={handleAdminSignOut} onNavigate={handleAdminNavigate} /></Suspense>}
          {adminPage === 'teams' && <Suspense fallback={<LoadingSpinner />}><AdminTeams onSignOut={handleAdminSignOut} onNavigate={handleAdminNavigate} /></Suspense>}
          {adminPage === 'leagues' && <Suspense fallback={<LoadingSpinner />}><AdminLeagues onSignOut={handleAdminSignOut} onNavigate={handleAdminNavigate} /></Suspense>}
          {adminPage === 'profile' && <Suspense fallback={<LoadingSpinner />}><AdminProfile onSignOut={handleAdminSignOut} onNavigate={handleAdminNavigate} /></Suspense>}
          {!['dashboard', 'teams', 'leagues', 'profile'].includes(adminPage) && (
            <Suspense fallback={<LoadingSpinner />}><AdminDashboard onSignOut={handleAdminSignOut} onNavigate={handleAdminNavigate} /></Suspense>
          )}
        </div>
        <AdminBottomNav activePage={adminPage} onNavigate={handleAdminNavigate} onSignOut={handleAdminSignOut} />
      </div>
    );
  }

  // Check if team is disabled
  // Only show disabled screen if we're certain the user is not an admin AND team is disabled
  // Also don't show if we're on an admin path (user might be navigating)
  if (!isAdminPath && effectiveIsAdmin === false && effectiveTeamEnabled === false) {
    return <DisabledTeam />;
  }

  // If on admin path but not an admin, show loading (might be checking)
  if (isAdminPath && effectiveIsAdmin === false) {
    return <LoadingSpinner />;
  }

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
      case 'profile':
        return <Profile onSignOut={handleSignOut} />;
      case 'weekly-report':
        return <WeeklyReport />;
      case 'head-to-head':
        return <HeadToHead />;
      case 'designs':
        return <Suspense fallback={<LoadingSpinner />}><Designs /></Suspense>;
      case 'debts-designs':
        return <Suspense fallback={<LoadingSpinner />}><DebtsDesigns /></Suspense>;
      case 'color':
        return <Suspense fallback={<LoadingSpinner />}><ColorPalettes /></Suspense>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SeasonProvider>
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
    </SeasonProvider>
  );
}

export default App;
