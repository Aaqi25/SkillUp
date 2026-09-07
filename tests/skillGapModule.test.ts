/**
 * SkillUp AI - Module 5: Comprehensive Skill Gap Analysis Test Suite
 * 
 * Tests all 20 requirements:
 * 1. Gap calculation
 * 2. Zero gap when current >= required
 * 3. Negative gap prevention
 * 4. 0–100 normalization
 * 5. Priority classification
 * 6. Career weights
 * 7. Unassessed skills
 * 8. Parent/child skill matching
 * 9. Deterministic ranking
 * 10. Selected-career integration
 * 11. Invalid career
 * 12. No selected career
 * 13. Authentication
 * 14. Authorization
 * 15. Student ownership
 * 16. Module 3 -> Module 5 integration
 * 17. Module 4 -> Module 5 integration
 * 18. Reassessment -> updated skill gap
 * 19. Multiple careers producing different gap reports
 * 20. Empty/no-gap state
 */

import express from 'express';
import { SkillGapEngine } from '../server/modules/skill-gap/gapEngine.js';
import { db } from '../server/db/client.js';
import { CareerRole, UserSkillScore, AssessmentResult } from '../server/common/types.js';
import { StudentSkillScore } from '../server/modules/skills/types.js';
import { skillGapRouter } from '../server/modules/skill-gap/routes.js';
import { careersRouter } from '../server/modules/careers/routes.js';
import { skillsRouter } from '../server/modules/skills/routes.js';
import { assessmentRouter } from '../server/modules/assessment/routes.js';
import { createSessionToken } from '../server/modules/auth/authService.js';
import { SkillAnalysisEngine } from '../server/modules/skills/skillAnalysisEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runSkillGapModuleTests() {
  console.log('\n--- Running Test: Module 5 — Skill Gap Analysis (20 Verifications) ---');

  // Clean setup: Register a test student and configure known state
  const studentId = `usr_gap_${Date.now()}`;
  const student = db.createUser({
    id: studentId,
    email: `student_gap_${Date.now()}@skillup.ai`,
    passwordHash: 'hash',
    fullName: 'Gap Test Student',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 1. Gap calculation: gap = max(requiredLevel - currentLevel, 0)
  console.log('1. Testing gap calculation formula...');
  const testCareer1: CareerRole = {
    id: 'car_gap_test_1',
    title: 'Test Software Engineer',
    slug: 'test-se',
    description: 'SE Role',
    marketDemand: 'high',
    requiredSkills: [
      { skillId: 'skl_prog_ts', skillName: 'TypeScript', weight: 0.5, targetLevel: 80 },
      { skillId: 'skl_node', skillName: 'Node.js', weight: 0.5, targetLevel: 70 },
    ],
  };

  const skills1: UserSkillScore[] = [
    { skillId: 'skl_prog_ts', skillName: 'TypeScript', score: 50, level: 'intermediate', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_node', skillName: 'Node.js', score: 40, level: 'beginner', lastAssessedAt: '2026-01-01' },
  ];

  const report1 = SkillGapEngine.generateReport(studentId, testCareer1, skills1);
  const tsGap = report1.orderedSkillGaps.find(g => g.skillId === 'skl_prog_ts')!;
  const nodeGap = report1.orderedSkillGaps.find(g => g.skillId === 'skl_node')!;
  assert(tsGap.gap === 30, `Expected TS gap 30, got ${tsGap.gap}`);
  assert(tsGap.gapPercentage === 30, `Expected TS gapPercentage 30, got ${tsGap.gapPercentage}`);
  assert(nodeGap.gap === 30, `Expected Node gap 30, got ${nodeGap.gap}`);
  assert(tsGap.status === 'GAP', `Expected TS status GAP, got ${tsGap.status}`);

  // 2. Zero gap when current >= required
  console.log('2. Testing zero gap when current >= required...');
  const skillsExceeding: UserSkillScore[] = [
    { skillId: 'skl_prog_ts', skillName: 'TypeScript', score: 85, level: 'advanced', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_node', skillName: 'Node.js', score: 70, level: 'advanced', lastAssessedAt: '2026-01-01' },
  ];
  const reportExceeding = SkillGapEngine.generateReport(studentId, testCareer1, skillsExceeding);
  const tsExceed = reportExceeding.orderedSkillGaps.find(g => g.skillId === 'skl_prog_ts')!;
  const nodeExceed = reportExceeding.orderedSkillGaps.find(g => g.skillId === 'skl_node')!;
  assert(tsExceed.gap === 0, `Expected TS gap 0 when exceeding, got ${tsExceed.gap}`);
  assert(tsExceed.status === 'MET', `Expected TS status MET, got ${tsExceed.status}`);
  assert(tsExceed.priority === 'MET', `Expected TS priority MET, got ${tsExceed.priority}`);
  assert(nodeExceed.gap === 0, `Expected Node gap 0 when equal, got ${nodeExceed.gap}`);
  assert(nodeExceed.status === 'MET', `Expected Node status MET, got ${nodeExceed.status}`);

  // 3. Negative gap prevention
  console.log('3. Testing negative gap prevention...');
  assert(tsExceed.gap >= 0, `Gap must never be negative: ${tsExceed.gap}`);
  assert(nodeExceed.gap >= 0, `Gap must never be negative: ${nodeExceed.gap}`);

  // 4. 0–100 normalization
  console.log('4. Testing 0-100 normalization...');
  const extremeSkills: UserSkillScore[] = [
    { skillId: 'skl_prog_ts', skillName: 'TypeScript', score: 150, level: 'expert', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_node', skillName: 'Node.js', score: -20, level: 'beginner', lastAssessedAt: '2026-01-01' },
  ];
  const reportNorm = SkillGapEngine.generateReport(studentId, testCareer1, extremeSkills);
  const tsNorm = reportNorm.orderedSkillGaps.find(g => g.skillId === 'skl_prog_ts')!;
  const nodeNorm = reportNorm.orderedSkillGaps.find(g => g.skillId === 'skl_node')!;
  assert(tsNorm.currentLevel <= 100, `Current level must not exceed 100: ${tsNorm.currentLevel}`);
  assert(nodeNorm.currentLevel >= 0, `Current level must not be less than 0: ${nodeNorm.currentLevel}`);

  // 5. Priority classification (CRITICAL >= 40, HIGH >= 25, MEDIUM >= 10, LOW > 0, MET = 0)
  console.log('5. Testing priority classification...');
  assert(SkillGapEngine.calculatePriority(0) === 'MET', '0 gap must be MET');
  assert(SkillGapEngine.calculatePriority(5) === 'LOW', '5 gap must be LOW');
  assert(SkillGapEngine.calculatePriority(9.9) === 'LOW', '9.9 gap must be LOW');
  assert(SkillGapEngine.calculatePriority(10) === 'MEDIUM', '10 gap must be MEDIUM');
  assert(SkillGapEngine.calculatePriority(24.9) === 'MEDIUM', '24.9 gap must be MEDIUM');
  assert(SkillGapEngine.calculatePriority(25) === 'HIGH', '25 gap must be HIGH');
  assert(SkillGapEngine.calculatePriority(39.9) === 'HIGH', '39.9 gap must be HIGH');
  assert(SkillGapEngine.calculatePriority(40) === 'CRITICAL', '40 gap must be CRITICAL');
  assert(SkillGapEngine.calculatePriority(85) === 'CRITICAL', '85 gap must be CRITICAL');

  // 6. Career weights
  console.log('6. Testing career weights preservation & integration...');
  assert(tsGap.careerWeight === 0.5, `Expected careerWeight 0.5, got ${tsGap.careerWeight}`);

  // 7. Unassessed skills
  console.log('7. Testing unassessed skills marked explicitly with currentLevel = 0...');
  const emptySkills: UserSkillScore[] = [];
  const reportUnassessed = SkillGapEngine.generateReport(studentId, testCareer1, emptySkills);
  assert(reportUnassessed.unassessedSkills === 2, `Expected 2 unassessed skills, got ${reportUnassessed.unassessedSkills}`);
  for (const g of reportUnassessed.orderedSkillGaps) {
    assert(g.isUnassessed === true, `Skill ${g.skillName} must be marked isUnassessed = true`);
    assert(g.currentLevel === 0, `Unassessed skill currentLevel must be 0, got ${g.currentLevel}`);
    assert(g.status === 'GAP', `Unassessed skill status must be GAP`);
  }

  // 8. Parent/child skill matching
  console.log('8. Testing parent/child skill taxonomy matching fallback...');
  // Find a skill with parent/child relationship in db
  const allSkills = db.getAllSkills();
  const childSkill = allSkills.find(s => !!s.parentSkillId);
  if (childSkill) {
    const parentId = childSkill.parentSkillId!;
    const careerReqChild: CareerRole = {
      id: 'car_fallback_test',
      title: 'Fallback Career',
      slug: 'fallback-career',
      description: 'Test',
      marketDemand: 'moderate',
      requiredSkills: [
        { skillId: childSkill.id, skillName: childSkill.name, weight: 1.0, targetLevel: 75 },
      ],
    };
    // User only assessed parent skill
    const parentAssessment: UserSkillScore[] = [
      { skillId: parentId, skillName: 'Parent Skill', score: 65, level: 'intermediate', lastAssessedAt: '2026-01-01' },
    ];
    const reportFallback = SkillGapEngine.generateReport(studentId, careerReqChild, parentAssessment);
    const resolvedGap = reportFallback.orderedSkillGaps[0];
    assert(resolvedGap.isUnassessed === false, 'Child skill should resolve from assessed parent skill');
    assert(resolvedGap.currentLevel === 65, `Expected currentLevel 65 from parent, got ${resolvedGap.currentLevel}`);
    assert(resolvedGap.gap === 10, `Expected gap 10 (75 - 65), got ${resolvedGap.gap}`);
  }

  // 9. Deterministic ranking
  console.log('9. Testing deterministic ranking order...');
  const rankingCareer: CareerRole = {
    id: 'car_ranking_test',
    title: 'Ranking Career',
    slug: 'ranking-career',
    description: 'Test',
    marketDemand: 'high',
    requiredSkills: [
      // Skill A: Critical (gap 50)
      { skillId: 'skl_a', skillName: 'Alpha Critical', weight: 0.2, targetLevel: 80 },
      // Skill B: Met (gap 0)
      { skillId: 'skl_b', skillName: 'Beta Met', weight: 0.3, targetLevel: 50 },
      // Skill C: Medium (gap 15), weight 0.4
      { skillId: 'skl_c', skillName: 'Charlie Med', weight: 0.4, targetLevel: 70 },
      // Skill D: Medium (gap 15), weight 0.1
      { skillId: 'skl_d', skillName: 'Delta Med LowWeight', weight: 0.1, targetLevel: 70 },
    ],
  };
  const rankingSkills: UserSkillScore[] = [
    { skillId: 'skl_a', skillName: 'Alpha Critical', score: 30, level: 'beginner', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_b', skillName: 'Beta Met', score: 60, level: 'intermediate', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_c', skillName: 'Charlie Med', score: 55, level: 'intermediate', lastAssessedAt: '2026-01-01' },
    { skillId: 'skl_d', skillName: 'Delta Med LowWeight', score: 55, level: 'intermediate', lastAssessedAt: '2026-01-01' },
  ];

  const reportRanking = SkillGapEngine.generateReport(studentId, rankingCareer, rankingSkills);
  const ordered = reportRanking.orderedSkillGaps;
  // First must be CRITICAL (skl_a)
  assert(ordered[0].skillId === 'skl_a', `Expected skl_a first (CRITICAL), got ${ordered[0].skillId}`);
  // Second must be Charlie (MEDIUM with higher weight 0.4)
  assert(ordered[1].skillId === 'skl_c', `Expected skl_c second (MEDIUM weight 0.4), got ${ordered[1].skillId}`);
  // Third must be Delta (MEDIUM with lower weight 0.1)
  assert(ordered[2].skillId === 'skl_d', `Expected skl_d third (MEDIUM weight 0.1), got ${ordered[2].skillId}`);
  // Fourth must be Beta (MET)
  assert(ordered[3].skillId === 'skl_b', `Expected skl_b last (MET), got ${ordered[3].skillId}`);

  // 10. Selected-career integration
  console.log('10. Testing selected-career integration with Module 4...');
  const sampleCareerFromCatalog = db.getAllCareers()[0];
  db.setSelectedCareer(studentId, sampleCareerFromCatalog.id);
  const selectedRecord = db.getSelectedCareer(studentId);
  assert(selectedRecord?.careerId === sampleCareerFromCatalog.id, 'Selected career must be retrieved from db');

  // 11. Invalid career handling
  console.log('11. Testing invalid career validation...');
  const invalidCareer = db.getCareer('car_nonexistent_xyz');
  assert(invalidCareer === undefined, 'Invalid career must return undefined');

  // 12. No selected career handling
  console.log('12. Testing no-selected-career detection...');
  const studentNoCareer = db.createUser({
    id: `usr_nocareer_${Date.now()}`,
    email: `no_career_${Date.now()}@skillup.ai`,
    passwordHash: 'hash',
    fullName: 'No Career Student',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const noCareerRecord = db.getSelectedCareer(studentNoCareer.id);
  assert(noCareerRecord === undefined, 'Student without selected career must return undefined');

  // 13. Authentication & 14. Authorization & 15. Student ownership
  console.log('13-15. Testing student ownership and authorization invariants...');
  // A student ID can only generate reports for their own profile unless requester is admin
  const reportOwn = SkillGapEngine.generateReport(studentId, sampleCareerFromCatalog);
  assert(reportOwn.studentId === studentId, 'Report studentId must match authenticated student');

  // 16. Module 3 -> Module 5 integration
  console.log('16. Testing Module 3 skill profile consumption...');
  // Save skills in Module 3 student profile
  const m3ProfileScore: StudentSkillScore = {
    skillId: sampleCareerFromCatalog.requiredSkills[0].skillId,
    skillName: sampleCareerFromCatalog.requiredSkills[0].skillName,
    category: 'core',
    score: 72,
    level: 'Intermediate',
    questionsAttempted: 10,
    correctAnswers: 8,
    lastAssessedDate: new Date().toISOString(),
  };

  db.saveStudentSkillProfile({
    userId: studentId,
    overallScore: 72,
    overallLevel: 'Intermediate',
    totalQuestionsAttempted: 10,
    totalCorrectAnswers: 8,
    skills: [m3ProfileScore],
    strongestSkills: [m3ProfileScore],
    weakestSkills: [],
    assessmentCount: 1,
    lastAssessedDate: new Date().toISOString(),
  });

  const reportFromM3 = SkillGapEngine.generateReport(studentId, sampleCareerFromCatalog);
  const m3AssessedSkill = reportFromM3.orderedSkillGaps.find(
    g => g.skillId === sampleCareerFromCatalog.requiredSkills[0].skillId
  )!;
  assert(m3AssessedSkill.currentLevel === 72, `Expected score 72 from Module 3, got ${m3AssessedSkill.currentLevel}`);
  assert(m3AssessedSkill.isUnassessed === false, 'Skill from Module 3 must not be unassessed');

  // 17. Module 4 -> Module 5 integration
  console.log('17. Testing Module 4 career catalog consumption...');
  assert(reportFromM3.careerId === sampleCareerFromCatalog.id, 'Career ID must match Module 4 catalog');
  assert(reportFromM3.totalRequiredSkills === sampleCareerFromCatalog.requiredSkills.length, 'Required skills count must match Module 4');

  // 18. Reassessment -> updated skill gap
  console.log('18. Testing reassessment updates skill gap report...');
  // Update student's score from 72 to 95
  const updatedM3Profile = db.getStudentSkillProfile(studentId)!;
  updatedM3Profile.skills[0].score = 95;
  db.saveStudentSkillProfile(updatedM3Profile);

  const reportAfterReassessment = SkillGapEngine.generateReport(studentId, sampleCareerFromCatalog);
  const reassessedSkill = reportAfterReassessment.orderedSkillGaps.find(
    g => g.skillId === sampleCareerFromCatalog.requiredSkills[0].skillId
  )!;
  assert(reassessedSkill.currentLevel === 95, `Expected reassessed score 95, got ${reassessedSkill.currentLevel}`);
  assert(reassessedSkill.gap <= m3AssessedSkill.gap, 'Gap after reassessment should decrease or reach 0');

  // 19. Multiple careers producing different gap reports
  console.log('19. Testing multiple careers produce different gap reports...');
  const careers = db.getAllCareers();
  if (careers.length >= 2) {
    const reportCareerA = SkillGapEngine.generateReport(studentId, careers[0]);
    const reportCareerB = SkillGapEngine.generateReport(studentId, careers[1]);
    assert(reportCareerA.careerId !== reportCareerB.careerId, 'Career IDs must differ');
    assert(reportCareerA.careerName !== reportCareerB.careerName, 'Career names must differ');
  }

  // 20. Empty/no-gap state
  console.log('20. Testing empty/no-gap state when all requirements met...');
  const perfectSkills: UserSkillScore[] = testCareer1.requiredSkills.map(req => ({
    skillId: req.skillId,
    skillName: req.skillName,
    score: 100,
    level: 'expert',
    lastAssessedAt: '2026-01-01',
  }));
  const reportPerfect = SkillGapEngine.generateReport(studentId, testCareer1, perfectSkills);
  assert(reportPerfect.skillsWithGaps === 0, `Expected 0 gaps in perfect state, got ${reportPerfect.skillsWithGaps}`);
  assert(reportPerfect.skillsMet === testCareer1.requiredSkills.length, 'All skills must be met');
  assert(reportPerfect.overallReadiness === 100, `Expected 100% readiness, got ${reportPerfect.overallReadiness}`);
  assert(reportPerfect.criticalGaps === 0, 'No critical gaps allowed');

  // Summary generation test
  console.log('Testing generateSummary compact dashboard output...');
  const summary = SkillGapEngine.generateSummary(studentId, testCareer1, skills1);
  assert(summary.careerId === testCareer1.id, 'Summary careerId must match');
  assert(Array.isArray(summary.topSkillGaps), 'Summary topSkillGaps must be an array');
  assert(summary.topSkillGaps.length <= 3, 'Summary topSkillGaps must be compact (<= 3)');

  // --------------------------------------------------------------------------
  // LIVE HTTP API INTEGRATION TESTS (401, 403, 404, 400, End-to-End)
  // --------------------------------------------------------------------------
  console.log('\n21. Running Live HTTP API Integration Tests on ephemeral server...');
  const app = express();
  app.use(express.json());
  app.use('/api/skill-gap', skillGapRouter);
  app.use('/api/careers', careersRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/assessment', assessmentRouter);

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const studentToken = createSessionToken(student);

    // 21a. 401 Unauthenticated on all protected endpoints
    console.log('   Testing 401 on unauthenticated requests...');
    const resUnauthMain = await fetch(`${baseUrl}/api/skill-gap`);
    assert(resUnauthMain.status === 401, `Expected 401, got ${resUnauthMain.status}`);

    const resUnauthDetail = await fetch(`${baseUrl}/api/skill-gap/car_fullstack`);
    assert(resUnauthDetail.status === 401, `Expected 401, got ${resUnauthDetail.status}`);

    const resUnauthSummary = await fetch(`${baseUrl}/api/skill-gap/car_fullstack/summary`);
    assert(resUnauthSummary.status === 401, `Expected 401, got ${resUnauthSummary.status}`);
    console.log('   ✓ 401 Unauthenticated properly enforced on all endpoints');

    // 21b. 400 CAREER_NOT_SELECTED when student has not chosen a target career
    console.log('   Testing 400 CAREER_NOT_SELECTED when no target career selected...');
    const freshStudentId = `usr_fresh_${Date.now()}`;
    const freshUser = db.createUser({
      id: freshStudentId,
      email: `fresh_${Date.now()}@skillup.ai`,
      passwordHash: 'hash',
      fullName: 'Fresh Student',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const freshToken = createSessionToken(freshUser);

    const resNoCareer = await fetch(`${baseUrl}/api/skill-gap`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(resNoCareer.status === 400, `Expected 400 for no selected career, got ${resNoCareer.status}`);
    const noCareerJson = await resNoCareer.json();
    assert(noCareerJson.error.code === 'CAREER_NOT_SELECTED', `Expected CAREER_NOT_SELECTED, got ${noCareerJson.error.code}`);
    console.log('   ✓ 400 CAREER_NOT_SELECTED cleanly returned when student has no active target');

    // 21c. 404 CAREER_NOT_FOUND on non-existent career
    console.log('   Testing 404 CAREER_NOT_FOUND on invalid career IDs...');
    const resInvalidCareerParam = await fetch(`${baseUrl}/api/skill-gap/car_non_existent_xyz`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resInvalidCareerParam.status === 404, `Expected 404, got ${resInvalidCareerParam.status}`);

    const resInvalidCareerSummary = await fetch(`${baseUrl}/api/skill-gap/car_non_existent_xyz/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resInvalidCareerSummary.status === 404, `Expected 404, got ${resInvalidCareerSummary.status}`);

    const resInvalidCareerQuery = await fetch(`${baseUrl}/api/skill-gap?careerId=car_non_existent_xyz`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resInvalidCareerQuery.status === 404, `Expected 404, got ${resInvalidCareerQuery.status}`);
    console.log('   ✓ 404 CAREER_NOT_FOUND cleanly returned on non-existent career IDs');

    // 21d. 403 Forbidden on unauthorized cross-student queries
    console.log('   Testing 403 Forbidden on cross-student unauthorized access...');
    const otherStudentId = `usr_other_${Date.now()}`;
    db.createUser({
      id: otherStudentId,
      email: `other_${Date.now()}@skillup.ai`,
      passwordHash: 'hash',
      fullName: 'Other Student',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resCrossCareer = await fetch(`${baseUrl}/api/skill-gap/car_fullstack?studentId=${otherStudentId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(resCrossCareer.status === 403, `Expected 403 for cross-student query, got ${resCrossCareer.status}`);
    const crossCareerJson = await resCrossCareer.json();
    assert(crossCareerJson.error.code === 'FORBIDDEN', `Expected FORBIDDEN, got ${crossCareerJson.error.code}`);

    const resCrossSummary = await fetch(`${baseUrl}/api/skill-gap/car_fullstack/summary?studentId=${otherStudentId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(resCrossSummary.status === 403, `Expected 403 for cross-student summary, got ${resCrossSummary.status}`);
    console.log('   ✓ 403 Forbidden blocks unauthorized cross-student data access');

    // 21e. Valid 200 responses on specific career endpoint & summary endpoint
    console.log('   Testing 200 OK on /api/skill-gap/:careerId and /summary...');
    const resValidReport = await fetch(`${baseUrl}/api/skill-gap/car_fullstack`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resValidReport.status === 200, `Expected 200, got ${resValidReport.status}`);
    const validReportJson = await resValidReport.json();
    assert(validReportJson.success === true, 'Response must be success');
    assert(validReportJson.data.careerId === 'car_fullstack', 'Career ID must be car_fullstack');
    assert(Array.isArray(validReportJson.data.orderedSkillGaps), 'orderedSkillGaps must be array');

    const resValidSummary = await fetch(`${baseUrl}/api/skill-gap/car_fullstack/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(resValidSummary.status === 200, `Expected 200, got ${resValidSummary.status}`);
    const validSummaryJson = await resValidSummary.json();
    assert(validSummaryJson.data.careerId === 'car_fullstack', 'Summary careerId must match');
    assert(Array.isArray(validSummaryJson.data.topSkillGaps), 'topSkillGaps must be array');
    console.log('   ✓ 200 OK cleanly returned with full report and dashboard summary');

    // 21f. Complete End-to-End Pipeline:
    // Assessment -> Module 3 Skill Analysis -> Module 4 Career Selection -> Module 5 Skill Gap Analysis
    console.log('\n22. Testing End-to-End Flow: Assessment -> Skills -> Career -> Gap Analysis...');
    const pipeStudentId = `usr_pipe_${Date.now()}`;
    const pipeUser = db.createUser({
      id: pipeStudentId,
      email: `pipeline_${Date.now()}@skillup.ai`,
      passwordHash: 'hash',
      fullName: 'Pipeline Student',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const pipeToken = createSessionToken(pipeUser);

    // Step 1: Submit realistic assessment
    const assessmentRes: AssessmentResult = {
      assessmentId: `asm_pipe_${Date.now()}`,
      userId: pipeStudentId,
      isReassessment: false,
      totalQuestions: 10,
      curatedCount: 10,
      aiGeneratedCount: 0,
      overallScore: 78,
      skillBreakdown: {
        skl_programming: { skillName: 'Programming', correct: 5, total: 5, percentage: 100, weightedScore: 90 },
        skl_database: { skillName: 'Database', correct: 4, total: 5, percentage: 80, weightedScore: 75 },
        skl_web_dev: { skillName: 'Web Development', correct: 4, total: 5, percentage: 80, weightedScore: 70 },
      },
      completedAt: new Date().toISOString(),
    };
    SkillAnalysisEngine.processAssessmentResult(assessmentRes);

    // Step 2: Select target career via Module 4 API
    const resSelectCareer = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pipeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ careerId: 'car_fullstack' }),
    });
    assert(resSelectCareer.status === 200, `Expected 200 for select career, got ${resSelectCareer.status}`);

    // Step 3: Fetch skill gap without query param -> uses selected career
    const resPipeGap = await fetch(`${baseUrl}/api/skill-gap`, {
      headers: { Authorization: `Bearer ${pipeToken}` },
    });
    assert(resPipeGap.status === 200, `Expected 200 for skill gap, got ${resPipeGap.status}`);
    const pipeGapJson = await resPipeGap.json();
    assert(pipeGapJson.data.careerId === 'car_fullstack', 'Must match selected career');
    assert(pipeGapJson.data.overallReadiness > 0, 'Readiness must be greater than 0');

    // Step 4: Verify Programming score (90) vs required (80) is MET
    const progGap = pipeGapJson.data.orderedSkillGaps.find((g: any) => g.skillId === 'skl_programming');
    assert(progGap, 'Programming gap record must exist');
    assert(progGap.currentLevel === 90, `Expected currentLevel 90, got ${progGap.currentLevel}`);
    assert(progGap.gap === 0, `Expected gap 0, got ${progGap.gap}`);
    assert(progGap.status === 'MET', `Expected status MET, got ${progGap.status}`);

    // Step 5: Switch target career to Data Analyst
    const resSwitchCareer = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pipeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ careerId: 'car_data_analyst' }),
    });
    assert(resSwitchCareer.status === 200, 'Expected 200 on switch career');

    const resSwitchedGap = await fetch(`${baseUrl}/api/skill-gap`, {
      headers: { Authorization: `Bearer ${pipeToken}` },
    });
    const switchedGapJson = await resSwitchedGap.json();
    assert(switchedGapJson.data.careerId === 'car_data_analyst', 'Must match newly selected career');

    console.log('   ✓ End-to-End Pipeline successfully verified!');
  } finally {
    server.close();
  }

  console.log('\n✓ Module 5 — Skill Gap Analysis: All 22 architectural and HTTP verification points successfully passed!');
}
