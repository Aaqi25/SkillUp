import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';
import { QuestionSelector } from './questionSelector.js';
import { ScoringEngine } from './scoringEngine.js';
import { AssessmentSubmissionAnswer } from '../../common/types.js';

export const assessmentRouter = Router();

// GET /api/assessment/questions - Hybrid question selection
// Rule 6: Initial = 100% curated, Reassessment = ~70% curated + ~30% AI-generated
assessmentRouter.get('/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isReassessment = req.query.isReassessment === 'true';
    const rawSkills = req.query.skills as string;
    const targetSkillIds = rawSkills
      ? rawSkills.split(',')
      : db.getAllSkills().map(s => s.id);

    const selection = await QuestionSelector.selectQuestions({
      targetSkillIds,
      totalQuestions: isReassessment ? 6 : 6,
      isReassessment,
    });

    // Strip out correctOptionIndex and explanations before sending to client for test integrity
    const sanitizedQuestions = selection.questions.map(q => ({
      id: q.id,
      skillId: q.skillId,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: q.options,
      source: q.source,
      weight: q.weight,
    }));

    return sendSuccess(res, {
      questions: sanitizedQuestions,
      curatedRatio: selection.curatedRatio,
      aiRatio: selection.aiRatio,
      isReassessment,
      assessmentId: `asm_${Date.now()}`,
    }, 'assessment');
  } catch (error) {
    return sendError(res, 'Failed to prepare assessment questions', 500, 'QUESTION_GENERATION_FAILED', error, 'assessment');
  }
});

// POST /api/assessment/submit - Deterministic scoring & skill update
// Rule 1 & 2: No AI for deterministic scoring, strict backend logic
assessmentRouter.post('/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'usr_student_demo_01';
    const { assessmentId, isReassessment, answers } = req.body as {
      assessmentId: string;
      isReassessment: boolean;
      answers: AssessmentSubmissionAnswer[];
    };

    if (!answers || !Array.isArray(answers)) {
      return sendError(res, 'Invalid answers payload', 400, 'INVALID_PAYLOAD', null, 'assessment');
    }

    // Retrieve questions from database/question bank
    const questionIds = answers.map(a => a.questionId);
    const allQuestions = db.getAllQuestions();
    const relevantQuestions = allQuestions.filter(q => questionIds.includes(q.id));

    // For any AI-generated questions generated on the fly, match them or add them
    for (const ans of answers) {
      if (!relevantQuestions.some(q => q.id === ans.questionId)) {
        relevantQuestions.push({
          id: ans.questionId,
          skillId: 'skl_ts_react',
          difficulty: 'medium',
          questionText: 'Adaptive Question',
          options: ['A', 'B', 'C', 'D'],
          correctOptionIndex: 0,
          explanation: 'Standard adaptive question answer key',
          source: 'ai_generated',
          weight: 1.1,
        });
      }
    }

    // Run deterministic scoring engine
    const result = ScoringEngine.calculate({
      assessmentId: assessmentId || `asm_${Date.now()}`,
      userId,
      isReassessment: !!isReassessment,
      questions: relevantQuestions,
      answers,
    });

    // Update student's persistent skill profile based on assessed breakdown
    for (const [skillId, stats] of Object.entries(result.skillBreakdown)) {
      // Blend new performance with previous baseline (or set new baseline)
      const currentSkills = db.getUserSkills(userId);
      const existing = currentSkills.find(s => s.skillId === skillId);
      const newScore = existing
        ? Math.round((existing.score * 0.4 + stats.weightedScore * 0.6) * 10) / 10
        : stats.weightedScore;

      db.updateUserSkill(userId, skillId, newScore);
    }

    // Record persistent assessment record in PostgreSQL store
    db.saveAssessmentResult(result);

    return sendSuccess(res, result, 'assessment');
  } catch (error) {
    return sendError(res, 'Failed to score assessment', 500, 'SCORING_FAILED', error, 'assessment');
  }
});

// GET /api/assessment/history
assessmentRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const history = db.getUserAssessments(userId);
  return sendSuccess(res, history, 'assessment');
});
