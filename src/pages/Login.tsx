import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '../i18n';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let emailForLogin = identifier.trim().toLowerCase();

      if (!emailForLogin.includes('@')) {
        const { data: resolvedEmail, error: resolverError } = await supabase.rpc('get_user_email_by_username', {
          p_username: emailForLogin,
        });

        if (resolverError) {
          setError(t('login.invalidCredentials'));
          setLoading(false);
          return;
        }

        emailForLogin = resolvedEmail || `unknown+${emailForLogin}@invalid.local`;
      }

      // Sign in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailForLogin,
        password,
      });

      if (signInError) {
        setError(t('login.invalidCredentials'));
      } else {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch {
      setError(t('login.invalidCredentials'));
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('login.emailOrUsername')}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder={t('login.enterEmailOrUsername')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                  placeholder={t('login.enterPassword')}
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
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-black font-bold">
              {t('login.noAccount')}{' '}
              <a
                href="/signup"
                className="text-orange-500 font-black hover:underline"
              >
                {t('login.signUp')}
              </a>
            </p>
            <p className="text-sm text-black font-bold">
              Are you an administrator?{' '}
              <a
                href="/admin/login"
                className="text-orange-500 font-black hover:underline"
              >
                Admin Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
