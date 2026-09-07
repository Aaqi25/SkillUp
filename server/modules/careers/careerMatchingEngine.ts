/**
 * SkillUp AI - Module 4: Deterministic Career Matching Engine
 * 
 * ARCHITECTURAL PRINCIPLE:
 * "Algorithms decide WHAT. AI decides HOW."
 * All match calculations, percentage determinations, category mappings,
 * rankings, and skill gap identifications are 100% deterministic without LLM calls.
 * 
 * FORMULA:
 * match score = Σ(studentSkillScore_i × careerSkillWeight_i) / Σ(careerSkillWeight_i)
 * for all assessed skills i.
 * 
 * MISSING SKILL BEHAVIOR (DOCUMENTED):
 * As mandated by the architecture rules, unassessed skills are NOT automatically penalized as 0
 * in the score denominator, ensuring fair evaluation of demonstrated competence.
 * The numerator sums (studentSkillScore × weight) for assessed skills, divided by the sum of weights
 * of assessed skills, normalized to 0–100.
 * Missing required skills are explicitly tracked in `matchedSkillCount` vs `requiredSkillCount`,
 * and surfaced under `weakestMatchingSkills` / `skillsToImprove` with `isMissing: true` flag.
 * If no required skills are assessed, match score is 0.
 */

import { CareerRole, UserSkillScore } from '../../common/types.js';
import { StudentSkillScore } from '../skills/types.js';
import {
  RankedCareerRecommendation,
  SkillMatchContribution,
  SkillMatchSummary,
  getMatchCategory,
  getLegacyFitLevel,
  CareerMatchCategory,
} from './types.js';
import { db } from '../../db/client.js';

export class CareerMatchingEngine {
  /**
   * Deterministically calculates career match score, quality tier, and skill contributions.
   */
  public static calculateMatch(
    career: CareerRole,
    userSkills: UserSkillScore[] | StudentSkillScore[]
  ): RankedCareerRecommendation {
    // 1. Build rapid lookup map for student skill scores (0-100)
    const userSkillMap = new Map<string, number>();
    for (const s of userSkills) {
      userSkillMap.set(s.skillId, s.score);
    }

    // Also build parent/child taxonomy lookup for intelligent deterministic fallback
    const allSkills = db.getAllSkills();
    const childToParent = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();

    for (const skill of allSkills) {
      if (skill.parentSkillId) {
        childToParent.set(skill.id, skill.parentSkillId);
        const existing = parentToChildren.get(skill.parentSkillId) || [];
        existing.push(skill.id);
        parentToChildren.set(skill.parentSkillId, existing);
      }
    }

    let assessedWeightedSum = 0;
    let assessedWeightSum = 0;
    let matchedSkillCount = 0;

    const contributions: SkillMatchContribution[] = [];
    const assessedSkillSummaries: SkillMatchSummary[] = [];
    const missingSkillSummaries: SkillMatchSummary[] = [];

    // 2. Iterate through required skills
    for (const req of career.requiredSkills) {
      let userScore: number | undefined = userSkillMap.get(req.skillId);
      let isAssessed = userScore !== undefined;

      // Fallback A: Check if student has child skills (e.g. assessed node_express for programming)
      if (!isAssessed) {
        const childIds = parentToChildren.get(req.skillId);
        if (childIds && childIds.length > 0) {
          const childScores: number[] = [];
          for (const cid of childIds) {
            const cs = userSkillMap.get(cid);
            if (cs !== undefined) childScores.push(cs);
          }
          if (childScores.length > 0) {
            userScore = childScores.reduce((a, b) => a + b, 0) / childScores.length;
            isAssessed = true;
          }
        }
      }

      // Fallback B: Check if student has parent skill (e.g. assessed dsa for algorithms)
      if (!isAssessed) {
        const parentId = childToParent.get(req.skillId);
        if (parentId) {
          const ps = userSkillMap.get(parentId);
          if (ps !== undefined) {
            userScore = ps;
            isAssessed = true;
          }
        }
      }

      const targetScore = req.targetLevel || req.minimumRecommendedLevel || 100;
      const weight = req.weight;

      if (isAssessed && userScore !== undefined) {
        matchedSkillCount++;

        // Fulfillment ratio relative to role benchmark targetLevel (capped at 1.0 / 100%)
        const fulfillmentRatio = targetScore > 0 ? Math.min(1.0, userScore / targetScore) : 0;
        const normalizedSkillScore = fulfillmentRatio * 100;

        // Contribution towards assessed weighted score
        const contribution = weight * fulfillmentRatio;
        assessedWeightedSum += weight * normalizedSkillScore;
        assessedWeightSum += weight;

        contributions.push({
          skillId: req.skillId,
          skillName: req.skillName,
          userScore: Math.round(userScore * 10) / 10,
          targetScore,
          weight,
          contribution: Math.round(contribution * 1000) / 1000,
          isAssessed: true,
          isMissing: false,
        });

        assessedSkillSummaries.push({
          skillId: req.skillId,
          skillName: req.skillName,
          score: Math.round(userScore * 10) / 10,
          weight,
          targetLevel: targetScore,
          isMissing: false,
        });
      } else {
        // Missing / unassessed required skill
        contributions.push({
          skillId: req.skillId,
          skillName: req.skillName,
          userScore: 0,
          targetScore,
          weight,
          contribution: 0,
          isAssessed: false,
          isMissing: true,
        });

        missingSkillSummaries.push({
          skillId: req.skillId,
          skillName: req.skillName,
          score: 0,
          weight,
          targetLevel: targetScore,
          isMissing: true,
        });
      }
    }

    // 3. Calculate normalized match score:
    // match score = Σ(studentSkillScore × careerSkillWeight) / Σ(careerSkillWeight)
    // Normalized to 0–100.
    let matchScore = 0;
    if (assessedWeightSum > 0) {
      matchScore = Math.round((assessedWeightedSum / assessedWeightSum) * 10) / 10;
      matchScore = Math.min(100, Math.max(0, matchScore));
    }

    // Backward compatible matchPercentage
    const matchPercentage = matchScore;

    // Deterministic match category based on centralized thresholds
    const matchCategory: CareerMatchCategory = getMatchCategory(matchScore);
    const fitLevel = getLegacyFitLevel(matchScore);

    // 4. Deterministic explanation:
    // Strongest matching skills: top assessed skills sorted by score descending with alphabetical tie-break
    const strongestMatchingSkills = [...assessedSkillSummaries]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.skillName.localeCompare(b.skillName);
      })
      .slice(0, 3);

    // Skills to improve: missing required skills first, followed by assessed skills below targetLevel or benchmark (<75)
    const lowAssessedSkills = [...assessedSkillSummaries]
      .filter(s => s.score < (s.targetLevel || 75))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.skillName.localeCompare(b.skillName);
      });

    const sortedMissing = [...missingSkillSummaries].sort((a, b) => a.skillName.localeCompare(b.skillName));
    const weakestMatchingSkills = [...sortedMissing, ...lowAssessedSkills].slice(0, 3);

    return {
      careerId: career.id,
      careerTitle: career.title || career.name || 'Software Engineer',
      careerName: career.name || career.title || 'Software Engineer',
      slug: career.slug || career.id,
      category: career.category || 'Engineering',
      description: career.description || '',
      averageSalary: career.averageSalary,
      marketDemand: career.marketDemand || 'high',
      matchScore,
      matchPercentage,
      matchCategory,
      fitLevel,
      matchedSkillCount,
      requiredSkillCount: career.requiredSkills.length,
      strongestMatchingSkills,
      weakestMatchingSkills,
      skillContributions: contributions,
    };
  }

  /**
   * Deterministically ranks all careers for a student by:
   * 1. Match score descending
   * 2. Deterministic alphabetical tie-break
   */
  public static rankCareers(
    careers: CareerRole[],
    userSkills: UserSkillScore[] | StudentSkillScore[]
  ): RankedCareerRecommendation[] {
    const results = careers.map(c => this.calculateMatch(c, userSkills));

    results.sort((a, b) => {
      // 1. Match score descending
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // 2. Deterministic alphabetical tie-break
      return a.careerTitle.localeCompare(b.careerTitle);
    });

    return results;
  }
}
