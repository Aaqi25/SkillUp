/**
 * SkillUp AI - Deterministic Skill-Gap Analysis Engine
 * 
 * ARCHITECTURAL RULE 1: Do not use AI for deterministic calculations.
 * ARCHITECTURAL RULE 4: Skill-gap calculation must be deterministic.
 */

import { CareerRole, UserSkillScore, SkillGapItem, SkillGapAnalysisResult } from '../../common/types.js';

export class SkillGapEngine {
  /**
   * Deterministically evaluates the gap between student proficiency and career expectations.
   */
  public static analyze(
    userId: string,
    career: CareerRole,
    userSkills: UserSkillScore[],
    aiExplanation?: string
  ): SkillGapAnalysisResult {
    const userSkillMap = new Map<string, number>();
    for (const s of userSkills) {
      userSkillMap.set(s.skillId, s.score);
    }

    const gaps: SkillGapItem[] = [];
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

      let priority: SkillGapItem['priority'] = 'low';
      if (gap >= 35) {
        priority = 'critical';
      } else if (gap >= 20) {
        priority = 'high';
      } else if (gap >= 10) {
        priority = 'medium';
      }

      // 10 gap points roughly corresponds to ~1 week of structured study
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

    // Sort gaps: critical and high priority first
    const priorityWeight: Record<SkillGapItem['priority'], number> = {
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
