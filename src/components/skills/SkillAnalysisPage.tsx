import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Award,
  Calendar,
  ArrowLeft,
  Play,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Sparkles,
  Compass,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { UserProfile, StudentSkillProfile, StudentSkillScore, ProficiencyLevel, SkillItem } from '../../types/index.js';

interface SkillAnalysisPageProps {
  user: UserProfile;
  onNavigateToAssessment: () => void;
  onNavigateToProfile: () => void;
  onNavigateToCareers?: () => void;
}

export const SkillAnalysisPage: React.FC<SkillAnalysisPageProps> = ({
  user,
  onNavigateToAssessment,
  onNavigateToProfile,
  onNavigateToCareers,
}) => {
  const [profile, setProfile] = useState<StudentSkillProfile | null>(null);
  const [allTaxonomySkills, setAllTaxonomySkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillForHistory, setSelectedSkillForHistory] = useState<StudentSkillScore | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const loadSkillProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, skillsData] = await Promise.all([
        api.getSkillProfile(),
        api.getSkills(),
      ]);
      setProfile(profileData);
      setAllTaxonomySkills(skillsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load skill profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkillProfile();
  }, []);

  const getLevelBadgeStyles = (level: ProficiencyLevel) => {
    switch (level) {
      case 'Expert':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Advanced':
        return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'Intermediate':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Basic':
        return 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
      case 'Beginner':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-slate-400';
  };

  if (loading) {
    return (
      <div id="skills-loading" className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-full mb-4 animate-pulse">
          <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Analyzing Student Skill Competencies...
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Executing deterministic scoring algorithms across your assessment history.
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div id="skills-error" className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 dark:text-red-200">Unable to Load Skill Analysis</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error || 'Unknown error occurred'}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              id="retry-skills-btn"
              onClick={loadSkillProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <button
              id="back-profile-error-btn"
              onClick={onNavigateToProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAssessments = profile.skills.length > 0;
  const categories: string[] = Array.from(new Set(profile.skills.map((s) => s.category)));

  const filteredSkills = activeCategoryFilter === 'all'
    ? profile.skills
    : profile.skills.filter((s) => s.category === activeCategoryFilter);

  // Identify skills from taxonomy that are not yet assessed
  const assessedSkillIdSet = new Set(profile.skills.map(s => s.skillId));
  const unassessedTaxonomySkills = allTaxonomySkills.filter(s => !assessedSkillIdSet.has(s.id));

  return (
    <div id="skill-analysis-page" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Module 3: Skill Analysis Engine
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Skill Competency Intelligence
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Deterministic evaluation of your technical proficiencies based on verified assessment performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToCareers && (
            <button
              id="nav-to-careers-btn"
              onClick={onNavigateToCareers}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <Compass className="w-4 h-4 text-blue-600" /> Career Matches
            </button>
          )}
          <button
            id="nav-back-profile-btn"
            onClick={onNavigateToProfile}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </button>
          <button
            id="nav-take-assessment-btn"
            onClick={onNavigateToAssessment}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Play className="w-4 h-4" /> Take Assessment
          </button>
        </div>
      </div>

      {/* Main Overall Profile Summary Card */}
      <div id="overall-skill-summary" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Big Score Gauge Block */}
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-6 md:pb-0 md:pr-6 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Composite Score
            </span>
            <div className="mt-2 flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                {profile.overallScore}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-lg font-semibold">/ 100</span>
            </div>
            <div className="mt-3">
              <span
                id="overall-proficiency-badge"
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getLevelBadgeStyles(
                  profile.overallLevel
                )}`}
              >
                Level: {profile.overallLevel}
              </span>
            </div>
          </div>

          {/* Quick Metrics & Assessment Info */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Questions Assessed
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {profile.totalQuestionsAttempted}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {profile.totalCorrectAnswers} answered correctly
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <Award className="w-4 h-4 text-emerald-500" /> Assessed Skills
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {profile.skills.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Across {categories.length || 1} competencies
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <Calendar className="w-4 h-4 text-blue-500" /> Last Assessed
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {profile.lastAssessedDate
                  ? new Date(profile.lastAssessedDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Pending Assessment'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {profile.assessmentCount} diagnostic {profile.assessmentCount === 1 ? 'attempt' : 'attempts'}
              </div>
            </div>
          </div>
        </div>

        {/* Centralized Proficiency Scale Legend */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Proficiency Rating Scale (Deterministic Thresholds):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className="font-bold">0–19</span>: Beginner
            </div>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300">
              <span className="font-bold">20–39</span>: Basic
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
              <span className="font-bold">40–59</span>: Intermediate
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
              <span className="font-bold">60–79</span>: Advanced
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
              <span className="font-bold">80–100</span>: Expert
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Strongest vs Top 3 Weakest (Skills to Improve) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strongest Skills */}
        <div
          id="strongest-skills-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Strongest Competencies (Top 3)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your highest verified proficiencies</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Strengths
            </span>
          </div>

          {profile.strongestSkills.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              Complete an assessment to reveal your strongest skills.
            </div>
          ) : (
            <div className="space-y-3">
              {profile.strongestSkills.map((skill, index) => (
                <div
                  key={skill.skillId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {skill.skillName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {skill.category.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{skill.score}%</div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getLevelBadgeStyles(skill.level)}`}>
                        {skill.level}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weakest Skills (Skills to Improve) */}
        <div
          id="weakest-skills-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Skills to Improve (Top 3 Priority)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Target areas for accelerated career growth</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Growth Gaps
            </span>
          </div>

          {profile.weakestSkills.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              Complete an assessment to calculate skill growth areas.
            </div>
          ) : (
            <div className="space-y-3">
              {profile.weakestSkills.map((skill, index) => (
                <div
                  key={skill.skillId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {skill.skillName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {skill.category.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{skill.score}%</div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getLevelBadgeStyles(skill.level)}`}>
                        {skill.level}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Skill Breakdown List & Category Filtering */}
      <div id="all-assessed-skills-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              All Assessed Competencies ({profile.skills.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click on any skill to inspect historical performance progression across assessments
            </p>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeCategoryFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    activeCategoryFilter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredSkills.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            No skills found for the selected category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSkills.map((skill) => {
              const isSelected = selectedSkillForHistory?.skillId === skill.skillId;
              return (
                <div
                  key={skill.skillId}
                  id={`skill-card-${skill.skillId}`}
                  onClick={() => setSelectedSkillForHistory(isSelected ? null : skill)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {skill.skillName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{skill.category.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>
                          {skill.correctAnswers} / {skill.questionsAttempted} correct
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {skill.score}%
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${getLevelBadgeStyles(skill.level)}`}>
                        {skill.level}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getScoreBarColor(skill.score)}`}
                        style={{ width: `${Math.max(4, Math.min(100, skill.score))}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer & Toggle History Hint */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px]">
                      Last evaluated: {new Date(skill.lastAssessedDate).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-xs"
                    >
                      <History className="w-3.5 h-3.5" />
                      {isSelected ? 'Hide Timeline' : 'View History'}
                      {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded Skill History Timeline */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-indigo-500" /> Historical Performance Timeline
                      </div>

                      {!skill.history || skill.history.length === 0 ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                          Initial assessment attempt recorded. Complete reassessments to view historical progression.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {skill.history.map((entry, idx) => (
                            <div
                              key={entry.assessmentId || idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  Attempt {idx + 1}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  ({new Date(entry.assessedAt).toLocaleDateString()})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {entry.score}%
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getLevelBadgeStyles(entry.level)}`}>
                                  {entry.level}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Engineering Competencies from Catalog (Unassessed) */}
      {unassessedTaxonomySkills.length > 0 && (
        <div id="catalog-unassessed-skills" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Additional Engineering Competencies ({unassessedTaxonomySkills.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Skills available in the curriculum taxonomy ready to be measured in your next assessment
              </p>
            </div>
            <button
              onClick={onNavigateToAssessment}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Assess Now &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {unassessedTaxonomySkills.map((taxSkill) => (
              <div
                key={taxSkill.id}
                className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {taxSkill.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                  {taxSkill.category.replace('_', ' ')}
                </div>
                <div className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Not Yet Assessed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
