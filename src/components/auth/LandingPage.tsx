import React from 'react';
import {
  Compass,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  CheckCircle,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingProps> = ({ onGetStarted, onLogin, onTryDemo }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <Sparkles size={14} className="text-blue-600" />
              <span>Student Skill Assessment & Personalized Career Roadmap</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Bridge the gap between <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700">
                classroom learning
              </span>{' '}
              and industry careers.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              SkillUp AI evaluates your exact technical proficiencies through deterministic assessments, identifies real skill gaps, and sequences an adaptive roadmap toward your target role.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-landing-get-started"
                onClick={onGetStarted}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Student Account
                <ArrowRight size={16} />
              </button>

              <button
                id="btn-landing-login"
                onClick={onLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold shadow-xs transition-all"
              >
                Sign In to Account
              </button>

              <button
                id="btn-landing-try-demo"
                onClick={onTryDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50/60 text-xs font-semibold transition-all"
              >
                Explore as Alex (Demo Student)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10-Stage Learning Journey Preview */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">
              The SkillUp AI Journey
            </h2>
            <h3 className="text-2xl font-bold text-slate-900">
              From Baseline Assessment to Career Readiness
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              A structured 10-stage lifecycle designed for modern computer science & software engineering students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold">
                <GraduationCap size={20} />
              </div>
              <h4 className="text-base font-bold text-slate-900">1. Baseline Assessment</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete a curated diagnostic assessment across TypeScript, backend architecture, databases, and algorithms with 100% mathematical scoring.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold">
                <TrendingUp size={20} />
              </div>
              <h4 className="text-base font-bold text-slate-900">2. Skill Gap Analysis</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select your target career (e.g. Full Stack, Backend Systems) and view exact deterministic skill gaps measured against current market standards.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
                <Compass size={20} />
              </div>
              <h4 className="text-base font-bold text-slate-900">3. Adaptive Roadmap</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Follow milestone-driven learning paths, unlock curated practical resources, and take hybrid reassessments to dynamically update your verified profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Module 1 Focus Box */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck size={13} />
                <span>Active Phase: Module 1</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Authentication & Student Profile Foundation
              </h4>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                Create your student account, setup your academic background, select your career interests, and access your protected profile.
              </p>
            </div>
            <button
              id="btn-landing-start-now"
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0"
            >
              Start Student Onboarding
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
