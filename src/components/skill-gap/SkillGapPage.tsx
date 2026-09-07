/**
 * SkillUp AI - Module 5: Skill Gap Analysis Page
 * 
 * Displays deterministic comparison between the student's current skill profile (Module 3)
 * and the selected career requirements (Module 4).
 * Shows overall readiness, categorized gap summaries, prioritized skill list with visual progress bars,
 * and handles all required empty/error states.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.js';
import {
  UserProfile,
  CareerRoleItem,
  SkillGapReport,
  SkillGap,
  SkillGapPriority,
  SkillGapStatus,
} from '../../types/index.js';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Compass,
  FileCheck2,
  BarChart3,
  Sparkles,
  ChevronDown,
  Layers,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react';

interface SkillGapPageProps {
  user: UserProfile;
  onNavigateToAssessment: () => void;
  onNavigateToSkills: () => void;
  onNavigateToCareers: () => void;
  onNavigateToProfile: () => void;
}

type FilterTab = 'all' | 'gaps' | 'met' | 'critical' | 'high' | 'medium' | 'low' | 'unassessed';

export function SkillGapPage({
  user,
  onNavigateToAssessment,
  onNavigateToSkills,
  onNavigateToCareers,
  onNavigateToProfile,
}: SkillGapPageProps) {
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [availableCareers, setAvailableCareers] = useState<CareerRoleItem[]>([]);
  const [selectedCareerId, setSelectedCareerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingCareer, setIsSwitchingCareer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Load available careers and current skill gap report
  const loadData = async (targetCareerId?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      // 1. Fetch careers for quick switching
      const careers = await api.getCareers().catch(() => []);
      setAvailableCareers(careers);

      // 2. Fetch skill gap report for selected or targeted career
      const gapReport = await api.getSkillGapReport(targetCareerId);
      setReport(gapReport);
      setSelectedCareerId(gapReport.careerId);
    } catch (err: any) {
      console.error('Failed to load skill gap report:', err);
      const msg = err.message || 'Failed to load skill gap report.';
      setErrorMessage(msg);
      if (msg.includes('Career selection required') || msg.includes('CAREER_NOT_SELECTED')) {
        setErrorCode('CAREER_NOT_SELECTED');
      } else if (msg.includes('not found') || msg.includes('CAREER_NOT_FOUND')) {
        setErrorCode('CAREER_NOT_FOUND');
      } else {
        setErrorCode('API_ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Handle switching career on the page
  const handleCareerChange = async (newCareerId: string) => {
    if (!newCareerId || newCareerId === selectedCareerId) return;
    setIsSwitchingCareer(true);
    try {
      // Also update selected career in database for continuity
      await api.selectCareer(newCareerId).catch(() => {});
      const updatedReport = await api.getSkillGapReport(newCareerId);
      setReport(updatedReport);
      setSelectedCareerId(newCareerId);
      setErrorMessage(null);
      setErrorCode(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze career gaps.');
    } finally {
      setIsSwitchingCareer(false);
    }
  };

  // Filter skills based on tab selection
  const filteredSkills = useMemo(() => {
    if (!report || !report.orderedSkillGaps) return [];
    return report.orderedSkillGaps.filter(skill => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'gaps') return skill.status === 'GAP';
      if (activeFilter === 'met') return skill.status === 'MET';
      if (activeFilter === 'critical') return skill.priority === 'CRITICAL';
      if (activeFilter === 'high') return skill.priority === 'HIGH';
      if (activeFilter === 'medium') return skill.priority === 'MEDIUM';
      if (activeFilter === 'low') return skill.priority === 'LOW';
      if (activeFilter === 'unassessed') return skill.isUnassessed;
      return true;
    });
  }, [report, activeFilter]);

  // Helpers for badge styles
  const getPriorityBadge = (priority: SkillGapPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'MET':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusBadge = (skill: SkillGap) => {
    if (skill.isUnassessed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
          <HelpCircle size={12} />
          UNASSESSED
        </span>
      );
    }
    if (skill.status === 'MET') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
          <CheckCircle2 size={12} />
          MET
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-300">
        <AlertCircle size={12} />
        GAP
      </span>
    );
  };

  // Render Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Analyzing Skill Gaps</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Comparing your student skill profile against career requirements using deterministic algorithmic formulas...
        </p>
      </div>
    );
  }

  // Render Empty State: No Career Selected
  if (errorCode === 'CAREER_NOT_SELECTED') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-4">
            <Compass size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            No Target Career Selected
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Skill gap analysis requires a target career goal. Select a career from Module 4's Career Recommendations to calculate your personalized gap report.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-goto-careers"
              onClick={onNavigateToCareers}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors"
            >
              <Compass size={16} />
              <span>Browse Career Catalog</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onNavigateToSkills}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
            >
              <BarChart3 size={16} />
              <span>Review Skill Profile</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Empty State: Career Not Found
  if (errorCode === 'CAREER_NOT_FOUND') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Career Not Found</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            The requested career could not be found in the authoritative Module 4 career catalog.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onNavigateToCareers}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Compass size={14} />
              <span>Select Valid Career</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render API Error State
  if (errorMessage && !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Unable to Load Skill Gaps</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">{errorMessage}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <RefreshCw size={14} />
              <span>Retry Analysis</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Career Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                Module 5 • Skill Gap Engine
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Deterministic Algorithmic Math
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Skill Gap Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Deterministic comparison of your student skill profile against required competency levels for{' '}
              <strong className="text-slate-800 font-semibold">{report.careerName}</strong>.
            </p>
          </div>

          {/* Quick Career Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <label htmlFor="select-career" className="sr-only">
                Target Career
              </label>
              <select
                id="select-career"
                value={selectedCareerId}
                onChange={e => handleCareerChange(e.target.value)}
                disabled={isSwitchingCareer}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                {availableCareers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.id === report.careerId ? '(Current Target)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>

            <button
              onClick={() => loadData(selectedCareerId)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
              title="Refresh gap calculation"
            >
              <RefreshCw size={14} className={isSwitchingCareer ? 'animate-spin text-blue-600' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Notice: Unassessed Profile State */}
        {report.unassessedSkills > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <HelpCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {report.unassessedSkills} skill{report.unassessedSkills > 1 ? 's are' : ' is'} currently UNASSESSED
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Unassessed skills are evaluated with current score = 0 until you complete the technical assessment.
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToAssessment}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <FileCheck2 size={14} />
              <span>Take Assessment</span>
            </button>
          </div>
        )}

        {/* Notice: Celebratory All Met State */}
        {report.skillsWithGaps === 0 && report.totalRequiredSkills > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Career Benchmark Achieved: No Active Skill Gaps
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Your verified skill levels satisfy all competencies required for {report.careerName}!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Overall Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Overall Readiness */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Career Readiness
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-700">{report.overallReadiness}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, report.overallReadiness))}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Weighted proficiency</p>
        </div>

        {/* Overall Gap Score */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Overall Gap Score
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{report.overallGapScore}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3.5">Weighted average gap</p>
        </div>

        {/* Skills Met */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} />
            Skills Met
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-700">{report.skillsMet}</span>
            <span className="text-xs text-slate-400">/ {report.totalRequiredSkills}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3.5">Target achieved</p>
        </div>

        {/* Critical Gaps */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <Flame size={12} />
            Critical Gaps
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-700">{report.criticalGaps}</span>
            <span className="text-xs text-slate-400">skills</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3.5">Gap score &ge; 40</p>
        </div>

        {/* High Priority Gaps */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">
            High Priority
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-orange-700">{report.highPriorityGaps}</span>
            <span className="text-xs text-slate-400">skills</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3.5">Gap 25 to 39.9</p>
        </div>

        {/* Medium & Low Gaps */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Med / Low Gaps
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-700">
              {report.mediumPriorityGaps + report.lowPriorityGaps}
            </span>
            <span className="text-xs text-slate-400">skills</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3.5">Gap &lt; 25</p>
        </div>
      </div>

      {/* Filter Tabs & Ordered Skill List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              <span>Prioritized Skill Gap Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordered deterministically by: Priority &rarr; Gap Size &rarr; Career Weight &rarr; Alphabetical Order
            </p>
          </div>

          {/* Filter Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({report.totalRequiredSkills})
            </button>
            <button
              onClick={() => setActiveFilter('gaps')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === 'gaps'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gaps ({report.skillsWithGaps})
            </button>
            <button
              onClick={() => setActiveFilter('met')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === 'met'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Met ({report.skillsMet})
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === 'critical'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Critical ({report.criticalGaps})
            </button>
            <button
              onClick={() => setActiveFilter('high')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === 'high'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High ({report.highPriorityGaps})
            </button>
            {report.unassessedSkills > 0 && (
              <button
                onClick={() => setActiveFilter('unassessed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === 'unassessed'
                    ? 'bg-white text-slate-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unassessed ({report.unassessedSkills})
              </button>
            )}
          </div>
        </div>

        {/* Skill Gap Cards List */}
        <div className="divide-y divide-slate-200">
          {filteredSkills.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No skills match the selected filter criteria.
            </div>
          ) : (
            filteredSkills.map(skill => (
              <div
                key={skill.skillId}
                className="p-4 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                {/* Left: Skill Identity & Status */}
                <div className="space-y-1.5 lg:w-1/3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 tracking-tight">
                      {skill.skillName}
                    </span>
                    {getStatusBadge(skill)}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(
                        skill.priority
                      )}`}
                    >
                      {skill.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="capitalize bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                      {skill.category}
                    </span>
                    <span>Career Weight: {Math.round(skill.careerWeight * 100)}%</span>
                    {skill.prerequisites && skill.prerequisites.length > 0 && (
                      <span className="text-indigo-600 font-medium">
                        Prereq: {skill.prerequisites.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: Dual Visual Progress Bar (Current vs Required) */}
                <div className="lg:w-5/12 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Current:</span>
                      <span
                        className={
                          skill.isUnassessed
                            ? 'text-slate-400 italic'
                            : skill.currentLevel >= skill.requiredLevel
                            ? 'text-emerald-700 font-bold'
                            : 'text-blue-700 font-bold'
                        }
                      >
                        {skill.isUnassessed ? '0 (Unassessed)' : `${skill.currentLevel} / 100`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Required:</span>
                      <span className="text-slate-900 font-bold">{skill.requiredLevel} / 100</span>
                    </div>
                  </div>

                  {/* Visual Stacked Progress Bar */}
                  <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    {/* Required Level Marker */}
                    <div
                      className="absolute top-0 bottom-0 bg-slate-300 opacity-60"
                      style={{ width: `${Math.min(100, Math.max(0, skill.requiredLevel))}%` }}
                    />
                    {/* Current Level Fill */}
                    <div
                      className={`h-full rounded-full transition-all relative z-10 ${
                        skill.status === 'MET'
                          ? 'bg-emerald-500'
                          : skill.priority === 'CRITICAL'
                          ? 'bg-rose-500'
                          : skill.priority === 'HIGH'
                          ? 'bg-orange-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, skill.currentLevel))}%` }}
                    />
                  </div>
                </div>

                {/* Right: Gap Metric & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-4 lg:w-1/4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Gap Score</span>
                    <span
                      className={`text-lg font-black ${
                        skill.gap === 0
                          ? 'text-emerald-700'
                          : skill.priority === 'CRITICAL'
                          ? 'text-rose-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {skill.gap === 0 ? '0' : `-${skill.gap}`}
                    </span>
                  </div>

                  {skill.status === 'GAP' && (
                    <button
                      onClick={onNavigateToSkills}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                      title="Inspect skill syllabus"
                    >
                      <BookOpen size={12} />
                      <span>Learn</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cross-Module Navigation Footer Banner */}
      <div className="bg-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Next Steps in Your Career Roadmap</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Take a reassessment to bridge existing gaps, or explore other careers in the catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToAssessment}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileCheck2 size={14} />
            <span>Take Assessment</span>
          </button>
          <button
            onClick={onNavigateToCareers}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            <Compass size={14} />
            <span>Career Catalog</span>
          </button>
        </div>
      </div>
    </div>
  );
}
