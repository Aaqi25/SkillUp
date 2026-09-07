/**
 * SkillUp AI - Deterministic Assessment Scoring Engine
 * 
 * ARCHITECTURAL RULE 1: Do not use AI for deterministic calculations.
 * ARCHITECTURAL RULE 2: Assessment scoring must be handled strictly by backend logic.
 */

import { AssessmentQuestion, AssessmentSubmissionAnswer, AssessmentResult, QuestionGradingDetail } from '../../common/types.js';
import { db } from '../../db/client.js';

export interface ScoringEngineInput {
  assessmentId: string;
  userId: string;
  isReassessment: boolean;
  questions: AssessmentQuestion[];
  answers: AssessmentSubmissionAnswer[];
}

export class ScoringEngine {
  /**
   * Deterministically scores an assessment.
   * Compares each selected option index against the question's correct option index.
   * Computes per-skill scores, question grading details, and weighted overall composite score.
   */
  public static calculate(input: ScoringEngineInput): AssessmentResult {
    const { assessmentId, userId, isReassessment, questions, answers } = input;

    const questionMap = new Map<string, AssessmentQuestion>();
    let curatedCount = 0;
    let aiGeneratedCount = 0;

    for (const q of questions) {
      questionMap.set(q.id, q);
      if (q.source === 'curated') {
        curatedCount++;
      } else {
        aiGeneratedCount++;
      }
    }

    const skillStats: Record<string, {
      skillName: string;
      correct: number;
      total: number;
      earnedWeight: number;
      totalWeight: number;
    }> = {};

    let totalEarnedWeight = 0;
    let totalPossibleWeight = 0;
    const details: QuestionGradingDetail[] = [];

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      const skillId = question.skillId;
      const skill = db.getSkill(skillId);
      const skillName = skill ? skill.name : skillId;

      if (!skillStats[skillId]) {
        skillStats[skillId] = {
          skillName,
          correct: 0,
          total: 0,
          earnedWeight: 0,
          totalWeight: 0,
        };
      }

      const isCorrect = ans.selectedOptionIndex === question.correctOptionIndex;
      const weight = question.weight || 1.0;

      skillStats[skillId].total++;
      skillStats[skillId].totalWeight += weight;
      totalPossibleWeight += weight;

      if (isCorrect) {
        skillStats[skillId].correct++;
        skillStats[skillId].earnedWeight += weight;
        totalEarnedWeight += weight;
      }

      details.push({
        questionId: question.id,
        skillId: question.skillId,
        skillName,
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: question.options,
        selectedOptionIndex: ans.selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        isCorrect,
        explanation: question.explanation,
        weight,
      });
    }

    const skillBreakdown: AssessmentResult['skillBreakdown'] = {};

    for (const [skillId, stat] of Object.entries(skillStats)) {
      const percentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
      const weightedScore = stat.totalWeight > 0 ? (stat.earnedWeight / stat.totalWeight) * 100 : 0;

      skillBreakdown[skillId] = {
        skillName: stat.skillName,
        correct: stat.correct,
        total: stat.total,
        percentage: Math.round(percentage * 10) / 10,
        weightedScore: Math.round(weightedScore * 10) / 10,
      };
    }

    const overallScore = totalPossibleWeight > 0
      ? Math.round((totalEarnedWeight / totalPossibleWeight) * 1000) / 10
      : 0;

    return {
      assessmentId,
      userId,
      isReassessment,
      totalQuestions: questions.length,
      curatedCount,
      aiGeneratedCount,
      overallScore,
      skillBreakdown,
      details,
      completedAt: new Date().toISOString(),
    };
  }
}
