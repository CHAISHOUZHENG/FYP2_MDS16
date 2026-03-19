import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthProps {
  onSuccess?: () => void;
  onBackToLanding?: () => void;
}

export function Auth({ onSuccess, onBackToLanding }: AuthProps) {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions to continue');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-cyan-100">
          <button
            onClick={onBackToLanding}
            className="mb-6 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            ← Back to Home
          </button>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
              StressKE
            </h1>
            <p className="text-slate-600 text-sm">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (e.target.checked) {
                    setError(null);
                  }
                }}
                className="w-5 h-5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer mt-0.5 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-cyan-600 hover:text-cyan-700 font-semibold">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-cyan-600 hover:text-cyan-700 font-semibold">
                  Privacy Policy
                </a>
              </label>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start">
                <AlertCircle className="w-5 h-5 text-rose-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-rose-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Sign Up
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="w-full mt-6 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
