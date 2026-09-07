export type UserRole = 'student' | 'instructor' | 'admin';
export type SkillProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserProfile {
  id: string;
  email: string;
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

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  maxScore: number;
}

export interface UserSkillRating {
  skillId: string;
  skillName: string;
  score: number;
  level: SkillProficiencyLevel;
  lastAssessedAt: string;
}

export interface CareerRoleItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  marketDemand: 'high' | 'very_high' | 'moderate';
  averageSalary?: string;
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    weight: number;
    targetLevel: number;
  }>;
}

export interface CareerMatchItem {
  careerId: string;
  careerTitle: string;
  matchPercentage: number;
  fitLevel: 'strong_match' | 'moderate_match' | 'growth_opportunity';
  skillContributions: Array<{
    skillId: string;
    skillName: string;
    userScore: number;
    targetScore: number;
    weight: number;
    contribution: number;
  }>;
}

export interface SkillGapItem {
  skillId: string;
  skillName: string;
  currentScore: number;
  requiredScore: number;
  gap: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedWeeksToBridge: number;
}

export interface SkillGapAnalysis {
  userId: string;
  careerId: string;
  careerTitle: string;
  overallReadiness: number;
  totalGapScore: number;
  gaps: SkillGapItem[];
  strengths: string[];
  aiExplanation?: string;
}

export interface RoadmapMilestoneItem {
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

export interface RoadmapData {
  id: string;
  userId: string;
  targetCareerId: string;
  targetCareerTitle: string;
  totalEstimatedWeeks: number;
  milestones: RoadmapMilestoneItem[];
  generatedAt: string;
  lastRefinedAt?: string;
}

export interface ProgressStatus {
  completionPercentage: number;
  completedMilestones: number;
  totalMilestones: number;
  readyForReassessment: boolean;
  reassessmentCount: number;
  activeSkills: UserSkillRating[];
}

export interface ArchitectureStatus {
  name: string;
  pattern: string;
  database: string;
  rules: Array<{
    id: number;
    text: string;
    status: 'enforced' | 'pending';
  }>;
  modules: Array<{
    name: string;
    path: string;
    status: string;
  }>;
}
