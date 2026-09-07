import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.js';
import { PersonalizedRoadmap, RoadmapMilestone } from '../../common/types.js';
import { AIServiceBridge } from '../../ai-bridge/aiService.js';

export const roadmapRouter = Router();

// GET /api/roadmap - Retrieve or assemble roadmap based on gaps
roadmapRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr_student_demo_01';
  let roadmap = db.getUserRoadmap(userId);

  if (!roadmap) {
    const careerId = db.getUserCareerGoal(userId) || 'car_fullstack';
    const career = db.getCareer(careerId) || db.getAllCareers()[0];
    const gaps = db.getUserGaps(userId);

    // Build structured milestones sequenced by gap priority
    const milestones: RoadmapMilestone[] = gaps.map((gap, idx) => ({
      id: `mls_${gap.skillId}_${idx + 1}`,
      sequenceOrder: idx + 1,
      title: `Master ${gap.skillName}`,
      targetSkillId: gap.skillId,
      targetSkillName: gap.skillName,
      description: `Targeted bridge program to advance proficiency from ${gap.currentScore}% to ${gap.requiredScore}%.`,
      estimatedHours: Math.max(12, Math.round(gap.gap * 1.5)),
      status: idx === 0 ? 'in_progress' : 'locked',
      resources: [
        {
          id: `res_${gap.skillId}_1`,
          title: `Comprehensive Guide to ${gap.skillName}`,
          type: 'course',
          url: 'https://developer.mozilla.org',
          durationMinutes: 90,
        },
        {
          id: `res_${gap.skillId}_2`,
          title: `${gap.skillName} Hands-on Architecture Project`,
          type: 'project',
          url: 'https://github.com',
          durationMinutes: 180,
        },
      ],
      aiCoachingNote: `Focus on architectural trade-offs and code quality in ${gap.skillName}.`,
    }));

    roadmap = {
      id: `rdm_${userId}_${Date.now()}`,
      userId,
      targetCareerId: career.id,
      targetCareerTitle: career.title,
      totalEstimatedWeeks: Math.max(6, Math.ceil(gaps.reduce((acc, g) => acc + g.estimatedWeeksToBridge, 0))),
      milestones,
      generatedAt: new Date().toISOString(),
    };

    db.saveRoadmap(roadmap);
  }

  return sendSuccess(res, roadmap, 'roadmap');
});

// POST /api/roadmap/refine - AI refinement (Rule 5)
roadmapRouter.post('/refine', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'usr_student_demo_01';
    const roadmap = db.getUserRoadmap(userId);

    if (!roadmap) {
      return sendError(res, 'No existing roadmap found to refine', 404, 'NOT_FOUND', null, 'roadmap');
    }

    // Call server-side AI to enrich coaching notes
    const refinedMilestones = await AIServiceBridge.refineRoadmapCoaching(
      roadmap.targetCareerTitle,
      roadmap.milestones
    );

    roadmap.milestones = refinedMilestones;
    roadmap.lastRefinedAt = new Date().toISOString();
    db.saveRoadmap(roadmap);

    return sendSuccess(res, roadmap, 'roadmap');
  } catch (error) {
    return sendError(res, 'Roadmap refinement failed', 500, 'REFINEMENT_FAILED', error, 'roadmap');
  }
});
