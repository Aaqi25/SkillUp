import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { UserProfile } from '../../types/index.js';
import { Lock, Mail, AlertCircle, ArrowRight, LogIn, Sparkles } from 'lucide-react';

interface LoginProps {
  onSuccess: (user: UserProfile) => void;
  onSwitchToRegister: () => void;
  onQuickDemo: () => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onSuccess, onSwitchToRegister, onQuickDemo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login({
        email: email.trim().toLowerCase(),
        password,
      });
      onSuccess(response.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('student@skillup.ai');
    setPassword('StudentPass123!');
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
            <LogIn size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Sign In</h2>
          <p className="text-xs text-slate-500">
            Sign in to access your student profile and career trajectory.
          </p>
        </div>

        {/* Demo Account Helper Strip */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-900">
            <Sparkles size={14} className="text-blue-600 shrink-0" />
            <span>Try demo student credentials</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-300 transition-colors"
          >
            Auto-fill
          </button>
        </div>

        {error && (
          <div
            id="login-error-alert"
            className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={15} />
              </span>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@skillup.ai"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={15} />
              </span>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to SkillUp</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-slate-600">
            Don't have an account yet?{' '}
            <button
              id="btn-switch-to-register"
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold focus:outline-none"
            >
              Register here
            </button>
          </p>

          <button
            type="button"
            onClick={onQuickDemo}
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            Instant Demo Sign-in as Alex Morgan
          </button>
        </div>
      </div>
    </div>
  );
};
