import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest, authenticate } from '../../common/middleware/auth.js';
import { QuestionSelector } from './questionSelector.js';
import { ScoringEngine } from './scoringEngine.js';
import { SkillAnalysisEngine } from '../skills/skillAnalysisEngine.js';
import { AssessmentSubmissionAnswer, AssessmentAttempt } from '../../common/types.js';

export const assessmentRouter = Router();

// All assessment endpoints require authentication
assessmentRouter.use(authenticate);

// POST /api/assessment/start - Initialize an assessment attempt
assessmentRouter.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { skills, isReassessment } = req.body as {
      skills?: string[];
      isReassessment?: boolean;
    };

    const targetSkillIds = Array.isArray(skills) && skills.length > 0
      ? skills
      : db.getAllSkills().map(s => s.id);

    // Initial assessment MVP is strictly 100% curated questions
    const selection = await QuestionSelector.selectQuestions({
      targetSkillIds,
      totalQuestions: 6,
      isReassessment: !!isReassessment,
    });

    const attemptId = `asm_att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const attempt: AssessmentAttempt = {
      id: attemptId,
      userId,
      status: 'in_progress',
      isReassessment: !!isReassessment,
      targetSkillIds,
      questionIds: selection.questions.map(q => q.id),
      startedAt: new Date().toISOString(),
    };

    db.createAssessmentAttempt(attempt);

    // Sanitize questions: strip out correctOptionIndex and explanations
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
      attemptId,
      questions: sanitizedQuestions,
      curatedRatio: selection.curatedRatio,
      aiRatio: selection.aiRatio,
      isReassessment: !!isReassessment,
      totalQuestions: sanitizedQuestions.length,
    }, 'assessment');
  } catch (error) {
    return sendError(res, 'Failed to start assessment attempt', 500, 'ASSESSMENT_START_FAILED', error, 'assessment');
  }
});

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
      totalQuestions: 6,
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
    const userId = req.user!.id;
    const { assessmentId, isReassessment, answers } = req.body as {
      assessmentId: string;
      isReassessment?: boolean;
      answers: AssessmentSubmissionAnswer[];
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return sendError(res, 'Invalid answers payload: answers array is required and must not be empty', 400, 'INVALID_PAYLOAD', null, 'assessment');
    }

    // Validate each answer structure
    for (const ans of answers) {
      if (!ans.questionId || typeof ans.selectedOptionIndex !== 'number' || ans.selectedOptionIndex < 0) {
        return sendError(res, 'Each answer must include a valid questionId and selectedOptionIndex', 400, 'INVALID_ANSWER_FORMAT', null, 'assessment');
      }
    }

    // Retrieve questions from database/question bank
    const questionIds = answers.map(a => a.questionId);
    const allQuestions = db.getAllQuestions();
    const relevantQuestions = allQuestions.filter(q => questionIds.includes(q.id));

    // Handle any dynamic or non-preseeded questions safely
    for (const ans of answers) {
      if (!relevantQuestions.some(q => q.id === ans.questionId)) {
        const fallbackQ = db.getQuestion(ans.questionId);
        if (fallbackQ) {
          relevantQuestions.push(fallbackQ);
        } else {
          relevantQuestions.push({
            id: ans.questionId,
            skillId: 'skl_ts_react',
            difficulty: 'medium',
            questionText: 'Adaptive Question',
            options: ['A', 'B', 'C', 'D'],
            correctOptionIndex: 0,
            explanation: 'Standard adaptive question answer key',
            source: 'curated',
            weight: 1.0,
          });
        }
      }
    }

    // Retrieve active attempt if exists to respect its isReassessment status
    const attempt = assessmentId ? db.getAssessmentAttempt(assessmentId) : undefined;
    const finalIsReassessment = typeof isReassessment === 'boolean'
      ? isReassessment
      : (attempt ? !!attempt.isReassessment : false);

    // Run deterministic scoring engine
    const finalAssessmentId = assessmentId || `asm_${Date.now()}`;
    const result = ScoringEngine.calculate({
      assessmentId: finalAssessmentId,
      userId,
      isReassessment: finalIsReassessment,
      questions: relevantQuestions,
      answers,
    });

    // Step 1: Record persistent assessment record in PostgreSQL store
    db.saveAssessmentResult(result);

    // Step 2: Skill Analysis Engine processes the result and updates persistent skill profile & history
    SkillAnalysisEngine.processAssessmentResult(result);

    // Step 3: If there is an active assessment attempt, mark it as completed
    if (attempt) {
      db.updateAssessmentAttempt(attempt.id, {
        status: 'completed',
        completedAt: result.completedAt,
        resultId: result.assessmentId,
      });
    }

    return sendSuccess(res, result, 'assessment');
  } catch (error) {
    return sendError(res, 'Failed to score assessment', 500, 'SCORING_FAILED', error, 'assessment');
  }
});

// GET /api/assessment/history - Retrieve student's past assessment results
assessmentRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const history = db.getUserAssessments(userId);
  return sendSuccess(res, history, 'assessment');
});

// GET /api/assessment/results/:id - Retrieve specific assessment result
assessmentRouter.get('/results/:id', (req: AuthenticatedRequest, res: Response) => {
  const assessmentId = req.params.id;
  const result = db.getAssessmentResultById(assessmentId);

  if (!result) {
    return sendError(res, 'Assessment result not found', 404, 'NOT_FOUND', null, 'assessment');
  }

  // Ensure student only accesses their own assessment result
  if (result.userId !== req.user!.id && req.user!.role !== 'admin') {
    return sendError(res, 'You are not authorized to view this assessment result', 403, 'FORBIDDEN', null, 'assessment');
  }

  return sendSuccess(res, result, 'assessment');
});
