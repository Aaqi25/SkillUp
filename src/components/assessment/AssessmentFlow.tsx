import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  ClientAssessmentQuestion,
  ClientAssessmentResult,
  UserProfile,
} from '../../types/index.js';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Sparkles,
  BarChart3,
  Award,
  Layers,
  HelpCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';

interface AssessmentFlowProps {
  user: UserProfile;
  onAssessmentCompleted?: (result: ClientAssessmentResult) => void;
  onReturnToProfile?: () => void;
  onViewSkillAnalysis?: () => void;
}

type AssessmentStep = 'intro' | 'active' | 'submitting' | 'result';

export const AssessmentFlow: React.FC<AssessmentFlowProps> = ({
  user,
  onAssessmentCompleted,
  onReturnToProfile,
  onViewSkillAnalysis,
}) => {
  const [step, setStep] = useState<AssessmentStep>('intro');
  const [attemptId, setAttemptId] = useState<string>('');
  const [questions, setQuestions] = useState<ClientAssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ClientAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ClientAssessmentResult[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const [isReassessment, setIsReassessment] = useState(false);

  // Load past assessment history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const pastAssessments = await api.getAssessmentHistory();
        setHistory(pastAssessments);
      } catch (err) {
        console.error('Failed to load past assessment history:', err);
      }
    }
    loadHistory();
  }, []);

  const handleStart = async (reassessmentMode: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsReassessment(reassessmentMode);
      const res = await api.startAssessment(undefined, reassessmentMode);
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setCurrentIndex(0);
      setAnswers({});
      setStartTime(Date.now());
      setStep('active');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const formattedAnswers = questions.map(q => ({
      questionId: q.id,
      selectedOptionIndex: answers[q.id] !== undefined ? answers[q.id] : -1,
    }));

    // Verify all answered
    const unanswered = formattedAnswers.filter(a => a.selectedOptionIndex === -1);
    if (unanswered.length > 0) {
      setError(`Please answer all questions before submitting (${unanswered.length} remaining).`);
      return;
    }

    try {
      setStep('submitting');
      setError(null);
      const res = await api.submitAssessment({
        assessmentId: attemptId,
        isReassessment,
        answers: formattedAnswers,
      });
      setResult(res);
      setHistory(prev => [res, ...prev]);
      setStep('result');
      if (onAssessmentCompleted) {
        onAssessmentCompleted(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment.');
      setStep('active');
    }
  };

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Module 2: Assessment Engine
            </span>
            <span className="text-xs text-slate-500 font-medium">Deterministic Scoring</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Curated Skill Assessment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluates your foundational software engineering skills using deterministic algorithm scoring (no LLM drift).
          </p>
        </div>

        {onReturnToProfile && (
          <button
            onClick={onReturnToProfile}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Back to Profile
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: INTRO VIEW */}
      {step === 'intro' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Diagnostic Assessment Overview</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                SkillUp AI evaluates your proficiency level across core domains to build an accurate starting baseline for your career roadmap.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div className="text-xs font-bold text-slate-800 pt-1">Curated Question Bank</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  100% verified engineering questions covering TypeScript, Node.js, and Databases.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div className="text-xs font-bold text-slate-800 pt-1">Deterministic Scoring</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Answers scored strictly via backend logic and question weights — no AI model calculates grades.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div className="text-xs font-bold text-slate-800 pt-1">Profile Synchronization</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Generates verified skill percentages saved directly to your permanent student record.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Estimated Duration:</span> ~5–8 minutes • 6 Questions
              </div>

              <button
                id="btn-start-curated-assessment"
                onClick={() => handleStart(false)}
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Preparing Question Bank...</span>
                  </>
                ) : (
                  <>
                    <span>Start Assessment</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Past Assessment History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Clock size={14} className="text-blue-600" />
                  Your Assessment History ({history.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {history.map((h, i) => (
                  <div key={h.assessmentId || i} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Overall Score: {h.overallScore}%
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          h.overallScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          h.overallScore >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {h.overallScore >= 70 ? 'Proficient' : h.overallScore >= 40 ? 'Developing' : 'Foundational'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Completed: {new Date(h.completedAt).toLocaleString()} • {h.totalQuestions} Questions
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setResult(h);
                        setStep('result');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>View Breakdown</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: ACTIVE QUESTION VIEW */}
      {step === 'active' && currentQ && (
        <div className="space-y-6">
          {/* Progress Bar Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Question {currentIndex + 1} of {totalQ}</span>
              <span>{answeredCount} of {totalQ} answered ({progressPercent}%)</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentIndex + 1) / totalQ * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {currentQ.skillId.replace('skl_', '').replace('_', ' ').toUpperCase()}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  currentQ.difficulty === 'hard' ? 'bg-rose-50 text-rose-700' :
                  currentQ.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>
                  {currentQ.difficulty.toUpperCase()}
                </span>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                Weight: {currentQ.weight}x
              </span>
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQ.questionText}
            </h2>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = answers[currentQ.id] === idx;
                return (
                  <button
                    key={idx}
                    id={`opt-q${currentIndex}-idx${idx}`}
                    onClick={() => handleSelectOption(currentQ.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-medium shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation & Submit Controls */}
            <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-100">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {currentIndex < totalQ - 1 ? (
                  <button
                    id="btn-next-question"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Next Question</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    id="btn-submit-assessment"
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    <span>Submit & Score</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUBMITTING SPINNER */}
      {step === 'submitting' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Scoring Assessment Deterministically...</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Comparing selected answers with verified keys, calculating weighted skill scores, and updating student profile state.
          </p>
        </div>
      )}

      {/* STEP 4: COMPREHENSIVE RESULT VIEW */}
      {step === 'result' && result && (
        <div className="space-y-6">
          {/* Main Score Hero */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Assessment Completed
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {result.assessmentId.substring(0, 16)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Your Diagnostic Assessment Result</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assessed deterministically on {new Date(result.completedAt).toLocaleString()}
                </p>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-center">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {result.overallScore}%
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Overall Score
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-200" />

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-900">{result.totalQuestions}</span> Questions
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{result.curatedCount}</span> Curated
                  </div>
                </div>
              </div>
            </div>

            {/* Skill-by-Skill Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BarChart3 size={15} className="text-blue-600" />
                Skill-Level Performance Breakdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.skillBreakdown).map(([skillId, stat]: [string, any]) => (
                  <div
                    key={skillId}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {stat.skillName || skillId}
                      </span>
                      <span className={`text-xs font-black ${
                        stat.weightedScore >= 70 ? 'text-emerald-700' :
                        stat.weightedScore >= 40 ? 'text-amber-700' :
                        'text-rose-700'
                      }`}>
                        {stat.weightedScore}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          stat.weightedScore >= 70 ? 'bg-emerald-600' :
                          stat.weightedScore >= 40 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, stat.weightedScore))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Correct: {stat.correct} / {stat.total}</span>
                      <span>Raw: {stat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Question-Level Review with Verified Explanations */}
            {result.details && result.details.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <HelpCircle size={15} className="text-indigo-600" />
                  Detailed Question Analysis & Explanations
                </h3>

                <div className="space-y-3">
                  {result.details.map((detail, idx) => (
                    <div
                      key={detail.questionId || idx}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        detail.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-rose-200 bg-rose-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            detail.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}>
                            {detail.isCorrect ? <Check size={12} /> : <X size={12} />}
                          </span>
                          <span className="font-bold text-slate-800">
                            Question {idx + 1}: {detail.skillName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {detail.difficulty.toUpperCase()}
                        </span>
                      </div>

                      <p className="font-medium text-slate-900 pl-7 leading-relaxed">
                        {detail.questionText}
                      </p>

                      <div className="pl-7 space-y-1 text-[11px]">
                        <div>
                          <span className="text-slate-500">Your selection: </span>
                          <span className={detail.isCorrect ? 'font-bold text-emerald-800' : 'font-bold text-rose-800'}>
                            {detail.options[detail.selectedOptionIndex] || 'None'}
                          </span>
                        </div>

                        {!detail.isCorrect && (
                          <div>
                            <span className="text-slate-500">Correct answer: </span>
                            <span className="font-bold text-emerald-800">
                              {detail.options[detail.correctOptionIndex]}
                            </span>
                          </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60 mt-1 text-slate-600 leading-relaxed">
                          <span className="font-semibold text-slate-800">Explanation: </span>
                          {detail.explanation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <button
                onClick={() => handleStart(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <RotateCcw size={14} />
                <span>Retake Assessment</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                {onViewSkillAnalysis && (
                  <button
                    id="btn-view-skill-analysis-result"
                    onClick={onViewSkillAnalysis}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>View Skill Analysis</span>
                  </button>
                )}

                {onReturnToProfile && (
                  <button
                    onClick={onReturnToProfile}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <span>Return to Profile</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
