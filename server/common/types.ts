/**
 * SkillUp AI - Shared Common Types & Domain Entities
 * Strict type contracts for database entities, API payloads, and inter-module communication.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export type SkillProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionSource = 'curated' | 'ai_generated';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  educationLevel?: string;
  degreeCourse?: string;
  academicYear?: string;
  careerInterests?: string[];
  learningPreferences?: string[];
  onboardingCompleted: boolean;
  targetCareerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface Skill {
  id: string;
  name: string;
  category: 'core_cs' | 'frontend' | 'backend' | 'devops' | 'ai_data' | 'soft_skills' | 'security' | 'systems' | 'cloud' | string;
  description: string;
  parentSkillId?: string;
  maxScore: number;
}

export interface UserSkillScore {
  skillId: string;
  skillName: string;
  score: number; // 0 to 100
  level: SkillProficiencyLevel;
  lastAssessedAt: string;
}

export interface AssessmentQuestion {
  id: string;
  skillId: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  source: QuestionSource;
  weight: number; // For deterministic scoring
}

export interface AssessmentSubmissionAnswer {
  questionId: string;
  selectedOptionIndex: number;
  timeSpentSeconds?: number;
}

export interface QuestionGradingDetail {
  questionId: string;
  skillId: string;
  skillName: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: string[];
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation: string;
  weight: number;
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  isReassessment: boolean;
  targetSkillIds: string[];
  questionIds: string[];
  startedAt: string;
  completedAt?: string;
  resultId?: string;
}

export interface AssessmentResult {
  assessmentId: string;
  userId: string;
  isReassessment: boolean;
  totalQuestions: number;
  curatedCount: number;
  aiGeneratedCount: number;
  overallScore: number; // 0-100 deterministic
  skillBreakdown: Record<string, {
    skillName: string;
    correct: number;
    total: number;
    percentage: number;
    weightedScore: number;
  }>;
  details?: QuestionGradingDetail[];
  completedAt: string;
}

export interface CareerRole {
  id: string;
  title: string;
  name?: string; // Module 4 alias
  slug: string;
  description: string;
  category?: string; // e.g. 'Software Engineering', 'Data & Analytics', 'Artificial Intelligence'
  averageSalary?: string;
  marketDemand: 'high' | 'very_high' | 'moderate';
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    weight: number; // 0.0 - 1.0 (Must sum to 1.0 per career)
    targetLevel: number; // 0 - 100 benchmark proficiency
    minimumRecommendedLevel?: number; // Module 4 alias
  }>;
}

export type CareerMatchCategory =
  | 'Excellent Match'
  | 'Strong Match'
  | 'Moderate Match'
  | 'Low Match'
  | 'Poor Match';

export interface CareerMatchSkillSummary {
  skillId: string;
  skillName: string;
  score: number;
  weight: number;
  targetLevel?: number;
  isMissing?: boolean;
}

export interface CareerMatchResult {
  careerId: string;
  careerTitle: string;
  careerName?: string;
  category?: string;
  description?: string;
  matchScore?: number; // 0-100 deterministic
  matchPercentage: number; // Calculated via weighted matching formula (alias for backwards compatibility)
  matchCategory?: CareerMatchCategory;
  fitLevel: 'strong_match' | 'moderate_match' | 'growth_opportunity';
  matchedSkillCount?: number;
  requiredSkillCount?: number;
  strongestMatchingSkills?: CareerMatchSkillSummary[];
  weakestMatchingSkills?: CareerMatchSkillSummary[];
  skillContributions: Array<{
    skillId: string;
    skillName: string;
    userScore: number;
    targetScore: number;
    weight: number;
    contribution: number;
    isAssessed?: boolean;
    isMissing?: boolean;
  }>;
}

export interface SkillGapItem {
  skillId: string;
  skillName: string;
  currentScore: number;
  requiredScore: number;
  gap: number; // max(0, requiredScore - currentScore)
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedWeeksToBridge: number;
}

export interface SkillGapAnalysisResult {
  userId: string;
  careerId: string;
  careerTitle: string;
  overallReadiness: number; // 0-100
  totalGapScore: number;
  gaps: SkillGapItem[];
  strengths: string[];
  aiExplanation?: string; // AI generated personalized summary (Rule 5)
}

export interface RoadmapMilestone {
  id: string;
  sequenceOrder: number;
  title: string;
  targetSkillId: string;
  targetSkillName: string;
  description: string;
  estimatedHours: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  resources: Array<{
    id: string;
    title: string;
    type: 'course' | 'documentation' | 'project' | 'exercise';
    url: string;
    durationMinutes: number;
  }>;
  aiCoachingNote?: string;
}

export interface PersonalizedRoadmap {
  id: string;
  userId: string;
  targetCareerId: string;
  targetCareerTitle: string;
  totalEstimatedWeeks: number;
  milestones: RoadmapMilestone[];
  generatedAt: string;
  lastRefinedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    module: string;
  };
}
