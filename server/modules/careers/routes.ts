import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';
import { CareerMatchingEngine } from './matchingEngine.js';

export const careersRouter = Router();

// GET /api/careers - Catalog
careersRouter.get('/', (_req, res: Response) => {
  const careers = db.getAllCareers();
  return sendSuccess(res, careers, 'careers');
});

// GET /api/careers/recommendations - Weighted skill-matching algorithm (Rule 3)
careersRouter.get('/recommendations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const careers = db.getAllCareers();
  const userSkills = db.getUserSkills(userId);

  // Deterministic weighted matching algorithm
  const recommendations = CareerMatchingEngine.rankCareers(careers, userSkills);

  const selectedCareerId = db.getUserCareerGoal(userId) || 'car_fullstack';

  return sendSuccess(res, {
    recommendations,
    selectedCareerId,
  }, 'careers');
});

// POST /api/careers/select - Set career target
careersRouter.post('/select', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const { careerId } = req.body;

  if (!careerId) {
    return sendError(res, 'careerId is required', 400, 'MISSING_FIELD', null, 'careers');
  }

  const career = db.getCareer(careerId);
  if (!career) {
    return sendError(res, 'Career not found', 404, 'CAREER_NOT_FOUND', null, 'careers');
  }

  db.setUserCareerGoal(userId, careerId);

  return sendSuccess(res, {
    selectedCareerId: careerId,
    career,
  }, 'careers');
});
