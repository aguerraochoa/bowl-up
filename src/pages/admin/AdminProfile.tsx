import { LogOut } from 'lucide-react';

interface AdminProfileProps {
  onSignOut: () => void;
  onNavigate: (page: string) => void;
}

export default function AdminProfile({ onSignOut }: AdminProfileProps) {
  return (
    <div className="min-h-screen bg-orange-50 pb-20 lg:pb-6 safe-top relative">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-black uppercase">Admin Profile</h1>
          <button
            onClick={onSignOut}
            className="flex items-center justify-center bg-orange-500 border-4 border-black text-black px-3 py-2 rounded-none font-black hover:bg-orange-600 transition-all"
          >
            <LogOut className="w-5 h-5 sm:w-5 md:w-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="bg-white border-4 border-black p-6">
          <h2 className="text-xl font-black text-black mb-4 uppercase">Admin Account</h2>
          <p className="text-black font-bold mb-4">
            This is your admin profile. Additional settings and options will be available here in the future.
          </p>
        </div>
      </div>
    </div>
  );
}
