import { Home, Users, Trophy, User, LogOut } from 'lucide-react';

interface AdminBottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
}

export default function AdminBottomNav({ activePage, onNavigate, onSignOut }: AdminBottomNavProps) {
  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'leagues', label: 'Leagues', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r-4 border-black z-50">
        <div className="flex flex-col justify-between items-start w-full h-full pt-6">
          <div className="w-full">
            {mainTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`w-full flex flex-row items-center justify-start gap-3 px-6 py-4 transition-all ${
                  activePage === id
                    ? 'bg-orange-500 text-black font-black border-l-4 border-black'
                    : 'text-black hover:bg-amber-400 font-bold'
                }`}
              >
                <Icon className={`w-6 h-6 flex-shrink-0 ${activePage === id ? 'scale-110' : ''} transition-transform`} />
                <span className="text-sm uppercase font-black">{label}</span>
              </button>
            ))}
          </div>
          {/* Sign Out at bottom */}
          <div className="w-full border-t-4 border-black">
            <button
              onClick={() => onSignOut()}
              className="w-full flex flex-row items-center justify-start gap-3 px-6 py-4 transition-all text-black hover:bg-red-600 hover:text-white font-bold"
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              <span className="text-sm uppercase font-black">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="flex justify-around items-center h-16">
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full px-1 transition-all ${
                activePage === id
                  ? 'bg-orange-500 text-black font-black'
                  : 'text-black hover:bg-amber-400 font-bold'
              }`}
            >
              <Icon className={`w-6 h-6 ${activePage === id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] sm:text-[11px] mt-0.5 uppercase leading-tight whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
