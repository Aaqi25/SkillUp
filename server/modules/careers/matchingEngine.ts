/**
 * SkillUp AI - Weighted Career Matching Engine
 * 
 * ARCHITECTURAL RULE 1: Do not use AI for deterministic calculations.
 * ARCHITECTURAL RULE 3: Career matching must use a weighted skill-matching algorithm.
 */

import { CareerRole, UserSkillScore, CareerMatchResult } from '../../common/types.js';

export class CareerMatchingEngine {
  /**
   * Deterministically calculates career match percentage using weighted skill contribution.
   * 
   * Formula:
   * Fulfillment_i = min(1.0, UserScore_i / TargetScore_i)
   * Contribution_i = Weight_i * Fulfillment_i
   * MatchPercentage = sum(Contribution_i) * 100
   */
  public static calculateMatch(career: CareerRole, userSkills: UserSkillScore[]): CareerMatchResult {
    const userSkillMap = new Map<string, number>();
    for (const s of userSkills) {
      userSkillMap.set(s.skillId, s.score);
    }

    let totalMatchScore = 0;
    const contributions: CareerMatchResult['skillContributions'] = [];

    for (const req of career.requiredSkills) {
      const userScore = userSkillMap.get(req.skillId) || 0;
      const targetScore = req.targetLevel || 100;
      const weight = req.weight;

      // Ratio of user competence compared to role benchmark, capped at 1.0 (100%)
      const fulfillmentRatio = targetScore > 0 ? Math.min(1.0, userScore / targetScore) : 0;
      const contribution = weight * fulfillmentRatio;

      totalMatchScore += contribution;

      contributions.push({
        skillId: req.skillId,
        skillName: req.skillName,
        userScore: Math.round(userScore * 10) / 10,
        targetScore,
        weight,
        contribution: Math.round(contribution * 1000) / 1000,
      });
    }

    const matchPercentage = Math.round(totalMatchScore * 1000) / 10;

    let fitLevel: CareerMatchResult['fitLevel'] = 'growth_opportunity';
    if (matchPercentage >= 78) {
      fitLevel = 'strong_match';
    } else if (matchPercentage >= 58) {
      fitLevel = 'moderate_match';
    }

    return {
      careerId: career.id,
      careerTitle: career.title,
      matchPercentage,
      fitLevel,
      skillContributions: contributions,
    };
  }

  /**
   * Ranks all careers by match percentage in descending order.
   */
  public static rankCareers(careers: CareerRole[], userSkills: UserSkillScore[]): CareerMatchResult[] {
    return careers
      .map(c => this.calculateMatch(c, userSkills))
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }
}
