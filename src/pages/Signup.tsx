import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAllLeagues } from '../utils/storage';
import { t } from '../i18n';
import type { League } from '../types';
import { Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const isValidUsername = (value: string): boolean => /^[a-z0-9._]{3,20}$/.test(value);

  useEffect(() => {
    if (usernameTouched) return;

    const suggestion = teamName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._]+/g, '')
      .slice(0, 20);

    setUsername(suggestion);
  }, [teamName, usernameTouched]);

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const allLeagues = await getAllLeagues();
        setLeagues(allLeagues);
      } catch (err) {
        console.error('Error loading leagues:', err);
      } finally {
        setLoadingLeagues(false);
      }
    };
    loadLeagues();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (!isValidUsername(normalizedUsername)) {
      setError(t('signup.usernameInvalid'));
      return;
    }

    setLoading(true);

    try {
      // Sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            team_name: teamName.trim(),
            league_id: selectedLeagueId ?? null,
            username: normalizedUsername,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Failed to create user account');
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user.email_confirmed_at || data.session) {
        window.location.href = '/';
      } else {
        setError('Please check your email to confirm your account');
      }
    } catch {
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

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('signup.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder={t('signup.enterEmail')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('signup.teamName')}
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder={t('signup.enterTeamName')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('signup.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setUsername(e.target.value.toLowerCase());
                }}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder={t('signup.enterUsername')}
                required
              />
              <p className="text-xs text-black font-bold mt-2">{t('signup.usernameHelp')}</p>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('signup.league')}
              </label>
              <select
                value={selectedLeagueId || ''}
                onChange={(e) => setSelectedLeagueId(e.target.value || null)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                disabled={loadingLeagues}
              >
                <option value="">{t('signup.selectLeague')}</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                  placeholder="Enter password (min 6 characters)"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                  placeholder="Confirm password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-orange-500 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              disabled={loading || loadingLeagues || !isValidUsername(username.trim().toLowerCase())}
              className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t('signup.creatingAccount') : t('signup.createAccount')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-black font-bold">
              {t('signup.haveAccount')}{' '}
              <a
                href="/login"
                className="text-orange-500 font-black hover:underline"
              >
                {t('login.signIn')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
