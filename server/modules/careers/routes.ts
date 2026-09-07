import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest, authenticate } from '../../common/middleware/auth.js';
import { CareerMatchingEngine } from './careerMatchingEngine.js';
import { SkillAnalysisEngine } from '../skills/skillAnalysisEngine.js';
import { CareerRecommendationsResponse } from './types.js';

export const careersRouter = Router();

/**
 * GET /api/careers
 * Returns the catalog of all available engineering careers.
 */
careersRouter.get('/', (_req, res: Response) => {
  const careers = db.getAllCareers();
  return sendSuccess(res, careers, 'careers');
});

/**
 * Helper to compute recommendation payload for a student.
 */
function buildRecommendationsForUser(userId: string): CareerRecommendationsResponse {
  const careers = db.getAllCareers();
  const profile = SkillAnalysisEngine.getStudentSkillProfile(userId);
  const attempts = db.getUserAttempts(userId).filter(a => a.status === 'completed');
  const selectedRecord = db.getSelectedCareer(userId);

  const hasCompletedAssessment = attempts.length > 0 || (profile.skills && profile.skills.length > 0);

  if (!hasCompletedAssessment) {
    return {
      hasCompletedAssessment: false,
      overallSkillScore: 0,
      topCareer: null,
      recommendations: [],
      selectedCareerId: selectedRecord?.careerId || null,
      selectedCareer: selectedRecord || null,
    };
  }

  // Deterministic weighted matching algorithm (Rule 3)
  const recommendations = CareerMatchingEngine.rankCareers(careers, profile.skills);
  const topCareer = recommendations.length > 0 ? recommendations[0] : null;

  return {
    hasCompletedAssessment: true,
    overallSkillScore: profile.overallScore,
    topCareer,
    recommendations,
    selectedCareerId: selectedRecord?.careerId || null,
    selectedCareer: selectedRecord || null,
  };
}

/**
 * GET /api/careers/recommendations
 * Returns deterministic career recommendations for the authenticated student.
 */
careersRouter.get('/recommendations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = buildRecommendationsForUser(userId);
    return sendSuccess(res, data, 'careers');
  } catch (error) {
    return sendError(res, 'Failed to compute career recommendations', 500, 'RECOMMENDATION_ERROR', error, 'careers');
  }
});

/**
 * GET /api/careers/recommendations/:studentId
 * Allows student to view their own recommendations or admin.
 * Rejects cross-student unauthorized queries with HTTP 403.
 */
careersRouter.get('/recommendations/:studentId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = req.user!;
    const targetStudentId = req.params.studentId;

    if (requester.id !== targetStudentId && requester.role !== 'admin') {
      return sendError(
        res,
        'Unauthorized. You can only view your own career recommendations.',
        403,
        'FORBIDDEN_CROSS_STUDENT',
        null,
        'careers'
      );
    }

    const data = buildRecommendationsForUser(targetStudentId);
    return sendSuccess(res, data, 'careers');
  } catch (error) {
    return sendError(res, 'Failed to compute career recommendations for student', 500, 'RECOMMENDATION_ERROR', error, 'careers');
  }
});

/**
 * GET /api/careers/selected
 * Returns the authenticated student's selected career record and details.
 */
careersRouter.get('/selected', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const selected = db.getSelectedCareer(userId);

    if (!selected) {
      return sendSuccess(res, { selectedCareer: null, career: null }, 'careers');
    }

    const career = db.getCareer(selected.careerId);
    return sendSuccess(res, { selectedCareer: selected, career: career || null }, 'careers');
  } catch (error) {
    return sendError(res, 'Failed to retrieve selected career', 500, 'SELECTED_CAREER_ERROR', error, 'careers');
  }
});

/**
 * POST /api/careers/select
 * Persists the student's selected career target without deleting assessment or skill data.
 */
careersRouter.post('/select', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { careerId } = req.body || {};

    if (!careerId || typeof careerId !== 'string' || careerId.trim().length === 0) {
      return sendError(res, 'careerId is required and must be a valid string', 400, 'MISSING_FIELD', null, 'careers');
    }

    const cleanCareerId = careerId.trim();
    const career = db.getCareer(cleanCareerId);
    if (!career) {
      return sendError(res, `Career role not found: ${cleanCareerId}`, 404, 'CAREER_NOT_FOUND', null, 'careers');
    }

    // Persist selected career
    const selectedRecord = db.setSelectedCareer(userId, cleanCareerId);

    return sendSuccess(
      res,
      {
        selectedCareer: selectedRecord,
        selectedCareerId: cleanCareerId,
        career,
      },
      'careers'
    );
  } catch (error) {
    return sendError(res, 'Failed to select career', 500, 'CAREER_SELECT_ERROR', error, 'careers');
  }
});

/**
 * GET /api/careers/:careerId
 * Returns the details and required skills for a specific career role.
 */
careersRouter.get('/:careerId', (req, res: Response) => {
  const { careerId } = req.params;
  const career = db.getCareer(careerId);

  if (!career) {
    return sendError(res, `Career role not found: ${careerId}`, 404, 'CAREER_NOT_FOUND', null, 'careers');
  }

  return sendSuccess(res, career, 'careers');
});

/**
 * GET /api/careers/:careerId/match
 * Calculates deterministic match for a specific career for the authenticated student.
 */
careersRouter.get('/:careerId/match', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { careerId } = req.params;

    const career = db.getCareer(careerId);
    if (!career) {
      return sendError(res, `Career role not found: ${careerId}`, 404, 'CAREER_NOT_FOUND', null, 'careers');
    }

    const profile = SkillAnalysisEngine.getStudentSkillProfile(userId);
    const attempts = db.getUserAttempts(userId).filter(a => a.status === 'completed');
    const hasCompletedAssessment = attempts.length > 0 || (profile.skills && profile.skills.length > 0);

    const match = CareerMatchingEngine.calculateMatch(career, profile.skills);

    return sendSuccess(
      res,
      {
        career,
        match,
        hasCompletedAssessment,
      },
      'careers'
    );
  } catch (error) {
    return sendError(res, 'Failed to calculate career match', 500, 'CAREER_MATCH_ERROR', error, 'careers');
  }
});
