/**
 * SkillUp AI - Module 3: Deterministic Skill Analysis Engine
 * 
 * ARCHITECTURAL RULE 1: Algorithms decide WHAT. AI decides HOW.
 * ARCHITECTURAL RULE 2: Do not use AI for calculating skill scores, percentages,
 *                       proficiency levels, or aggregating assessment results.
 * 
 * This engine converts assessment performance into persistent skill-level profiles,
 * competency breakdowns, deterministic proficiency classifications, and historical tracking.
 */

import { AssessmentResult, Skill } from '../../common/types.js';
import { db } from '../../db/client.js';
import {
  ProficiencyLevel,
  ProficiencyThreshold,
  SkillHistoryEntry,
  StudentSkillScore,
  StudentSkillProfile,
} from './types.js';

/**
 * Centralized proficiency thresholds (0-19 Beginner, 20-39 Basic, 40-59 Intermediate, 60-79 Advanced, 80-100 Expert)
 * Easily customizable and audited.
 */
export const PROFICIENCY_THRESHOLDS: ProficiencyThreshold[] = [
  { level: 'Beginner', minScore: 0, maxScore: 19 },
  { level: 'Basic', minScore: 20, maxScore: 39 },
  { level: 'Intermediate', minScore: 40, maxScore: 59 },
  { level: 'Advanced', minScore: 60, maxScore: 79 },
  { level: 'Expert', minScore: 80, maxScore: 100 },
];

export class SkillAnalysisEngine {
  /**
   * Evaluates a numeric score against the centralized proficiency thresholds.
   * Deterministic mapping:
   *  0–19   -> Beginner
   *  20–39  -> Basic
   *  40–59  -> Intermediate
   *  60–79  -> Advanced
   *  80–100 -> Expert
   */
  public static getProficiencyLevel(score: number): ProficiencyLevel {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    for (const threshold of PROFICIENCY_THRESHOLDS) {
      if (clamped >= threshold.minScore && clamped <= threshold.maxScore) {
        return threshold.level;
      }
    }
    return score >= 80 ? 'Expert' : 'Beginner';
  }

  /**
   * Deterministically processes an assessment submission result.
   * Updates per-skill performance, records historical timeline entries,
   * recomputes overall score, and derives top 3 strongest and weakest skills.
   */
  public static processAssessmentResult(result: AssessmentResult): StudentSkillProfile {
    const userId = result.userId;
    const completedAt = result.completedAt || new Date().toISOString();

    // 1. Process each assessed skill breakdown
    for (const [skillId, stats] of Object.entries(result.skillBreakdown)) {
      const assessmentScore = Math.round(stats.weightedScore * 10) / 10;
      const proficiency = this.getProficiencyLevel(assessmentScore);

      const historyEntry: SkillHistoryEntry = {
        assessmentId: result.assessmentId,
        score: assessmentScore,
        level: proficiency,
        questionsAttempted: stats.total,
        correctAnswers: stats.correct,
        assessedAt: completedAt,
      };

      // Persist to historical skill timeline
      db.addStudentSkillHistory(userId, skillId, historyEntry);

      // Blend new performance with previous baseline if reassessment, or set new baseline
      const currentSkills = db.getUserSkills(userId);
      const existing = currentSkills.find(s => s.skillId === skillId);
      const blendedScore = existing && result.isReassessment
        ? Math.round((existing.score * 0.4 + stats.weightedScore * 0.6) * 10) / 10
        : assessmentScore;

      // Keep user_skills table in sync for Module 1, Module 2, and Career Matching
      db.updateUserSkill(userId, skillId, blendedScore);
    }

    // 2. Recompute and persist student's comprehensive skill profile
    const profile = this.recomputeStudentProfile(userId);
    db.saveStudentSkillProfile(profile);

    return profile;
  }

  /**
   * Retrieves the current skill profile for a student.
   * If a persisted profile exists, returns it; otherwise computes from available data.
   */
  public static getStudentSkillProfile(userId: string): StudentSkillProfile {
    const existing = db.getStudentSkillProfile(userId);
    if (existing) {
      return existing;
    }

    // Recompute from historical assessments or initial baseline
    const profile = this.recomputeStudentProfile(userId);
    db.saveStudentSkillProfile(profile);
    return profile;
  }

  /**
   * Retrieves the historical assessment performance timeline for a specific skill and student.
   */
  public static getSkillHistory(userId: string, skillId: string): SkillHistoryEntry[] {
    return db.getStudentSkillHistory(userId, skillId);
  }

  /**
   * Deterministically calculates the full student skill profile from historical data.
   */
  public static recomputeStudentProfile(userId: string): StudentSkillProfile {
    const allSkills = db.getAllSkills();
    const skillMap = new Map<string, Skill>(allSkills.map(s => [s.id, s]));

    const userAssessments = db.getUserAssessments(userId);
    const assessedSkillIds = new Set<string>();

    // 1. Collect from student's historical timeline map
    const userHistoryMap = db.getStudentAllSkillHistories(userId);
    for (const skillId of userHistoryMap.keys()) {
      assessedSkillIds.add(skillId);
    }

    // 2. Collect from user skills table
    for (const userSkill of db.getUserSkills(userId)) {
      assessedSkillIds.add(userSkill.skillId);
    }

    // 3. Also check assessments breakdown in case history wasn't pre-populated
    for (const asm of userAssessments) {
      if (asm.skillBreakdown) {
        for (const skillId of Object.keys(asm.skillBreakdown)) {
          assessedSkillIds.add(skillId);
        }
      }
    }

    const studentSkillScores: StudentSkillScore[] = [];
    let totalQuestionsAttempted = 0;
    let totalCorrectAnswers = 0;
    let latestAssessmentDate: string | undefined = undefined;

    for (const skillId of assessedSkillIds) {
      const skill = skillMap.get(skillId);
      const skillName = skill ? skill.name : skillId;
      const category = skill ? skill.category : 'core_cs';

      const history = db.getStudentSkillHistory(userId, skillId);

      if (history.length > 0) {
        // Sort history by assessedAt date ascending
        const sortedHistory = [...history].sort(
          (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
        );

        const latest = sortedHistory[sortedHistory.length - 1];
        const skillAttempted = sortedHistory.reduce((acc, curr) => acc + curr.questionsAttempted, 0);
        const skillCorrect = sortedHistory.reduce((acc, curr) => acc + curr.correctAnswers, 0);

        totalQuestionsAttempted += skillAttempted;
        totalCorrectAnswers += skillCorrect;

        if (!latestAssessmentDate || new Date(latest.assessedAt) > new Date(latestAssessmentDate)) {
          latestAssessmentDate = latest.assessedAt;
        }

        const userSkill = db.getUserSkills(userId).find(s => s.skillId === skillId);
        const activeScore = userSkill ? userSkill.score : latest.score;
        const activeLevel = this.getProficiencyLevel(activeScore);

        studentSkillScores.push({
          skillId,
          skillName,
          category,
          score: activeScore,
          level: activeLevel,
          questionsAttempted: skillAttempted,
          correctAnswers: skillCorrect,
          lastAssessedDate: latest.assessedAt,
          history: sortedHistory,
        });
      } else {
        const userSkill = db.getUserSkills(userId).find(s => s.skillId === skillId);
        if (userSkill) {
          const activeLevel = this.getProficiencyLevel(userSkill.score);
          studentSkillScores.push({
            skillId,
            skillName,
            category,
            score: userSkill.score,
            level: activeLevel,
            questionsAttempted: 0,
            correctAnswers: 0,
            lastAssessedDate: userSkill.lastAssessedAt,
            history: [],
          });
        }
      }
    }

    // Fallback: If no assessment history exists yet, check if db has pre-seeded user skills (e.g. demo baseline)
    if (studentSkillScores.length === 0) {
      const seededSkills = db.getUserSkills(userId);
      for (const seeded of seededSkills) {
        const skill = skillMap.get(seeded.skillId);
        const skillName = skill ? skill.name : seeded.skillName;
        const category = skill ? skill.category : 'core_cs';
        const level = this.getProficiencyLevel(seeded.score);

        studentSkillScores.push({
          skillId: seeded.skillId,
          skillName,
          category,
          score: seeded.score,
          level,
          questionsAttempted: 0,
          correctAnswers: 0,
          lastAssessedDate: seeded.lastAssessedAt,
          history: [],
        });
      }
    }

    // Deterministic Overall Score Calculation:
    // Average of the student's assessed skill scores
    let overallScore = 0;
    if (studentSkillScores.length > 0) {
      const sum = studentSkillScores.reduce((acc, curr) => acc + curr.score, 0);
      overallScore = Math.round((sum / studentSkillScores.length) * 10) / 10;
    }
    const overallLevel = this.getProficiencyLevel(overallScore);

    // Deterministic Strongest Skills (Top 3):
    // Highest scores, deterministic tie-breaking by alphabetical skillName
    const strongestSkills = [...studentSkillScores]
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.skillName.localeCompare(b.skillName);
      })
      .slice(0, 3);

    // Deterministic Weakest Skills (Top 3 Skills to Improve):
    // Lowest scores, deterministic tie-breaking by alphabetical skillName
    const weakestSkills = [...studentSkillScores]
      .sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }
        return a.skillName.localeCompare(b.skillName);
      })
      .slice(0, 3);

    // Collect all unique assessment IDs across history entries and assessment records
    const uniqueAssessmentIds = new Set<string>();
    for (const asm of userAssessments) {
      if (asm.assessmentId) uniqueAssessmentIds.add(asm.assessmentId);
    }
    for (const skillScore of studentSkillScores) {
      if (skillScore.history) {
        for (const h of skillScore.history) {
          if (h.assessmentId) uniqueAssessmentIds.add(h.assessmentId);
        }
      }
    }
    const assessmentCount = Math.max(userAssessments.length, uniqueAssessmentIds.size);

    return {
      userId,
      overallScore,
      overallLevel,
      totalQuestionsAttempted,
      totalCorrectAnswers,
      skills: studentSkillScores,
      strongestSkills,
      weakestSkills,
      lastAssessedDate: latestAssessmentDate,
      assessmentCount,
    };
  }
}
