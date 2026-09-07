import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';

export const skillsRouter = Router();

// GET /api/skills - Complete taxonomy
skillsRouter.get('/', (_req, res: Response) => {
  const skills = db.getAllSkills();
  return sendSuccess(res, skills, 'skills');
});

// GET /api/skills/my-profile - Current student skill ratings
skillsRouter.get('/my-profile', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const userSkills = db.getUserSkills(userId);
  return sendSuccess(res, userSkills, 'skills');
});
