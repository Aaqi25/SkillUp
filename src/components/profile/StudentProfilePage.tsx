import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { UserProfile } from '../../types/index.js';
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Compass,
  Calendar,
  Edit3,
  Check,
  X,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ProfileProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onStartAssessment?: () => void;
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

export const StudentProfilePage: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable Form State
  const [fullName, setFullName] = useState(user.fullName || '');
  const [educationLevel, setEducationLevel] = useState(user.educationLevel || 'Undergraduate');
  const [degreeCourse, setDegreeCourse] = useState(user.degreeCourse || 'Computer Science');
  const [academicYear, setAcademicYear] = useState(user.academicYear || 'Year 3');
  const [careerInterests, setCareerInterests] = useState<string[]>(user.careerInterests || []);
  const [learningPreferences, setLearningPreferences] = useState<string[]>(user.learningPreferences || []);

  const handleStartEdit = () => {
    setFullName(user.fullName || '');
    setEducationLevel(user.educationLevel || 'Undergraduate');
    setDegreeCourse(user.degreeCourse || 'Computer Science');
    setAcademicYear(user.academicYear || 'Year 3');
    setCareerInterests(user.careerInterests || []);
    setLearningPreferences(user.learningPreferences || []);
    setError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const toggleInterest = (interest: string) => {
    if (careerInterests.includes(interest)) {
      setCareerInterests(careerInterests.filter(i => i !== interest));
    } else {
      setCareerInterests([...careerInterests, interest]);
    }
  };

  const togglePref = (pref: string) => {
    if (learningPreferences.includes(pref)) {
      setLearningPreferences(learningPreferences.filter(p => p !== pref));
    } else {
      setLearningPreferences([...learningPreferences, pref]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const updated = await api.updateProfile({
        fullName: fullName.trim(),
        educationLevel,
        degreeCourse: degreeCourse.trim(),
        academicYear,
        careerInterests,
        learningPreferences,
        onboardingCompleted: true,
      });

      onUpdateUser(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update student profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'ST';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Save Success Banner */}
      {saveSuccess && (
        <div
          id="profile-saved-banner"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs transition-all"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold">Student profile updated successfully!</span>
          </div>
          <span className="text-[11px] text-emerald-700">Changes saved to PostgreSQL database</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {user.role}
                </span>
                {user.onboardingCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                <span>{user.email}</span>
                <span className="text-slate-300">•</span>
                <Calendar size={13} className="text-slate-400" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              id="btn-edit-profile"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-colors"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors"
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* Edit Form OR Read-Only Display */}
        {isEditing ? (
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                  Major / Degree Course
                </label>
                <input
                  type="text"
                  value={degreeCourse}
                  onChange={e => setDegreeCourse(e.target.value)}
                  placeholder="e.g. Computer Science & Software Engineering"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year
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

            {/* Career Interests Multi-select */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Target Career Interests
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAREER_INTEREST_OPTIONS.map(interest => {
                  const selected = careerInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${
                        selected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{interest}</span>
                      {selected && <Check size={14} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Learning Preferences Multi-select */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Learning Preferences
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEARNING_PREFERENCE_OPTIONS.map(pref => {
                  const selected = learningPreferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => togglePref(pref)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{pref}</span>
                      {selected && <Check size={14} className="text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-save-profile"
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <span>Saving...</span> : <span>Save Profile Changes</span>}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Academic Info */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap size={15} className="text-blue-600" />
                Academic Background
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Level:</span>
                  <span className="font-semibold text-slate-800">
                    {user.educationLevel || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Degree / Major:</span>
                  <span className="font-semibold text-slate-800">
                    {user.degreeCourse || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Academic Year:</span>
                  <span className="font-semibold text-slate-800">
                    {user.academicYear || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Career Interests */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Compass size={15} className="text-blue-600" />
                Career Interests
              </h3>

              {user.careerInterests && user.careerInterests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.careerInterests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No career interests selected yet.</p>
              )}
            </div>

            {/* Learning Preferences */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen size={15} className="text-indigo-600" />
                Learning Preferences
              </h3>

              {user.learningPreferences && user.learningPreferences.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.learningPreferences.map((pref, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {pref}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No preferences set.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Step Teaser Banner (Ready for Module 2: Assessment) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 text-blue-200 px-2.5 py-0.5 rounded-full">
            <Sparkles size={12} />
            <span>Next in Progression: Module 2</span>
          </div>
          <h4 className="text-base font-bold">Initial Diagnostic Skill Assessment</h4>
          <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
            Once your profile is set, the next phase will evaluate your baseline skills in TypeScript, Node.js, and Databases with 100% curated, deterministic questions.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20">
            Profile Active
          </span>
        </div>
      </div>
    </div>
  );
};
