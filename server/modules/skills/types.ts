/**
 * SkillUp AI - Module 3: Skill Analysis Domain Types
 * Strict type contracts for deterministic proficiency calculation, skill profiles, and history.
 */

export type ProficiencyLevel = 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';

export interface ProficiencyThreshold {
  level: ProficiencyLevel;
  minScore: number;
  maxScore: number;
}

export interface SkillHistoryEntry {
  assessmentId: string;
  score: number; // 0 to 100
  level: ProficiencyLevel;
  questionsAttempted: number;
  correctAnswers: number;
  assessedAt: string;
}

export interface StudentSkillScore {
  skillId: string;
  skillName: string;
  category: string;
  score: number; // 0 to 100
  level: ProficiencyLevel;
  questionsAttempted: number;
  correctAnswers: number;
  lastAssessedDate: string;
  history?: SkillHistoryEntry[];
}

export interface StudentSkillProfile {
  userId: string;
  overallScore: number; // 0 to 100
  overallLevel: ProficiencyLevel;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  skills: StudentSkillScore[];
  strongestSkills: StudentSkillScore[]; // Top 3
  weakestSkills: StudentSkillScore[];   // Top 3 (Skills to improve)
  lastAssessedDate?: string;
  assessmentCount: number;
}
