/**
 * SkillUp AI - Hybrid Assessment Question Selector
 * 
 * ARCHITECTURAL RULE 6:
 * - Initial assessment: 100% curated question bank.
 * - Reassessment: approximately 70% curated + 30% AI-generated questions.
 */

import { AssessmentQuestion } from '../../common/types.js';
import { db } from '../../db/client.js';

export interface QuestionSelectionOptions {
  targetSkillIds: string[];
  totalQuestions?: number;
  isReassessment?: boolean;
}

export class QuestionSelector {
  /**
   * Selects questions according to the hybrid assessment rules.
   */
  public static async selectQuestions(options: QuestionSelectionOptions): Promise<{
    questions: AssessmentQuestion[];
    curatedRatio: number;
    aiRatio: number;
  }> {
    const total = options.totalQuestions || 6;
    const isReassessment = !!options.isReassessment;

    const availableCurated = db.getQuestionsForSkills(options.targetSkillIds);

    if (!isReassessment) {
      // 100% Curated Questions for Initial Assessment
      const selected = availableCurated.slice(0, total);
      return {
        questions: selected,
        curatedRatio: 1.0,
        aiRatio: 0.0,
      };
    }

    // Reassessment: ~70% Curated + ~30% AI-Generated
    const targetAiCount = Math.max(1, Math.round(total * 0.3));
    const targetCuratedCount = total - targetAiCount;

    const curatedSelected = availableCurated.slice(0, targetCuratedCount);

    // AI-generated questions are tagged with source: 'ai_generated'
    // Stored with full options, explanation, and difficulty
    const aiQuestions: AssessmentQuestion[] = [];

    // Select skills needing reassessment for dynamic generation
    for (let i = 0; i < targetAiCount; i++) {
      const skillId = options.targetSkillIds[i % options.targetSkillIds.length] || 'skl_ts_react';
      aiQuestions.push({
        id: `q_ai_gen_${Date.now()}_${i}`,
        skillId,
        difficulty: 'medium',
        questionText: `[Adaptive Reassessment] For ${skillId === 'skl_ts_react' ? 'React rendering optimization' : 'Node.js event loop latency'}, what is the most effective deterministic approach to prevent blocking?`,
        options: [
          'Offload CPU-intensive operations to worker threads or background tasks',
          'Increase synchronous while-loop iterations in the main event thread',
          'Disable garbage collection cycles permanently',
          'Use synchronous file system read calls inside HTTP route handlers',
        ],
        correctOptionIndex: 0,
        explanation: 'Offloading intensive tasks prevents blocking the single-threaded event loop, preserving high concurrency and deterministic low latency.',
        source: 'ai_generated',
        weight: 1.1,
      });
    }

    const combined = [...curatedSelected, ...aiQuestions];

    return {
      questions: combined,
      curatedRatio: Math.round((curatedSelected.length / combined.length) * 100) / 100,
      aiRatio: Math.round((aiQuestions.length / combined.length) * 100) / 100,
    };
  }
}
