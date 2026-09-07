/**
 * SkillUp AI - Module 4: Career Recommendation Page
 * Displays deterministic career recommendations ranked by algorithmic fit,
 * handles no-assessment empty states, displays strong vs weak skills,
 * and manages career selection persistence.
 */

import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  RankedCareerRecommendation,
  CareerRecommendationsResponse,
  CareerRoleItem,
  SelectedCareerRecord,
  CareerMatchCategory,
} from '../../types/index.js';
import { api } from '../../services/api.js';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  BarChart2,
  DollarSign,
  ChevronRight,
  Star,
  RefreshCw,
  Award,
  Layers,
  Check,
  Briefcase,
  HelpCircle,
  X,
  Target,
} from 'lucide-react';

interface CareerRecommendationsPageProps {
  user: UserProfile;
  onNavigateToAssessment: () => void;
  onNavigateToSkills: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSkillGap?: () => void;
}

export function CareerRecommendationsPage({
  user,
  onNavigateToAssessment,
  onNavigateToSkills,
  onNavigateToProfile,
  onNavigateToSkillGap,
}: CareerRecommendationsPageProps) {
  const [data, setData] = useState<CareerRecommendationsResponse | null>(null);
  const [catalog, setCatalog] = useState<CareerRoleItem[]>([]);
  const [selectedCareerRecord, setSelectedCareerRecord] = useState<SelectedCareerRecord | null>(null);
  const [activeSelectedCareer, setActiveSelectedCareer] = useState<CareerRoleItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [inspectingCareer, setInspectingCareer] = useState<RankedCareerRecommendation | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [recsRes, selectedRes, catalogRes] = await Promise.all([
        api.getCareerRecommendations().catch(() => null),
        api.getSelectedCareer().catch(() => null),
        api.getCareers().catch(() => []),
      ]);

      if (recsRes) {
        setData(recsRes);
      }
      if (selectedRes) {
        setSelectedCareerRecord(selectedRes.selectedCareer);
        setActiveSelectedCareer(selectedRes.career);
      }
      setCatalog(catalogRes);
    } catch (err) {
      console.error('Failed to load career data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCareer = async (careerId: string, careerTitle: string) => {
    try {
      setIsSelecting(careerId);
      setFeedbackMessage(null);
      const res = await api.selectCareer(careerId);
      setSelectedCareerRecord(res.selectedCareer);
      setActiveSelectedCareer(res.career);
      setFeedbackMessage({
        text: `Target career successfully set to ${careerTitle}. Your learning pathway is now aligned with this role.`,
        type: 'success',
      });
      // Refresh recommendation state
      const updatedRecs = await api.getCareerRecommendations().catch(() => null);
      if (updatedRecs) {
        setData(updatedRecs);
      }
    } catch (err: any) {
      console.error('Error selecting career:', err);
      setFeedbackMessage({
        text: err?.message || 'Failed to select career target. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSelecting(null);
    }
  };

  const getCategoryBadgeClass = (category: CareerMatchCategory | string) => {
    switch (category) {
      case 'Excellent Match':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Strong Match':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Moderate Match':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low Match':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Poor Match':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-slate-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-600 font-medium">Computing deterministic career recommendations...</p>
      </div>
    );
  }

  const hasCompletedAssessment = data?.hasCompletedAssessment ?? false;
  const recommendations = data?.recommendations ?? [];
  const topCareer = data?.topCareer ?? (recommendations.length > 0 ? recommendations[0] : null);
  const remainingCareers = recommendations.slice(1);
  const currentSelectedId = selectedCareerRecord?.careerId || data?.selectedCareerId;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Compass size={13} />
            <span>Module 4: Career Recommendation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Career Recommendations</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Deterministic career fit calculated directly from your assessed technical competencies using weighted skill matching algorithms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToSkills}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <BarChart2 size={14} className="text-blue-600" />
            <span>View Skill Analysis</span>
          </button>
          <button
            onClick={onNavigateToAssessment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw size={14} />
            <span>Retake Assessment</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">{feedbackMessage.text}</div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Current Selected Career Target Banner */}
      {activeSelectedCareer && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                  Active Career Goal
                </span>
                {selectedCareerRecord?.selectedAt && (
                  <span className="text-slate-400 text-xs">
                    Target set on {new Date(selectedCareerRecord.selectedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Briefcase size={20} className="text-blue-400" />
                {activeSelectedCareer.title || activeSelectedCareer.name}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl line-clamp-2">
                {activeSelectedCareer.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10 text-right">
                <div className="text-[10px] text-slate-400 font-medium">Category</div>
                <div className="text-xs font-semibold text-white">{activeSelectedCareer.category || 'Software Engineering'}</div>
              </div>
              {activeSelectedCareer.averageSalary && (
                <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10 text-right">
                  <div className="text-[10px] text-slate-400 font-medium">Avg Salary</div>
                  <div className="text-xs font-semibold text-white">{activeSelectedCareer.averageSalary}</div>
                </div>
              )}
              {onNavigateToSkillGap && (
                <button
                  id="btn-active-career-skill-gap"
                  onClick={onNavigateToSkillGap}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Target size={14} />
                  <span>Analyze Skill Gaps</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATE 1: NO-ASSESSMENT STATE */}
      {!hasCompletedAssessment && (
        <div className="space-y-8">
          <div className="p-8 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle size={32} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Complete your assessment to receive career recommendations.
              </h3>
              <p className="text-sm text-slate-600 max-w-2xl">
                SkillUp AI evaluates career suitability through deterministic, weighted skill-matching. Because you have not completed a skill diagnostic yet, match percentages cannot be calculated. Complete the assessment to unlock your personalized recommendations.
              </p>
            </div>
            <button
              onClick={onNavigateToAssessment}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors shrink-0 inline-flex items-center gap-2"
            >
              <Compass size={16} />
              <span>Start Assessment</span>
            </button>
          </div>

          {/* Catalog Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Available Career Catalog</h3>
                <p className="text-xs text-slate-500">Explore engineering tracks and their prerequisite skills</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">{catalog.length} Career Tracks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {catalog.map(career => (
                <div
                  key={career.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {career.category || 'Engineering'}
                      </span>
                      {career.averageSalary && (
                        <span className="text-[11px] text-slate-500 font-medium">{career.averageSalary}</span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{career.title || career.name}</h4>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{career.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700">Key Required Skills:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {career.requiredSkills.slice(0, 4).map(skill => (
                        <span
                          key={skill.skillId}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-[11px]"
                        >
                          {skill.skillName} ({Math.round(skill.weight * 100)}%)
                        </span>
                      ))}
                      {career.requiredSkills.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                          +{career.requiredSkills.length - 4} more
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelectCareer(career.id, career.title || career.name || '')}
                      disabled={isSelecting === career.id || currentSelectedId === career.id}
                      className={`w-full mt-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        currentSelectedId === career.id
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
                          : 'bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      {currentSelectedId === career.id ? (
                        <>
                          <Check size={14} />
                          <span>Active Career Goal</span>
                        </>
                      ) : isSelecting === career.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Selecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Select as Career Target</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ASSESSED - RANKED RECOMMENDATIONS */}
      {hasCompletedAssessment && (
        <div className="space-y-8">
          {/* Top Recommendation Spotlight (#1) */}
          {topCareer && (
            <div className="p-6 md:p-8 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 shadow-sm relative overflow-hidden space-y-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-xs">
                      <Star size={12} className="fill-amber-300 text-amber-300" />
                      Top Recommended Career
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getCategoryBadgeClass(topCareer.matchCategory)}`}>
                      {topCareer.matchCategory}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {topCareer.careerTitle}
                  </h2>
                  <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                    {topCareer.description}
                  </p>
                </div>

                {/* Match Score Indicator */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs shrink-0">
                  <div className="text-center">
                    <div className={`text-4xl font-extrabold tracking-tight ${getScoreColor(topCareer.matchScore)}`}>
                      {Math.round(topCareer.matchScore)}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                      Match Score
                    </div>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>Category: <span className="font-semibold text-slate-900">{topCareer.category}</span></div>
                    <div>Assessed: <span className="font-semibold text-slate-900">{topCareer.matchedSkillCount} of {topCareer.requiredSkillCount} skills</span></div>
                    {topCareer.averageSalary && (
                      <div>Salary: <span className="font-semibold text-slate-900">{topCareer.averageSalary}</span></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills Analysis for Top Career */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/80">
                {/* Strong Matches */}
                <div className="p-4 rounded-xl bg-white/90 border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      Strong Matches
                    </span>
                    <span className="text-[11px] font-normal text-slate-500">Student proficiency</span>
                  </div>

                  {topCareer.strongestMatchingSkills.length > 0 ? (
                    <div className="space-y-1.5">
                      {topCareer.strongestMatchingSkills.map(skill => (
                        <div
                          key={skill.skillId}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{skill.skillName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {skill.score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No assessed skills above baseline threshold yet.</p>
                  )}
                </div>

                {/* Skills to Improve */}
                <div className="p-4 rounded-xl bg-white/90 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={15} className="text-amber-600" />
                      Skills to Improve
                    </span>
                    <span className="text-[11px] font-normal text-slate-500">Target benchmarks</span>
                  </div>

                  {topCareer.weakestMatchingSkills.length > 0 ? (
                    <div className="space-y-1.5">
                      {topCareer.weakestMatchingSkills.map(skill => (
                        <div
                          key={skill.skillId}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{skill.skillName}</span>
                          {skill.isMissing ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
                              Unassessed (Target: {skill.targetLevel || 75})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                              {skill.score}/100 (Target: {skill.targetLevel || 75})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">All required skills meet target proficiency benchmarks.</p>
                  )}
                </div>
              </div>

              {/* Actions for Top Career */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setInspectingCareer(topCareer)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 underline-offset-4 hover:underline"
                >
                  <Layers size={14} />
                  <span>Inspect Complete Skill Weight Breakdown</span>
                </button>

                <button
                  onClick={() => handleSelectCareer(topCareer.careerId, topCareer.careerTitle)}
                  disabled={isSelecting === topCareer.careerId || currentSelectedId === topCareer.careerId}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 ${
                    currentSelectedId === topCareer.careerId
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {currentSelectedId === topCareer.careerId ? (
                    <>
                      <Check size={16} />
                      <span>Active Selected Career Goal</span>
                    </>
                  ) : isSelecting === topCareer.careerId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Selection...</span>
                    </>
                  ) : (
                    <>
                      <span>Select as Target Career</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Remaining Ranked Recommendations */}
          {remainingCareers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Other Career Matches</h3>
                  <p className="text-xs text-slate-500">
                    Ranked deterministically by weighted skill score alignment
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {remainingCareers.length} additional careers
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {remainingCareers.map((career, index) => {
                  const rank = index + 2;
                  const isCurrent = currentSelectedId === career.careerId;

                  return (
                    <div
                      key={career.careerId}
                      className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-5 ${
                        isCurrent
                          ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                #{rank}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getCategoryBadgeClass(career.matchCategory)}`}>
                                {career.matchCategory}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">{career.careerTitle}</h4>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-black ${getScoreColor(career.matchScore)}`}>
                              {Math.round(career.matchScore)}%
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Match</div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {career.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div>Category: <span className="font-semibold text-slate-700">{career.category}</span></div>
                          <div>Assessed: <span className="font-semibold text-slate-700">{career.matchedSkillCount}/{career.requiredSkillCount}</span></div>
                        </div>

                        {/* Top Strengths & Gaps preview */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="font-semibold text-emerald-800 block mb-1">Strong Match:</span>
                            {career.strongestMatchingSkills.length > 0 ? (
                              <span className="text-slate-700 font-medium">
                                {career.strongestMatchingSkills[0].skillName} ({career.strongestMatchingSkills[0].score})
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None assessed</span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-amber-800 block mb-1">Skill to Improve:</span>
                            {career.weakestMatchingSkills.length > 0 ? (
                              <span className="text-slate-700 font-medium">
                                {career.weakestMatchingSkills[0].skillName}
                                {career.weakestMatchingSkills[0].isMissing ? ' (Unassessed)' : ` (${career.weakestMatchingSkills[0].score})`}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setInspectingCareer(career)}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          View Breakdown
                        </button>

                        <button
                          onClick={() => handleSelectCareer(career.careerId, career.careerTitle)}
                          disabled={isSelecting === career.careerId || isCurrent}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check size={14} />
                              <span>Selected</span>
                            </>
                          ) : isSelecting === career.careerId ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <span>Select Career</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED SKILL MATRIX MODAL */}
      {inspectingCareer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${getCategoryBadgeClass(inspectingCareer.matchCategory)}`}>
                    {inspectingCareer.matchCategory}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Match: {Math.round(inspectingCareer.matchScore)}%</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{inspectingCareer.careerTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Deterministic skill weight and fulfillment breakdown</p>
              </div>
              <button
                onClick={() => setInspectingCareer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Matrix Table */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                The career matching formula calculates: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">Σ(studentSkillScore × weight) / Σ(weight)</code>.
                Unassessed skills are tracked explicitly without penalizing assessed competency scores as zero.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-3">Required Skill</th>
                      <th className="p-3 text-center">Weight</th>
                      <th className="p-3 text-center">Benchmark</th>
                      <th className="p-3 text-center">Student Score</th>
                      <th className="p-3 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {inspectingCareer.skillContributions.map(item => (
                      <tr key={item.skillId} className={item.isMissing ? 'bg-amber-50/20' : ''}>
                        <td className="p-3 font-medium text-slate-900">
                          {item.skillName}
                          {item.isMissing && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-normal">
                              Unassessed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {Math.round(item.weight * 100)}%
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {item.targetScore}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {item.isMissing ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className={item.userScore >= item.targetScore ? 'text-emerald-600 font-bold' : 'text-slate-900 font-semibold'}>
                              {item.userScore}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-900">
                          {Math.round(item.contribution * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setInspectingCareer(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              <button
                onClick={() => {
                  handleSelectCareer(inspectingCareer.careerId, inspectingCareer.careerTitle);
                  setInspectingCareer(null);
                }}
                disabled={currentSelectedId === inspectingCareer.careerId}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                  currentSelectedId === inspectingCareer.careerId
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {currentSelectedId === inspectingCareer.careerId ? (
                  <>
                    <Check size={14} />
                    <span>Active Target</span>
                  </>
                ) : (
                  <>
                    <span>Select as Career Target</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
