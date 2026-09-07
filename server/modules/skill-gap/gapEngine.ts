/**
 * SkillUp AI - Module 5: Deterministic Skill-Gap Analysis Engine
 * 
 * ARCHITECTURAL CORE RULE:
 * Algorithms decide WHAT the skill gap is.
 * AI must NOT be used to calculate:
 * - current skill score
 * - required skill score
 * - gap score
 * - priority
 * - ranking
 * - completion percentage
 * All calculations are 100% deterministic and reproducible.
 * 
 * SKILL GAP FORMULA:
 * For every skill required by the selected career:
 *   gap = max(requiredLevel - currentLevel, 0)
 *   gapPercentage = gap
 * If currentLevel >= requiredLevel:
 *   gap = 0
 *   status = 'MET'
 * Otherwise:
 *   status = 'GAP'
 * All levels and gaps are strictly normalized to 0–100. Negative gaps are forbidden.
 * 
 * DETERMINISTIC PRIORITY CLASSIFICATION:
 * Documented exact priority thresholds:
 * - CRITICAL: gap >= 40
 * - HIGH:     gap >= 25 and gap < 40
 * - MEDIUM:   gap >= 10 and gap < 25
 * - LOW:      gap > 0 and gap < 10
 * - MET:      gap = 0
 * 
 * DETERMINISTIC RANKING ORDER:
 * 1. Primary:   priority descending (CRITICAL -> HIGH -> MEDIUM -> LOW -> MET)
 * 2. Secondary: gap descending
 * 3. Tertiary:  career weight descending
 * 4. Final:     skill name alphabetical order ascending
 */

import { CareerRole, UserSkillScore } from '../../common/types.js';
import { StudentSkillScore } from '../skills/types.js';
import {
  SkillGap,
  SkillGapReport,
  SkillGapReportSummary,
  SkillGapPriority,
  SkillGapStatus,
} from './types.js';
import { db } from '../../db/client.js';

export class SkillGapEngine {
  /**
   * Deterministic priority rank map for primary sorting
   */
  private static readonly PRIORITY_RANK: Record<SkillGapPriority, number> = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    MET: 1,
  };

  /**
   * Classify priority based on exact deterministic thresholds
   */
  public static calculatePriority(gap: number): SkillGapPriority {
    if (gap <= 0) return 'MET';
    if (gap >= 40) return 'CRITICAL';
    if (gap >= 25) return 'HIGH';
    if (gap >= 10) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generates a comprehensive, deterministic SkillGapReport for a student and target career.
   */
  public static generateReport(
    studentId: string,
    career: CareerRole,
    providedSkills?: UserSkillScore[] | StudentSkillScore[]
  ): SkillGapReport {
    // 1. Resolve student skill scores from Module 3 authoritative profile or fallback
    let userSkillMap = new Map<string, number>();
    let assessedSkillIds = new Set<string>();

    if (providedSkills && providedSkills.length > 0) {
      for (const s of providedSkills) {
        userSkillMap.set(s.skillId, Math.min(100, Math.max(0, s.score)));
        assessedSkillIds.add(s.skillId);
      }
    } else {
      const studentProfile = db.getStudentSkillProfile(studentId);
      if (studentProfile && studentProfile.skills.length > 0) {
        for (const s of studentProfile.skills) {
          userSkillMap.set(s.skillId, Math.min(100, Math.max(0, s.score)));
          if (s.questionsAttempted > 0 || s.lastAssessedDate) {
            assessedSkillIds.add(s.skillId);
          }
        }
      } else {
        const userScores = db.getUserSkills(studentId);
        for (const s of userScores) {
          userSkillMap.set(s.skillId, Math.min(100, Math.max(0, s.score)));
          if (s.lastAssessedAt) {
            assessedSkillIds.add(s.skillId);
          }
        }
      }
    }

    // 2. Build skill taxonomy and parent/child relationship maps from db
    const allSkills = db.getAllSkills();
    const childToParent = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();
    const skillCategoryMap = new Map<string, string>();

    for (const skill of allSkills) {
      skillCategoryMap.set(skill.id, skill.category || 'core');
      if (skill.parentSkillId) {
        childToParent.set(skill.id, skill.parentSkillId);
        const existing = parentToChildren.get(skill.parentSkillId) || [];
        existing.push(skill.id);
        parentToChildren.set(skill.parentSkillId, existing);
      }
    }

    const calculatedGaps: SkillGap[] = [];
    const strengths: string[] = [];
    let weightedCurrentSum = 0;
    let weightedRequiredSum = 0;
    let totalAssessedWeight = 0;
    let weightedGapSum = 0;
    let totalCareerWeight = 0;

    // 3. Evaluate each skill required by the career
    for (const req of career.requiredSkills) {
      const targetScore = Math.min(100, Math.max(0, req.targetLevel || req.minimumRecommendedLevel || 100));
      const careerWeight = req.weight > 0 ? req.weight : 0.1;
      totalCareerWeight += careerWeight;

      let studentScore: number | undefined = userSkillMap.get(req.skillId);
      let isAssessed = studentScore !== undefined && assessedSkillIds.has(req.skillId);

      // Taxonomy Fallback A: Child-to-Parent (If required is parent and student assessed children)
      if (!isAssessed) {
        const children = parentToChildren.get(req.skillId);
        if (children && children.length > 0) {
          const assessedChildren = children
            .filter(cid => userSkillMap.has(cid) && assessedSkillIds.has(cid))
            .map(cid => userSkillMap.get(cid)!);
          if (assessedChildren.length > 0) {
            studentScore = assessedChildren.reduce((a, b) => a + b, 0) / assessedChildren.length;
            isAssessed = true;
          }
        }
      }

      // Taxonomy Fallback B: Parent-to-Child (If required is child and student assessed parent)
      if (!isAssessed) {
        const parentId = childToParent.get(req.skillId);
        if (parentId && userSkillMap.has(parentId) && assessedSkillIds.has(parentId)) {
          studentScore = userSkillMap.get(parentId);
          isAssessed = true;
        }
      }

      // If unassessed: score is 0, isUnassessed = true
      const currentLevel = isAssessed && studentScore !== undefined
        ? Math.min(100, Math.max(0, Math.round(studentScore * 10) / 10))
        : 0;
      const isUnassessedFlag = !isAssessed;

      // Deterministic Skill Gap Formula:
      // gap = max(requiredLevel - currentLevel, 0)
      const rawGap = Math.max(0, targetScore - currentLevel);
      const gap = Math.round(rawGap * 10) / 10;
      const gapPercentage = gap;

      const status: SkillGapStatus = currentLevel >= targetScore || gap === 0 ? 'MET' : 'GAP';
      const priority = this.calculatePriority(gap);

      if (status === 'MET') {
        strengths.push(req.skillName);
      }

      // Track weighted math
      weightedCurrentSum += Math.min(currentLevel, targetScore) * careerWeight;
      weightedRequiredSum += targetScore * careerWeight;
      totalAssessedWeight += careerWeight;
      weightedGapSum += gap * careerWeight;

      // Identify prerequisites/dependencies from taxonomy if any
      const parentId = childToParent.get(req.skillId);
      const prerequisites: string[] = parentId ? [parentId] : [];

      calculatedGaps.push({
        skillId: req.skillId,
        skillName: req.skillName,
        category: skillCategoryMap.get(req.skillId) || 'core',
        currentLevel,
        requiredLevel: targetScore,
        gap,
        gapPercentage,
        status,
        priority,
        careerWeight,
        isUnassessed: isUnassessedFlag,
        prerequisites,
        // Backward compatibility properties
        currentScore: currentLevel,
        requiredScore: targetScore,
        estimatedWeeksToBridge: gap > 0 ? Math.max(1, Math.ceil(gap / 10)) : 0,
      });
    }

    // 4. Deterministic Ranking:
    // Primary: priority (CRITICAL -> HIGH -> MEDIUM -> LOW -> MET)
    // Secondary: gap descending
    // Tertiary: career weight descending
    // Final tie-break: skill name alphabetical order ascending
    calculatedGaps.sort((a, b) => {
      const priorityDiff = this.PRIORITY_RANK[b.priority] - this.PRIORITY_RANK[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const gapDiff = b.gap - a.gap;
      if (Math.abs(gapDiff) > 0.001) return gapDiff;

      const weightDiff = b.careerWeight - a.careerWeight;
      if (Math.abs(weightDiff) > 0.001) return weightDiff;

      return a.skillName.localeCompare(b.skillName);
    });

    // 5. Aggregate Summary Counts
    const skillsMet = calculatedGaps.filter(g => g.status === 'MET').length;
    const skillsWithGaps = calculatedGaps.filter(g => g.status === 'GAP').length;
    const criticalGaps = calculatedGaps.filter(g => g.priority === 'CRITICAL').length;
    const highPriorityGaps = calculatedGaps.filter(g => g.priority === 'HIGH').length;
    const mediumPriorityGaps = calculatedGaps.filter(g => g.priority === 'MEDIUM').length;
    const lowPriorityGaps = calculatedGaps.filter(g => g.priority === 'LOW').length;
    const unassessedSkills = calculatedGaps.filter(g => g.isUnassessed).length;

    // Overall Gap Score (weighted average gap)
    const overallGapScore = totalCareerWeight > 0
      ? Math.round((weightedGapSum / totalCareerWeight) * 10) / 10
      : 0;

    // Overall Readiness: (weightedCurrent / weightedRequired) * 100
    const overallReadiness = weightedRequiredSum > 0
      ? Math.min(100, Math.round((weightedCurrentSum / weightedRequiredSum) * 1000) / 10)
      : 0;

    const hasCompletedAssessment = assessedSkillIds.size > 0;

    return {
      studentId,
      userId: studentId,
      careerId: career.id,
      careerName: career.title,
      careerTitle: career.title,
      careerCategory: career.description,
      overallGapScore,
      overallReadiness,
      totalRequiredSkills: career.requiredSkills.length,
      skillsMet,
      skillsWithGaps,
      criticalGaps,
      highPriorityGaps,
      mediumPriorityGaps,
      lowPriorityGaps,
      unassessedSkills,
      generatedAt: new Date().toISOString(),
      orderedSkillGaps: calculatedGaps,
      gaps: calculatedGaps,
      strengths,
      hasCompletedAssessment,
    };
  }

  /**
   * Generates a compact dashboard summary of the skill gap report.
   */
  public static generateSummary(
    studentId: string,
    career: CareerRole,
    providedSkills?: UserSkillScore[] | StudentSkillScore[]
  ): SkillGapReportSummary {
    const report = this.generateReport(studentId, career, providedSkills);
    const topSkillGaps = report.orderedSkillGaps
      .filter(g => g.status === 'GAP')
      .slice(0, 3);

    return {
      studentId,
      careerId: career.id,
      careerName: career.title,
      overallGapScore: report.overallGapScore,
      overallReadiness: report.overallReadiness,
      totalRequiredSkills: report.totalRequiredSkills,
      skillsMet: report.skillsMet,
      skillsWithGaps: report.skillsWithGaps,
      criticalGaps: report.criticalGaps,
      highPriorityGaps: report.highPriorityGaps,
      mediumPriorityGaps: report.mediumPriorityGaps,
      lowPriorityGaps: report.lowPriorityGaps,
      unassessedSkills: report.unassessedSkills,
      topSkillGaps,
      generatedAt: report.generatedAt,
    };
  }

  /**
   * Backwards compatible method used by early tests and legacy endpoints.
   */
  public static analyze(
    userId: string,
    career: CareerRole,
    userSkills: UserSkillScore[],
    aiExplanation?: string
  ) {
    const userSkillMap = new Map<string, number>();
    for (const s of userSkills) {
      userSkillMap.set(s.skillId, s.score);
    }

    const gaps: Array<{
      skillId: string;
      skillName: string;
      currentScore: number;
      requiredScore: number;
      gap: number;
      priority: 'critical' | 'high' | 'medium' | 'low';
      estimatedWeeksToBridge: number;
    }> = [];
    const strengths: string[] = [];
    let totalCurrent = 0;
    let totalRequired = 0;
    let totalGapSum = 0;

    for (const req of career.requiredSkills) {
      const currentScore = userSkillMap.get(req.skillId) || 0;
      const requiredScore = req.targetLevel || 100;
      const gap = Math.max(0, Math.round((requiredScore - currentScore) * 10) / 10);

      totalCurrent += currentScore;
      totalRequired += requiredScore;
      totalGapSum += gap;

      if (gap === 0) {
        strengths.push(req.skillName);
      }

      // Priority mapping matching test assertions
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (gap >= 40) {
        priority = 'critical';
      } else if (gap >= 25) {
        priority = 'high';
      } else if (gap >= 10) {
        priority = 'medium';
      }

      const estimatedWeeksToBridge = Math.max(1, Math.ceil(gap / 10));

      gaps.push({
        skillId: req.skillId,
        skillName: req.skillName,
        currentScore: Math.round(currentScore * 10) / 10,
        requiredScore,
        gap,
        priority,
        estimatedWeeksToBridge,
      });
    }

    const priorityWeight = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    gaps.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || b.gap - a.gap);

    const overallReadiness = totalRequired > 0
      ? Math.min(100, Math.round((totalCurrent / totalRequired) * 1000) / 10)
      : 0;

    return {
      userId,
      careerId: career.id,
      careerTitle: career.title,
      overallReadiness,
      totalGapScore: Math.round(totalGapSum * 10) / 10,
      gaps,
      strengths,
      aiExplanation,
    };
  }
}
