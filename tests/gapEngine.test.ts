/**
 * Antigravity Test Suite: Deterministic Skill-Gap Analysis Engine
 * Verifies that gap calculations, thresholds, priorities, and readiness are strictly deterministic.
 */

import { SkillGapEngine } from '../server/modules/skill-gap/gapEngine.js';
import { CareerRole, UserSkillScore } from '../server/common/types.js';

export function runGapTests() {
  console.log('--- Running Test: SkillGapEngine (Rules 1 & 4) ---');

  const sampleCareer: CareerRole = {
    id: 'car_test',
    title: 'Test DevOps Engineer',
    slug: 'test-devops',
    description: 'Cloud & Infrastructure',
    marketDemand: 'high',
    requiredSkills: [
      { skillId: 'skl_docker', skillName: 'Docker', weight: 0.5, targetLevel: 80 },
      { skillId: 'skl_k8s', skillName: 'Kubernetes', weight: 0.5, targetLevel: 90 },
    ],
  };

  const studentSkills: UserSkillScore[] = [
    // Docker: score 70 vs target 80 -> gap = 10 (medium priority)
    { skillId: 'skl_docker', skillName: 'Docker', score: 70, level: 'advanced', lastAssessedAt: '' },
    // Kubernetes: score 40 vs target 90 -> gap = 50 (critical priority)
    { skillId: 'skl_k8s', skillName: 'Kubernetes', score: 40, level: 'beginner', lastAssessedAt: '' },
  ];

  const analysis = SkillGapEngine.analyze('usr_01', sampleCareer, studentSkills);

  // Check gaps
  const k8sGap = analysis.gaps.find(g => g.skillId === 'skl_k8s');
  if (!k8sGap || k8sGap.gap !== 50 || k8sGap.priority !== 'critical') {
    throw new Error(`K8s gap incorrect: ${JSON.stringify(k8sGap)}`);
  }

  const dockerGap = analysis.gaps.find(g => g.skillId === 'skl_docker');
  if (!dockerGap || dockerGap.gap !== 10 || dockerGap.priority !== 'medium') {
    throw new Error(`Docker gap incorrect: ${JSON.stringify(dockerGap)}`);
  }

  // Total readiness: (70 + 40) / (80 + 90) = 110 / 170 = 64.7%
  if (analysis.overallReadiness !== 64.7) {
    throw new Error(`Overall readiness incorrect: Expected 64.7%, got ${analysis.overallReadiness}%`);
  }

  console.log('✓ SkillGapEngine: Passed deterministic gap math & priority classification');
}
