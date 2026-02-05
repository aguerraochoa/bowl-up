import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isUserAdmin } from '../../utils/adminStorage';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Check if user is admin (no team)
      const admin = await isUserAdmin();
      if (!admin) {
        setError('This account is not an admin account');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <img src="/logo_text.png" alt="BowlUp" className="h-32 w-auto" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-black mb-2 text-center uppercase">
              Admin Login
            </h1>
            <p className="text-sm text-gray-600 text-center font-bold">
              Administrator access only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="admin@bowlup.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-orange-500 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-black font-bold">
              Regular user?{' '}
              <a
                href="/login"
                className="text-orange-500 font-black hover:underline"
              >
                Go to Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
