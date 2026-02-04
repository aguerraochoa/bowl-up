import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      // Sign up with email and password, including team name in metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            team_name: teamName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        // Update the team name (trigger creates team, but we need to update the name)
        const { error: updateError } = await supabase
          .from('teams')
          .update({ name: teamName })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Error updating team name:', updateError);
        }

        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          window.location.href = '/';
        } else {
          setError('Please check your email to confirm your account');
        }
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
        <div className="flex justify-center mb-8">
          <img src="/logo_text.png" alt="BowlUp" className="h-28 w-auto" />
        </div>
        <div className="bg-white border-4 border-black p-6 sm:p-8">
          <p className="text-sm text-black font-bold mb-6 text-center">
            Create your team account
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="Enter your team name"
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
                placeholder="Enter password (min 6 characters)"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="Confirm password"
                required
                minLength={6}
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-black font-bold">
              Already have an account?{' '}
              <a
                href="/login"
                className="text-orange-500 font-black hover:underline"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
