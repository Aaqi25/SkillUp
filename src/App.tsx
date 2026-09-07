/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, authStorage } from './services/api.js';
import { UserProfile } from './types/index.js';
import { LandingPage } from './components/auth/LandingPage.js';
import { RegisterPage } from './components/auth/RegisterPage.js';
import { LoginPage } from './components/auth/LoginPage.js';
import { OnboardingPage } from './components/profile/OnboardingPage.js';
import { StudentProfilePage } from './components/profile/StudentProfilePage.js';
import { AssessmentFlow } from './components/assessment/AssessmentFlow.js';
import {
  GraduationCap,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Loader2,
  FileCheck2,
} from 'lucide-react';

type ScreenState = 'landing' | 'register' | 'login' | 'onboarding' | 'profile' | 'assessment';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function checkSession() {
      const token = authStorage.getToken();
      if (!token) {
        setIsLoadingSession(false);
        return;
      }

      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        if (!user.onboardingCompleted) {
          setCurrentScreen('onboarding');
        } else {
          setCurrentScreen('profile');
        }
      } catch {
        authStorage.clearToken();
        setCurrentUser(null);
        setCurrentScreen('landing');
      } finally {
        setIsLoadingSession(false);
      }
    }

    checkSession();
  }, []);

  const handleRegisterSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentScreen('onboarding');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (!user.onboardingCompleted) {
      setCurrentScreen('onboarding');
    } else {
      setCurrentScreen('profile');
    }
  };

  const handleQuickDemoLogin = async () => {
    try {
      setIsLoadingSession(true);
      const res = await api.login({
        email: 'student@skillup.ai',
        password: 'StudentPass123!',
      });
      setCurrentUser(res.user);
      setCurrentScreen('profile');
    } catch (err) {
      console.error('Demo login failed:', err);
      setCurrentScreen('login');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleOnboardingComplete = (updated: UserProfile) => {
    setCurrentUser(updated);
    setCurrentScreen('profile');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear token regardless
    } finally {
      setCurrentUser(null);
      setCurrentScreen('landing');
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span>Verifying student session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Universal Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <button
            onClick={() => {
              if (currentUser) {
                setCurrentScreen('profile');
              } else {
                setCurrentScreen('landing');
              }
            }}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm font-black text-lg">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">
                  SkillUp AI
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                  Student Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Skill Assessment & Career Roadmap
              </p>
            </div>
          </button>

          {/* Right Navigation / Session Controls */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Take / View Assessment Button */}
                <button
                  id="btn-nav-assessment"
                  onClick={() => setCurrentScreen('assessment')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentScreen === 'assessment'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/50'
                  }`}
                >
                  <FileCheck2 size={14} />
                  <span>Assessment</span>
                </button>

                {/* Active Student Pill */}
                <button
                  onClick={() => setCurrentScreen('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    currentScreen === 'profile'
                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                    {currentUser.fullName ? currentUser.fullName[0] : 'S'}
                  </div>
                  <span className="hidden sm:inline">{currentUser.fullName}</span>
                </button>

                {/* Logout Button */}
                <button
                  id="btn-nav-logout"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  title="Sign out of student account"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {currentScreen !== 'login' && (
                  <button
                    id="btn-nav-login"
                    onClick={() => setCurrentScreen('login')}
                    className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
                  >
                    Sign In
                  </button>
                )}

                {currentScreen !== 'register' && (
                  <button
                    id="btn-nav-register"
                    onClick={() => setCurrentScreen('register')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Get Started
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1">
        {currentScreen === 'landing' && (
          <LandingPage
            onGetStarted={() => setCurrentScreen('register')}
            onLogin={() => setCurrentScreen('login')}
            onTryDemo={handleQuickDemoLogin}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterPage
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setCurrentScreen('register')}
            onQuickDemo={handleQuickDemoLogin}
          />
        )}

        {currentScreen === 'onboarding' && currentUser && (
          <OnboardingPage
            user={currentUser}
            onComplete={handleOnboardingComplete}
          />
        )}

        {currentScreen === 'profile' && currentUser && (
          <StudentProfilePage
            user={currentUser}
            onUpdateUser={updated => setCurrentUser(updated)}
            onStartAssessment={() => setCurrentScreen('assessment')}
          />
        )}

        {currentScreen === 'assessment' && currentUser && (
          <AssessmentFlow
            user={currentUser}
            onReturnToProfile={() => setCurrentScreen('profile')}
            onAssessmentCompleted={() => {
              // Refresh user profile after assessment completion
              api.getCurrentUser().then(refreshed => {
                setCurrentUser(refreshed);
              }).catch(() => {});
            }}
          />
        )}
      </main>

      {/* Platform Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SkillUp AI • Module 1 & 2: Auth, Profile & Diagnostic Assessment</span>
          <span className="text-slate-400">
            Deterministic Engine • In-Memory PostgreSQL Store • Verified Question Bank
          </span>
        </div>
      </footer>
    </div>
  );
}
