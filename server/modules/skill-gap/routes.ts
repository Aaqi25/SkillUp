/**
 * SkillUp AI - Module 5: Skill Gap Analysis Routes
 * 
 * Authenticated REST endpoints for deterministic skill gap reports and summaries.
 * Strictly enforces student authorization, career validation, and selected-career integration.
 */

import { Router, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { AuthenticatedRequest, requireAuth } from '../../common/middleware/auth.js';
import { SkillGapEngine } from './gapEngine.js';

export const skillGapRouter = Router();

/**
 * GET /api/skill-gap
 * Returns the skill gap report for the authenticated student's currently selected career.
 * If no career is selected, returns 400 CAREER_NOT_SELECTED.
 * Query param ?careerId=... is also supported as an explicit override.
 */
skillGapRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user!.id;

    // Determine target career: explicit query param or student's selected career from Module 4
    let targetCareerId = (req.query.careerId as string | undefined)?.trim();

    if (!targetCareerId) {
      const selectedCareerRecord = db.getSelectedCareer(studentId);
      targetCareerId = selectedCareerRecord?.careerId || db.getUserCareerGoal(studentId);
    }

    if (!targetCareerId) {
      return sendError(
        res,
        'Career selection required. Please select a target career first to generate your skill gap analysis.',
        400,
        'CAREER_NOT_SELECTED',
        { hasSelectedCareer: false },
        'skill-gap'
      );
    }

    const career = db.getCareer(targetCareerId);
    if (!career) {
      return sendError(
        res,
        `Target career "${targetCareerId}" not found in career catalog.`,
        404,
        'CAREER_NOT_FOUND',
        null,
        'skill-gap'
      );
    }

    // Pure deterministic gap computation (Rule 1 & 4)
    const report = SkillGapEngine.generateReport(studentId, career);

    // Save gaps for persistent tracking
    if (report.orderedSkillGaps && report.orderedSkillGaps.length > 0) {
      db.saveUserGaps(studentId, report.orderedSkillGaps);
    }

    return sendSuccess(res, report, 'skill-gap');
  } catch (error) {
    return sendError(res, 'Failed to compute skill gaps', 500, 'GAP_ANALYSIS_FAILED', error, 'skill-gap');
  }
});

/**
 * GET /api/skill-gap/:careerId/summary
 * Returns a compact summary of skill gaps for the specified career suitable for dashboard usage.
 * Must be registered BEFORE /:careerId to prevent parameter clash.
 */
skillGapRouter.get('/:careerId/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = req.user!;
    const requestedStudentId = (req.query.studentId as string | undefined)?.trim() || requester.id;

    // Enforce student ownership: students can only access their own data
    if (requestedStudentId !== requester.id && requester.role !== 'admin') {
      return sendError(
        res,
        'Forbidden: Students are not authorized to view skill gap reports for other students.',
        403,
        'FORBIDDEN',
        null,
        'skill-gap'
      );
    }

    const careerId = req.params.careerId;
    const career = db.getCareer(careerId);
    if (!career) {
      return sendError(
        res,
        `Career with ID "${careerId}" not found in career catalog.`,
        404,
        'CAREER_NOT_FOUND',
        null,
        'skill-gap'
      );
    }

    const summary = SkillGapEngine.generateSummary(requestedStudentId, career);
    return sendSuccess(res, summary, 'skill-gap');
  } catch (error) {
    return sendError(res, 'Failed to generate skill gap summary', 500, 'GAP_SUMMARY_FAILED', error, 'skill-gap');
  }
});

/**
 * GET /api/skill-gap/:careerId
 * Returns the authenticated student's skill gap report for the specified career.
 */
skillGapRouter.get('/:careerId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = req.user!;
    const requestedStudentId = (req.query.studentId as string | undefined)?.trim() || requester.id;

    // Enforce student ownership
    if (requestedStudentId !== requester.id && requester.role !== 'admin') {
      return sendError(
        res,
        'Forbidden: Students are not authorized to view skill gap reports for other students.',
        403,
        'FORBIDDEN',
        null,
        'skill-gap'
      );
    }

    const careerId = req.params.careerId;
    const career = db.getCareer(careerId);
    if (!career) {
      return sendError(
        res,
        `Career with ID "${careerId}" not found in career catalog.`,
        404,
        'CAREER_NOT_FOUND',
        null,
        'skill-gap'
      );
    }

    const report = SkillGapEngine.generateReport(requestedStudentId, career);

    if (report.orderedSkillGaps && report.orderedSkillGaps.length > 0) {
      db.saveUserGaps(requestedStudentId, report.orderedSkillGaps);
    }

    return sendSuccess(res, report, 'skill-gap');
  } catch (error) {
    return sendError(res, 'Failed to compute skill gaps for career', 500, 'GAP_ANALYSIS_FAILED', error, 'skill-gap');
  }
});
