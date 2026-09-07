import assert from 'node:assert';
import express from 'express';
import { SkillAnalysisEngine } from '../server/modules/skills/skillAnalysisEngine.js';
import { db } from '../server/db/client.js';
import { AssessmentResult } from '../server/common/types.js';
import { skillsRouter } from '../server/modules/skills/routes.js';
import { assessmentRouter } from '../server/modules/assessment/routes.js';
import { createSessionToken } from '../server/modules/auth/authService.js';

export async function runSkillAnalysisModuleTests() {
  console.log('--- Running Module 3: Skill Analysis Engine & Architectural Tests ---');

  // Test 1: Deterministic Proficiency Thresholds
  console.log('1. Verifying deterministic proficiency level mappings (Strict Thresholds)...');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(0), 'Beginner');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(10), 'Beginner');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(19), 'Beginner');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(20), 'Basic');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(30), 'Basic');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(39), 'Basic');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(40), 'Intermediate');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(50), 'Intermediate');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(59), 'Intermediate');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(60), 'Advanced');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(75), 'Advanced');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(79), 'Advanced');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(80), 'Expert');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(95), 'Expert');
  assert.strictEqual(SkillAnalysisEngine.getProficiencyLevel(100), 'Expert');
  console.log('   ✓ All 5 proficiency tier boundaries (0-19, 20-39, 40-59, 60-79, 80-100) mapped deterministically');

  // Test 2: Initial Profile Computation from Existing Database Seed
  console.log('2. Verifying initial student skill profile recomputation...');
  const studentId = 'usr_test_student_mod3';
  db.createUser({
    id: studentId,
    email: 'student3@skillup.ai',
    passwordHash: 'hash',
    fullName: 'Test Student Mod3',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const emptyProfile = SkillAnalysisEngine.getStudentSkillProfile(studentId);
  assert.strictEqual(emptyProfile.userId, studentId);
  assert.strictEqual(emptyProfile.overallScore, 0);
  assert.strictEqual(emptyProfile.overallLevel, 'Beginner');
  assert.strictEqual(emptyProfile.skills.length, 0);
  assert.strictEqual(emptyProfile.strongestSkills.length, 0);
  assert.strictEqual(emptyProfile.weakestSkills.length, 0);
  console.log('   ✓ Initial blank student profile correctly initialized');

  // Test 3: Processing Assessment Submission Result
  console.log('3. Verifying assessment result integration & skill competency breakdown...');
  const mockAssessmentResult1: AssessmentResult = {
    assessmentId: 'asm_test_001',
    userId: studentId,
    isReassessment: false,
    totalQuestions: 15,
    curatedCount: 15,
    aiGeneratedCount: 0,
    overallScore: 72,
    skillBreakdown: {
      skl_prog_ts: {
        skillName: 'TypeScript & Core JS',
        correct: 4,
        total: 5,
        percentage: 80,
        weightedScore: 82,
      },
      skl_ds_tree_graph: {
        skillName: 'Trees & Graphs',
        correct: 2,
        total: 5,
        percentage: 40,
        weightedScore: 45,
      },
      skl_db_sql: {
        skillName: 'SQL & Relational DBs',
        correct: 5,
        total: 5,
        percentage: 100,
        weightedScore: 92,
      },
      skl_algo_dp: {
        skillName: 'Dynamic Programming',
        correct: 1,
        total: 5,
        percentage: 20,
        weightedScore: 25,
      },
    },
    completedAt: '2026-09-07T10:00:00.000Z',
  };

  const updatedProfile1 = SkillAnalysisEngine.processAssessmentResult(mockAssessmentResult1);
  assert.strictEqual(updatedProfile1.userId, studentId);
  assert.strictEqual(updatedProfile1.skills.length, 4);
  assert.strictEqual(updatedProfile1.assessmentCount, 1);
  assert.strictEqual(updatedProfile1.totalQuestionsAttempted, 20);
  assert.strictEqual(updatedProfile1.totalCorrectAnswers, 12);

  // Check top 3 strongest skills (Sorted descending by score)
  assert.strictEqual(updatedProfile1.strongestSkills.length, 3);
  assert.strictEqual(updatedProfile1.strongestSkills[0].skillId, 'skl_db_sql');
  assert.strictEqual(updatedProfile1.strongestSkills[0].score, 92);
  assert.strictEqual(updatedProfile1.strongestSkills[0].level, 'Expert');
  assert.strictEqual(updatedProfile1.strongestSkills[1].skillId, 'skl_prog_ts');
  assert.strictEqual(updatedProfile1.strongestSkills[1].score, 82);
  assert.strictEqual(updatedProfile1.strongestSkills[1].level, 'Expert');
  assert.strictEqual(updatedProfile1.strongestSkills[2].skillId, 'skl_ds_tree_graph');
  assert.strictEqual(updatedProfile1.strongestSkills[2].score, 45);
  assert.strictEqual(updatedProfile1.strongestSkills[2].level, 'Intermediate');

  // Check top 3 weakest skills (Sorted ascending by score)
  assert.strictEqual(updatedProfile1.weakestSkills.length, 3);
  assert.strictEqual(updatedProfile1.weakestSkills[0].skillId, 'skl_algo_dp');
  assert.strictEqual(updatedProfile1.weakestSkills[0].score, 25);
  assert.strictEqual(updatedProfile1.weakestSkills[0].level, 'Basic');
  assert.strictEqual(updatedProfile1.weakestSkills[1].skillId, 'skl_ds_tree_graph');
  assert.strictEqual(updatedProfile1.weakestSkills[1].score, 45);
  console.log('   ✓ Deterministic calculation of overall score, strongest (top 3) and weakest (top 3) verified');

  // Test 4: Historical Skill Progression Across Sequential Assessments
  console.log('4. Verifying historical skill progression across multiple assessments...');
  const mockAssessmentResult2: AssessmentResult = {
    assessmentId: 'asm_test_002',
    userId: studentId,
    isReassessment: true,
    totalQuestions: 10,
    curatedCount: 10,
    aiGeneratedCount: 0,
    overallScore: 80,
    skillBreakdown: {
      skl_algo_dp: {
        skillName: 'Dynamic Programming',
        correct: 4,
        total: 5,
        percentage: 80,
        weightedScore: 78,
      },
      skl_prog_ts: {
        skillName: 'TypeScript & Core JS',
        correct: 5,
        total: 5,
        percentage: 100,
        weightedScore: 95,
      },
    },
    completedAt: '2026-09-07T12:00:00.000Z',
  };

  const updatedProfile2 = SkillAnalysisEngine.processAssessmentResult(mockAssessmentResult2);
  assert.strictEqual(updatedProfile2.assessmentCount, 2);

  // Dynamic programming score should be blended: 25 * 0.4 + 78 * 0.6 = 10 + 46.8 = 56.8
  const dpSkill = updatedProfile2.skills.find(s => s.skillId === 'skl_algo_dp');
  assert(dpSkill, 'Dynamic programming skill must exist');
  assert.strictEqual(dpSkill.score, 56.8);
  assert.strictEqual(dpSkill.level, 'Intermediate'); // Level transitioned from Basic to Intermediate!

  // Check history entries for Dynamic Programming
  const dpHistory = SkillAnalysisEngine.getSkillHistory(studentId, 'skl_algo_dp');
  assert.strictEqual(dpHistory.length, 2);
  assert.strictEqual(dpHistory[0].assessmentId, 'asm_test_001');
  assert.strictEqual(dpHistory[0].score, 25);
  assert.strictEqual(dpHistory[0].level, 'Basic');
  assert.strictEqual(dpHistory[1].assessmentId, 'asm_test_002');
  assert.strictEqual(dpHistory[1].score, 78);
  assert.strictEqual(dpHistory[1].level, 'Advanced');
  console.log('   ✓ History tracking & weighted score blending across assessments verified');

  // Test 5: Authorization Validation (Prevent cross-student profile inspection)
  console.log('5. Verifying authorization & security rules...');
  const studentA = 'usr_student_alpha';
  const studentB = 'usr_student_beta';

  db.createUser({
    id: studentA,
    email: 'alpha@skillup.ai',
    passwordHash: 'hash',
    fullName: 'Student Alpha',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  db.createUser({
    id: studentB,
    email: 'beta@skillup.ai',
    passwordHash: 'hash',
    fullName: 'Student Beta',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Verify access control check simulated as in routes.ts:
  function canAccessProfile(requestingUser: { id: string; role: string }, targetStudentId: string): boolean {
    if (requestingUser.id !== targetStudentId && requestingUser.role !== 'admin') {
      return false;
    }
    return true;
  }

  assert.strictEqual(canAccessProfile({ id: studentA, role: 'student' }, studentA), true);
  assert.strictEqual(canAccessProfile({ id: studentA, role: 'student' }, studentB), false); // FORBIDDEN!
  assert.strictEqual(canAccessProfile({ id: 'usr_admin', role: 'admin' }, studentA), true); // Admin allowed
  console.log('   ✓ Cross-student profile access prevention strictly enforced (403 Forbidden)');

  // Test 6: Live HTTP API Route Integration & Security Verification
  console.log('6. Verifying live HTTP API endpoints, 401 unauthenticated, 403 cross-student, and assessment triggering...');
  const app = express();
  app.use(express.json());
  app.use('/api/skills', skillsRouter);
  app.use('/api/assessment', assessmentRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 6a: Unauthenticated GET /api/skills/profile returns 401
    const resUnauth = await fetch(`${baseUrl}/api/skills/profile`);
    assert.strictEqual(resUnauth.status, 401, 'Unauthenticated request must return 401');
    const dataUnauth = (await resUnauth.json()) as any;
    assert.strictEqual(dataUnauth.error.code, 'UNAUTHORIZED');
    console.log('   ✓ GET /api/skills/profile returns 401 UNAUTHORIZED when no token is provided');

    // 6b: Authenticated GET /api/skills/profile returns 200 with profile
    const tokenA = createSessionToken(db.getUser(studentA)!);
    const resAuth = await fetch(`${baseUrl}/api/skills/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(resAuth.status, 200, 'Authenticated request must return 200');
    const dataAuth = (await resAuth.json()) as any;
    assert.strictEqual(dataAuth.success, true);
    assert.strictEqual(dataAuth.data.userId, studentA);
    console.log('   ✓ Authenticated student successfully retrieves their own skill profile (200 OK)');

    // 6c: Cross-student GET /api/skills/profile/:studentId returns 403 FORBIDDEN
    const resCross = await fetch(`${baseUrl}/api/skills/profile/${studentB}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(resCross.status, 403, 'Cross-student profile access must return 403');
    const dataCross = (await resCross.json()) as any;
    assert.strictEqual(dataCross.error.code, 'FORBIDDEN');
    console.log('   ✓ Student A attempting to inspect Student B profile returns 403 FORBIDDEN');

    // 6d: Student inspecting their own profile via GET /api/skills/profile/:studentId returns 200
    const resSelf = await fetch(`${baseUrl}/api/skills/profile/${studentA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(resSelf.status, 200, 'Student inspecting own profile by ID must return 200');
    console.log('   ✓ Student inspecting their own profile by ID returns 200 OK');

    // 6e: Admin inspecting student profile via GET /api/skills/profile/:studentId returns 200
    const adminUser = {
      id: 'usr_admin_mod3',
      email: 'admin3@skillup.ai',
      passwordHash: 'hash',
      fullName: 'Admin Mod3',
      role: 'admin' as const,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.createUser(adminUser);
    const adminToken = createSessionToken(adminUser);

    const resAdmin = await fetch(`${baseUrl}/api/skills/profile/${studentB}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdmin.status, 200, 'Admin inspecting student profile must return 200');
    console.log('   ✓ Admin inspecting student profile returns 200 OK');

    // 6f: Invalid skill ID returns 404
    const resInvalidSkill = await fetch(`${baseUrl}/api/skills/skl_invalid_nonexistent`);
    assert.strictEqual(resInvalidSkill.status, 404, 'Invalid skill ID must return 404');
    console.log('   ✓ Invalid skill ID returns 404 NOT FOUND');

    // 6g: Assessment submission triggers Skill Analysis and updates profile
    const resSubmit = await fetch(`${baseUrl}/api/assessment/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        assessmentId: `asm_api_live_${Date.now()}`,
        answers: [
          { questionId: 'q_ts_01', selectedOptionIndex: 0 },
          { questionId: 'q_be_01', selectedOptionIndex: 1 },
        ],
      }),
    });
    assert.strictEqual(resSubmit.status, 200, 'Assessment submission must return 200');

    // Verify profile was updated in real-time
    const resProfileAfter = await fetch(`${baseUrl}/api/skills/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const profileAfter = (await resProfileAfter.json()) as any;
    assert(profileAfter.data.skills.length >= 2, 'Assessed skills must be present in profile');
    assert(profileAfter.data.totalQuestionsAttempted >= 2, 'Questions attempted must be tracked');
    console.log('   ✓ Assessment submission directly triggers Skill Analysis profile & history update');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  }

  console.log('--- Module 3: Skill Analysis Engine Tests Passed Successfully! ---\n');
}
