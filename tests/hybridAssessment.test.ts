/**
 * Antigravity Test Suite: Hybrid Assessment Verification
 * Verifies that initial assessments are 100% curated and reassessments follow ~70% curated / ~30% AI ratio.
 */

import { QuestionSelector } from '../server/modules/assessment/questionSelector.js';

export async function runHybridAssessmentTests() {
  console.log('--- Running Test: QuestionSelector Hybrid Ratio (Rule 6) ---');

  // 1. Initial Assessment Check (Must be 100% curated)
  const initial = await QuestionSelector.selectQuestions({
    targetSkillIds: ['skl_ts_react', 'skl_node_express'],
    totalQuestions: 6,
    isReassessment: false,
  });

  if (initial.aiRatio !== 0.0 || initial.curatedRatio !== 1.0) {
    throw new Error(`Initial assessment must be 100% curated: Got curated=${initial.curatedRatio}, ai=${initial.aiRatio}`);
  }

  // 2. Reassessment Check (Must be approx 70% curated / 30% AI)
  const reassessment = await QuestionSelector.selectQuestions({
    targetSkillIds: ['skl_ts_react', 'skl_node_express'],
    totalQuestions: 6,
    isReassessment: true,
  });

  const aiQuestions = reassessment.questions.filter(q => q.source === 'ai_generated');
  const curatedQuestions = reassessment.questions.filter(q => q.source === 'curated');

  if (aiQuestions.length === 0) {
    throw new Error('Reassessment must include AI-generated questions');
  }

  // For 6 questions, 2 AI questions = 33% (~30%), 4 curated = 67% (~70%)
  if (reassessment.aiRatio < 0.25 || reassessment.aiRatio > 0.40) {
    throw new Error(`Reassessment AI ratio out of expected ~30% bounds: ${reassessment.aiRatio}`);
  }

  console.log(`✓ Hybrid Assessment: Initial (100% curated, 0% AI), Reassessment (${curatedQuestions.length} curated [${reassessment.curatedRatio * 100}%], ${aiQuestions.length} AI [${reassessment.aiRatio * 100}%])`);
}
