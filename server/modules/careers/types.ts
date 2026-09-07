/**
 * SkillUp AI - Module 4: Career Recommendation Domain Types
 * Strict contracts for deterministic career-skill mapping, weighted matching,
 * thresholds, rankings, and career selection persistence.
 */

import { CareerRole, UserSkillScore } from '../../common/types.js';
import { StudentSkillScore } from '../skills/types.js';

export type CareerMatchCategory =
  | 'Excellent Match'
  | 'Strong Match'
  | 'Moderate Match'
  | 'Low Match'
  | 'Poor Match';

export interface MatchThreshold {
  category: CareerMatchCategory;
  minScore: number;
  maxScore: number;
  description: string;
}

/**
  Centralized deterministic match quality thresholds
 * 80–100 → Excellent Match
 * 65–79.99 → Strong Match
 * 50–64.99 → Moderate Match
 * 30–49.99 → Low Match
 * 0–29.99 → Poor Match
 */
export const MATCH_THRESHOLDS: MatchThreshold[] = [
  {
    category: 'Excellent Match',
    minScore: 80,
    maxScore: 100,
    description: 'Outstanding technical competency alignment. Student meets or exceeds core career benchmarks.',
  },
  {
    category: 'Strong Match',
    minScore: 65,
    maxScore: 79.99,
    description: 'Substantial skill foundation with minor targeted areas for proficiency enhancement.',
  },
  {
    category: 'Moderate Match',
    minScore: 50,
    maxScore: 64.99,
    description: 'Promising baseline skills across key domains, requiring focused study in several areas.',
  },
  {
    category: 'Low Match',
    minScore: 30,
    maxScore: 49.99,
    description: 'Early-stage competence with notable gaps across prerequisite skills.',
  },
  {
    category: 'Poor Match',
    minScore: 0,
    maxScore: 29.99,
    description: 'Fundamental skill prerequisites not yet demonstrated in assessments.',
  },
];

export function getMatchCategory(score: number): CareerMatchCategory {
  if (score >= 80) return 'Excellent Match';
  if (score >= 65) return 'Strong Match';
  if (score >= 50) return 'Moderate Match';
  if (score >= 30) return 'Low Match';
  return 'Poor Match';
}

export function getLegacyFitLevel(score: number): 'strong_match' | 'moderate_match' | 'growth_opportunity' {
  if (score >= 78) return 'strong_match';
  if (score >= 58) return 'moderate_match';
  return 'growth_opportunity';
}

export interface SkillMatchContribution {
  skillId: string;
  skillName: string;
  userScore: number;
  targetScore: number;
  weight: number;
  contribution: number;
  isAssessed: boolean;
  isMissing?: boolean;
}

export interface SkillMatchSummary {
  skillId: string;
  skillName: string;
  score: number;
  weight: number;
  targetLevel?: number;
  isMissing?: boolean;
}

export interface RankedCareerRecommendation {
  careerId: string;
  careerTitle: string;
  careerName: string;
  slug: string;
  category: string;
  description: string;
  averageSalary?: string;
  marketDemand: 'high' | 'very_high' | 'moderate';
  matchScore: number; // 0-100 normalized deterministic score
  matchPercentage: number; // alias for backwards-compatibility
  matchCategory: CareerMatchCategory;
  fitLevel: 'strong_match' | 'moderate_match' | 'growth_opportunity';
  matchedSkillCount: number;
  requiredSkillCount: number;
  strongestMatchingSkills: SkillMatchSummary[];
  weakestMatchingSkills: SkillMatchSummary[]; // skills to improve
  skillContributions: SkillMatchContribution[];
}

export interface SelectedCareerRecord {
  studentId: string;
  careerId: string;
  selectedAt: string;
}

export interface CareerRecommendationsResponse {
  hasCompletedAssessment: boolean;
  overallSkillScore?: number;
  topCareer: RankedCareerRecommendation | null;
  recommendations: RankedCareerRecommendation[];
  selectedCareerId?: string | null;
  selectedCareer?: SelectedCareerRecord | null;
}
