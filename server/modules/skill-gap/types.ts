/**
 * SkillUp AI - Module 5: Skill Gap Analysis Domain Types
 * Strict type contracts for deterministic gap math, priorities, and reports.
 */

export type SkillGapStatus = 'MET' | 'GAP';

export type SkillGapPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MET';

export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  currentLevel: number; // 0-100 normalized
  requiredLevel: number; // 0-100 normalized
  gap: number; // max(requiredLevel - currentLevel, 0)
  gapPercentage: number; // = gap
  status: SkillGapStatus;
  priority: SkillGapPriority;
  careerWeight: number; // career requirement weight from Module 4
  isUnassessed: boolean;
  prerequisites?: string[];
  dependencies?: string[];
  // Backwards compatibility fields for legacy consumers
  currentScore?: number;
  requiredScore?: number;
  estimatedWeeksToBridge?: number;
}

export interface SkillGapReport {
  studentId: string;
  userId?: string; // backwards-compatible alias
  careerId: string;
  careerName: string;
  careerTitle?: string; // backwards-compatible alias
  careerCategory?: string;
  overallGapScore: number; // deterministic summary: weighted average gap
  overallReadiness: number; // 0-100 completion percentage
  totalRequiredSkills: number;
  skillsMet: number;
  skillsWithGaps: number;
  criticalGaps: number;
  highPriorityGaps: number;
  mediumPriorityGaps: number;
  lowPriorityGaps: number;
  unassessedSkills: number;
  generatedAt: string;
  orderedSkillGaps: SkillGap[];
  // Backwards-compatible aliases
  gaps?: SkillGap[];
  strengths?: string[];
  hasCompletedAssessment?: boolean;
  aiExplanation?: string;
}

export interface SkillGapReportSummary {
  studentId: string;
  careerId: string;
  careerName: string;
  overallGapScore: number;
  overallReadiness: number;
  totalRequiredSkills: number;
  skillsMet: number;
  skillsWithGaps: number;
  criticalGaps: number;
  highPriorityGaps: number;
  mediumPriorityGaps: number;
  lowPriorityGaps: number;
  unassessedSkills: number;
  topSkillGaps: SkillGap[];
  generatedAt: string;
}
