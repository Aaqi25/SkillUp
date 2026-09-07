/**
 * Antigravity Test Suite: Weighted Career Matching Algorithm
 * Verifies that career matching obeys exact skill weights and fulfillment ratios.
 */

import { CareerMatchingEngine } from '../server/modules/careers/matchingEngine.js';
import { CareerRole, UserSkillScore } from '../server/common/types.js';

export function runMatchingTests() {
  console.log('--- Running Test: CareerMatchingEngine (Rules 1 & 3) ---');

  const sampleCareer: CareerRole = {
    id: 'test_car',
    title: 'Test Full Stack Role',
    slug: 'test-full-stack',
    description: 'Test Role',
    marketDemand: 'high',
    requiredSkills: [
      // Skill A: weight 0.60, target 100
      { skillId: 'skl_a', skillName: 'Frontend', weight: 0.60, targetLevel: 100 },
      // Skill B: weight 0.40, target 80
      { skillId: 'skl_b', skillName: 'Backend', weight: 0.40, targetLevel: 80 },
    ],
  };

  // Student scores:
  // skl_a: 50/100 -> fulfillment 0.50 -> contribution = 0.60 * 0.50 = 0.30
  // skl_b: 80/80 -> fulfillment 1.00 -> contribution = 0.40 * 1.00 = 0.40
  // Total Match = 0.30 + 0.40 = 0.70 -> 70%
  const studentSkills: UserSkillScore[] = [
    { skillId: 'skl_a', skillName: 'Frontend', score: 50, level: 'intermediate', lastAssessedAt: '' },
    { skillId: 'skl_b', skillName: 'Backend', score: 80, level: 'expert', lastAssessedAt: '' },
  ];

  const match = CareerMatchingEngine.calculateMatch(sampleCareer, studentSkills);

  if (match.matchPercentage !== 70) {
    throw new Error(`MatchingEngine failed: Expected 70%, got ${match.matchPercentage}%`);
  }

  if (match.fitLevel !== 'moderate_match') {
    throw new Error(`Fit level incorrect: Expected moderate_match, got ${match.fitLevel}`);
  }

  console.log('✓ CareerMatchingEngine: Passed weighted skill-matching formula verification');
}
