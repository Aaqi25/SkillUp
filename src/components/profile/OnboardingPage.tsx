import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { UserProfile } from '../../types/index.js';
import {
  Compass,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';

interface OnboardingProps {
  user: UserProfile;
  onComplete: (updated: UserProfile) => void;
}

const CAREER_INTEREST_OPTIONS = [
  'Full Stack Engineer',
  'Backend Systems Engineer',
  'Frontend Architect',
  'Cloud & DevOps Engineer',
  'AI / Machine Learning Engineer',
  'Data Platform Engineer',
  'Mobile App Developer',
  'Security & Systems Specialist',
];

const LEARNING_PREFERENCE_OPTIONS = [
  'Hands-on Code Labs',
  'Real-world Architecture Projects',
  'Deep Technical Documentation',
  'Interactive Practice Questions',
  'Video & Visual Breakdowns',
  'System Design Blueprints',
];

export const OnboardingPage: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [educationLevel, setEducationLevel] = useState(user.educationLevel || 'Undergraduate');
  const [degreeCourse, setDegreeCourse] = useState(user.degreeCourse || 'Computer Science');
  const [academicYear, setAcademicYear] = useState(user.academicYear || 'Year 3');
  const [careerInterests, setCareerInterests] = useState<string[]>(
    user.careerInterests && user.careerInterests.length > 0
      ? user.careerInterests
      : ['Full Stack Engineer', 'Backend Systems Engineer']
  );
  const [learningPreferences, setLearningPreferences] = useState<string[]>(
    user.learningPreferences && user.learningPreferences.length > 0
      ? user.learningPreferences
      : ['Hands-on Code Labs', 'Real-world Architecture Projects']
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCareerInterest = (interest: string) => {
    if (careerInterests.includes(interest)) {
      setCareerInterests(careerInterests.filter(i => i !== interest));
    } else {
      setCareerInterests([...careerInterests, interest]);
    }
  };

  const togglePreference = (pref: string) => {
    if (learningPreferences.includes(pref)) {
      setLearningPreferences(learningPreferences.filter(p => p !== pref));
    } else {
      setLearningPreferences([...learningPreferences, pref]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (careerInterests.length === 0) {
      setError('Please select at least one career interest.');
      return;
    }

    if (learningPreferences.length === 0) {
      setError('Please select at least one learning preference.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await api.updateProfile({
        educationLevel,
        degreeCourse,
        academicYear,
        careerInterests,
        learningPreferences,
        onboardingCompleted: true,
      });
      onComplete(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles size={13} className="text-blue-600" />
            <span>Step 2 of Onboarding</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Personalize Your Student Trajectory
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Welcome, {user.fullName}! Customize your academic details and career aspirations so SkillUp AI can tailor your journey.
          </p>
        </div>

        {error && (
          <div
            id="onboarding-error-alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Academic Background */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-blue-600" />
              Academic Background
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Education Level
                </label>
                <select
                  value={educationLevel}
                  onChange={e => setEducationLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Bootcamp">Bootcamp / Accelerated</option>
                  <option value="Self-Taught">Self-Taught</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Major
                </label>
                <input
                  type="text"
                  value={degreeCourse}
                  onChange={e => setDegreeCourse(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Year
                </label>
                <select
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Year 1">Year 1</option>
                  <option value="Year 2">Year 2</option>
                  <option value="Year 3">Year 3</option>
                  <option value="Year 4">Year 4</option>
                  <option value="Final Year / Graduating">Final Year / Graduating</option>
                  <option value="Recent Graduate">Recent Graduate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Career Interests */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" />
                Target Career Interests (Select 1 or more)
              </h3>
              <span className="text-[11px] text-slate-400">
                {careerInterests.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAREER_INTEREST_OPTIONS.map(interest => {
                const selected = careerInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleCareerInterest(interest)}
                    className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      selected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{interest}</span>
                    {selected && <CheckCircle2 size={15} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Learning Preferences */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-600" />
                Preferred Learning Styles
              </h3>
              <span className="text-[11px] text-slate-400">
                {learningPreferences.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEARNING_PREFERENCE_OPTIONS.map(pref => {
                const selected = learningPreferences.includes(pref);
                return (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreference(pref)}
                    className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      selected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{pref}</span>
                    {selected && <CheckCircle2 size={15} className="text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="btn-complete-onboarding"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <span>Save Profile & View Dashboard</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
