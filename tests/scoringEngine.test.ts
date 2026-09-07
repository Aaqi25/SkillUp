/**
 * Antigravity Test Suite: Deterministic Scoring Engine
 * Verifies that scoring is strictly deterministic, respects question weights, and contains no stochastic AI drift.
 */

import { ScoringEngine } from '../server/modules/assessment/scoringEngine.js';
import { AssessmentQuestion, AssessmentSubmissionAnswer } from '../server/common/types.js';

export function runScoringTests() {
  console.log('--- Running Test: ScoringEngine (Rules 1 & 2) ---');

  const sampleQuestions: AssessmentQuestion[] = [
    {
      id: 'q1',
      skillId: 'skl_ts_react',
      difficulty: 'medium',
      questionText: 'Test Q1',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 1,
      explanation: 'Explanation',
      source: 'curated',
      weight: 1.0,
    },
    {
      id: 'q2',
      skillId: 'skl_ts_react',
      difficulty: 'hard',
      questionText: 'Test Q2',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 3,
      explanation: 'Explanation',
      source: 'curated',
      weight: 2.0,
    },
    {
      id: 'q3',
      skillId: 'skl_node_express',
      difficulty: 'medium',
      questionText: 'Test Q3',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      explanation: 'Explanation',
      source: 'curated',
      weight: 1.0,
    },
  ];

  // Scenario A: Student gets q1 wrong (selected 0 instead of 1), q2 right (selected 3), q3 right (selected 0)
  // Total weight = 1 + 2 + 1 = 4.0
  // Earned weight = 0 + 2 + 1 = 3.0
  // Expected overallScore = (3 / 4) * 100 = 75.0%
  const answers: AssessmentSubmissionAnswer[] = [
    { questionId: 'q1', selectedOptionIndex: 0 },
    { questionId: 'q2', selectedOptionIndex: 3 },
    { questionId: 'q3', selectedOptionIndex: 0 },
  ];

  const result = ScoringEngine.calculate({
    assessmentId: 'test_asm_01',
    userId: 'test_user_01',
    isReassessment: false,
    questions: sampleQuestions,
    answers,
  });

  if (result.overallScore !== 75) {
    throw new Error(`ScoringEngine failed: Expected overallScore 75, got ${result.overallScore}`);
  }

  const tsBreakdown = result.skillBreakdown['skl_ts_react'];
  if (!tsBreakdown || tsBreakdown.correct !== 1 || tsBreakdown.total !== 2) {
    throw new Error(`Skill breakdown calculation failed for skl_ts_react: ${JSON.stringify(tsBreakdown)}`);
  }

  // skl_ts_react weighted score: (2 earned weight / 3 total weight) * 100 = 66.7%
  if (tsBreakdown.weightedScore !== 66.7) {
    throw new Error(`Weighted score incorrect: Expected 66.7, got ${tsBreakdown.weightedScore}`);
  }

  console.log('✓ ScoringEngine: Passed deterministic calculation & weight checks');
}
