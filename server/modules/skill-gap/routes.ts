import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';
import { SkillGapEngine } from './gapEngine.js';
import { AIServiceBridge } from '../../ai-bridge/aiService.js';

export const skillGapRouter = Router();

// GET /api/skill-gap - Deterministic gap calculation + AI coaching summary
// Rule 4: Gap calculation is deterministic
// Rule 5: AI used for explanations & personalization
skillGapRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'usr_student_demo_01';
    const user = db.getUser(userId);
    const targetCareerId = (req.query.careerId as string) || db.getUserCareerGoal(userId) || 'car_fullstack';

    const career = db.getCareer(targetCareerId);
    if (!career) {
      return sendError(res, 'Target career not found', 404, 'CAREER_NOT_FOUND', null, 'skill-gap');
    }

    const userSkills = db.getUserSkills(userId);

    // 1. Pure deterministic gap computation (Rule 1 & 4)
    const analysis = SkillGapEngine.analyze(userId, career, userSkills);

    // 2. AI explanation layer (Rule 5: personalization & feedback without mutating math)
    const studentName = user?.fullName || 'Student';
    const aiExplanation = await AIServiceBridge.generateGapExplanation(studentName, career.title, analysis.gaps);
    analysis.aiExplanation = aiExplanation;

    // Save gaps to database
    db.saveUserGaps(userId, analysis.gaps);

    return sendSuccess(res, analysis, 'skill-gap');
  } catch (error) {
    return sendError(res, 'Failed to compute skill gaps', 500, 'GAP_ANALYSIS_FAILED', error, 'skill-gap');
  }
});
