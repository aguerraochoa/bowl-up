import { Home, Plus, Users, DollarSign, Target, LogOut } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showBetTracker?: boolean;
  onSignOut?: () => void;
}

export default function BottomNav({ activeTab, onTabChange, showBetTracker = false, onSignOut }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'add-game', label: 'Add Game', icon: Plus },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'debts', label: 'Debts', icon: DollarSign },
    ...(showBetTracker ? [{ id: 'bet-tracker', label: 'Tracker', icon: Target }] : []),
    { id: 'sign-out', label: 'Sign Out', icon: LogOut },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r-4 border-black z-50">
        <div className="flex flex-col justify-between items-start w-full h-full pt-6">
          <div className="w-full">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  if (id === 'sign-out' && onSignOut) {
                    onSignOut();
                  } else if (id !== 'sign-out') {
                    onTabChange(id);
                  }
                }}
                className={`w-full flex flex-row items-center justify-start gap-3 px-6 py-4 transition-all ${
                  activeTab === id
                    ? id === 'sign-out'
                      ? 'bg-red-600 text-white font-black border-l-4 border-black'
                      : 'bg-orange-500 text-black font-black border-l-4 border-black'
                    : id === 'sign-out'
                      ? 'text-black hover:bg-red-600 hover:text-white font-bold'
                      : 'text-black hover:bg-amber-400 font-bold'
                }`}
              >
                <Icon className={`w-6 h-6 flex-shrink-0 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
                <span className="text-sm uppercase font-black">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black safe-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'sign-out' && onSignOut) {
                  onSignOut();
                } else if (id !== 'sign-out') {
                  onTabChange(id);
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                activeTab === id
                  ? id === 'sign-out'
                    ? 'bg-red-600 text-white font-black'
                    : 'bg-orange-500 text-black font-black'
                  : id === 'sign-out'
                    ? 'text-black hover:bg-red-600 hover:text-white font-bold'
                    : 'text-black hover:bg-amber-400 font-bold'
              }`}
            >
              <Icon className={`w-6 h-6 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs mt-1 uppercase">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
