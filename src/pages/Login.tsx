import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // email or team name
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let email = identifier;

      // Check if identifier is a team name (not an email)
      if (!identifier.includes('@')) {
        // Use database function to get user email by team name
        const { data: userEmail, error: emailError } = await supabase.rpc('get_user_email_by_team_name', {
          team_name: identifier
        });

        if (emailError || !userEmail) {
          setError('Team name not found');
          setLoading(false);
          return;
        }

        email = userEmail;
      }

      // Sign in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        window.location.href = '/';
      }
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
            <img src="/logo_text.png" alt="BowlUp" className="h-16 w-auto" />
          </div>
          <p className="text-sm text-black font-bold mb-6 text-center">
            Sign in to your team
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Email or Team Name
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="Enter email or team name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="Enter password"
                required
              />
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
              Don't have an account?{' '}
              <a
                href="/signup"
                className="text-orange-500 font-black hover:underline"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
