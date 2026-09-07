import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';

export const progressRouter = Router();

// GET /api/progress - Status across milestones & readiness for reassessment
progressRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const roadmap = db.getUserRoadmap(userId);
  const assessments = db.getUserAssessments(userId);
  const skills = db.getUserSkills(userId);

  const milestones = roadmap?.milestones || [];
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return sendSuccess(res, {
    completionPercentage,
    completedMilestones: completedCount,
    totalMilestones: totalCount,
    readyForReassessment: completedCount >= 1, // Ready to verify skill gains via hybrid reassessment
    reassessmentCount: assessments.filter(a => a.isReassessment).length,
    activeSkills: skills,
  }, 'progress');
});

// POST /api/progress/complete-milestone
progressRouter.post('/complete-milestone', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  const { milestoneId } = req.body;

  const roadmap = db.getUserRoadmap(userId);
  if (!roadmap) {
    return sendError(res, 'Roadmap not found', 404, 'NOT_FOUND', null, 'progress');
  }

  const targetIndex = roadmap.milestones.findIndex(m => m.id === milestoneId);
  if (targetIndex === -1) {
    return sendError(res, 'Milestone not found', 404, 'NOT_FOUND', null, 'progress');
  }

  // Complete target milestone
  roadmap.milestones[targetIndex].status = 'completed';

  // Unlock next milestone if present
  if (targetIndex + 1 < roadmap.milestones.length) {
    roadmap.milestones[targetIndex + 1].status = 'in_progress';
  }

  db.saveRoadmap(roadmap);

  return sendSuccess(res, {
    completedMilestoneId: milestoneId,
    roadmap,
    suggestReassessment: true,
  }, 'progress');
});
