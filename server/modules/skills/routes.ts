import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest, authenticate } from '../../common/middleware/auth.js';
import { SkillAnalysisEngine } from './skillAnalysisEngine.js';

export const skillsRouter = Router();

/**
 * GET /api/skills
 * Returns the catalog of available skills and engineering competencies.
 */
skillsRouter.get('/', (_req, res: Response) => {
  const skills = db.getAllSkills();
  return sendSuccess(res, skills, 'skills');
});

/**
 * GET /api/skills/profile
 * Returns the authenticated student's persistent skill profile.
 * Requires authentication.
 */
skillsRouter.get('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = SkillAnalysisEngine.getStudentSkillProfile(userId);
    return sendSuccess(res, profile, 'skills');
  } catch (error) {
    return sendError(res, 'Failed to retrieve student skill profile', 500, 'PROFILE_RETRIEVAL_FAILED', error, 'skills');
  }
});

/**
 * GET /api/skills/profile/:studentId
 * Returns a student's skill profile with strict authorization checks.
 * Requires authentication. Only the student themselves or an admin may view it.
 */
skillsRouter.get('/profile/:studentId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetStudentId = req.params.studentId;
    const requestingUser = req.user!;

    // Security Rule: A student must not be able to access another student's private profile
    if (requestingUser.id !== targetStudentId && requestingUser.role !== 'admin') {
      return sendError(res, 'You are not authorized to view this student skill profile', 403, 'FORBIDDEN', null, 'skills');
    }

    const targetUser = db.getUser(targetStudentId);
    if (!targetUser) {
      return sendError(res, 'Student not found', 404, 'NOT_FOUND', null, 'skills');
    }

    const profile = SkillAnalysisEngine.getStudentSkillProfile(targetStudentId);
    return sendSuccess(res, profile, 'skills');
  } catch (error) {
    return sendError(res, 'Failed to retrieve student skill profile', 500, 'PROFILE_RETRIEVAL_FAILED', error, 'skills');
  }
});

/**
 * GET /api/skills/my-profile
 * Legacy endpoint returning raw UserSkillScore array for backward compatibility.
 */
skillsRouter.get('/my-profile', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const userSkills = db.getUserSkills(userId);
  return sendSuccess(res, userSkills, 'skills');
});

/**
 * GET /api/skills/:skillId
 * Returns details for a specific skill from the taxonomy.
 */
skillsRouter.get('/:skillId', (req: AuthenticatedRequest, res: Response) => {
  const skillId = req.params.skillId;
  const skill = db.getSkill(skillId);

  if (!skill) {
    return sendError(res, 'Skill not found', 404, 'NOT_FOUND', null, 'skills');
  }

  return sendSuccess(res, skill, 'skills');
});

/**
 * GET /api/skills/:skillId/history
 * Returns the authenticated student's historical assessment scores for that skill.
 * Requires authentication.
 */
skillsRouter.get('/:skillId/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const skillId = req.params.skillId;
    const skill = db.getSkill(skillId);

    if (!skill) {
      return sendError(res, 'Skill not found', 404, 'NOT_FOUND', null, 'skills');
    }

    const userId = req.user!.id;
    const history = SkillAnalysisEngine.getSkillHistory(userId, skillId);
    return sendSuccess(res, history, 'skills');
  } catch (error) {
    return sendError(res, 'Failed to retrieve skill history', 500, 'HISTORY_RETRIEVAL_FAILED', error, 'skills');
  }
});
