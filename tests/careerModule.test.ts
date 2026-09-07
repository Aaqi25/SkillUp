/**
 * SkillUp AI - Module 4: Career Recommendation Engine & Integration Tests
 * 
 * Test Coverage:
 * 1. Career catalog integrity (all 6 MVP careers exist with complete metadata)
 * 2. Career-skill mapping integrity (weights sum to 1.0, skills exist in taxonomy)
 * 3. Deterministic Career Matching Engine calculations
 * 4. Missing / unassessed skill handling (explicit handling without treating as zero in assessed weight denominator)
 * 5. Normalized 0-100 match score bounds
 * 6. Match quality threshold boundary precision (80+, 65-79.99, 50-64.99, 30-49.99, 0-29.99)
 * 7. Career ranking logic: match score descending, with deterministic alphabetical tie-breaking
 * 8. Match explanation generation: strongest matching skills, skills to improve, assessed vs required counts
 * 9. Selected career persistence (setting target, retrieving target, changing target)
 * 10. No-assessment state handling (returns hasCompletedAssessment: false and helpful prompt)
 * 11. Security and authorization:
 *     - 401 Unauthenticated on protected endpoints
 *     - 403 Forbidden on unauthorized cross-student queries
 *     - 404 on non-existent career identifiers
 *     - 400 on malformed select requests
 * 12. Full End-to-End Pipeline: Assessment -> Skill Analysis (Module 3) -> Career Recommendations (Module 4) -> Target Career Selection
 */

import assert from 'node:assert';
import express from 'express';
import { db } from '../server/db/client.js';
import { CareerMatchingEngine } from '../server/modules/careers/careerMatchingEngine.js';
import { careersRouter } from '../server/modules/careers/routes.js';
import { skillsRouter } from '../server/modules/skills/routes.js';
import { assessmentRouter } from '../server/modules/assessment/routes.js';
import { SkillAnalysisEngine } from '../server/modules/skills/skillAnalysisEngine.js';
import { createSessionToken } from '../server/modules/auth/authService.js';
import { MATCH_THRESHOLDS, getMatchCategory } from '../server/modules/careers/types.js';
import { AssessmentResult, CareerRole, UserSkillScore } from '../server/common/types.js';

export async function runCareerModuleTests() {
  console.log('--- Running Module 4: Career Recommendation & Architectural Tests ---');

  // --------------------------------------------------------------------------
  // TEST 1: Career Catalog Integrity
  // --------------------------------------------------------------------------
  console.log('1. Verifying Career Catalog integrity...');
  const allCareers = db.getAllCareers();
  assert(allCareers.length >= 6, `Expected at least 6 careers, found ${allCareers.length}`);

  const requiredCareerSlugs = [
    'full-stack-developer',
    'data-analyst',
    'data-scientist',
    'aiml-engineer',
    'cybersecurity-engineer',
    'devops-engineer',
  ];

  for (const slug of requiredCareerSlugs) {
    const career = allCareers.find(c => c.slug === slug);
    assert(career, `Career with slug "${slug}" must exist in catalog`);
    assert(career.id, `Career "${slug}" must have an id`);
    assert(career.title || career.name, `Career "${slug}" must have title or name`);
    assert(career.description, `Career "${slug}" must have description`);
    assert(career.category, `Career "${slug}" must have category`);
    assert(career.marketDemand, `Career "${slug}" must have marketDemand`);
    assert(Array.isArray(career.requiredSkills), `Career "${slug}" must have requiredSkills array`);
    assert(career.requiredSkills.length > 0, `Career "${slug}" must require at least one skill`);
  }
  console.log(`   ✓ All 6 MVP careers exist with complete metadata (Total careers in catalog: ${allCareers.length})`);

  // --------------------------------------------------------------------------
  // TEST 2: Career-Skill Mapping Integrity (Weights Sum to 1.0)
  // --------------------------------------------------------------------------
  console.log('2. Verifying Career-Skill Mapping integrity & weight sum constraints...');
  const allTaxonomySkills = db.getAllSkills();
  const taxonomySkillIds = new Set(allTaxonomySkills.map(s => s.id));

  for (const career of allCareers) {
    const weightSum = career.requiredSkills.reduce((sum, req) => sum + req.weight, 0);
    // Allow minor floating point inaccuracy (1e-4)
    assert(
      Math.abs(weightSum - 1.0) < 0.001,
      `Career "${career.title}" weights must sum to 1.0, got ${weightSum}`
    );

    for (const req of career.requiredSkills) {
      assert(req.skillId, `Required skill in "${career.title}" must have skillId`);
      assert(req.skillName, `Required skill in "${career.title}" must have skillName`);
      assert(req.weight > 0 && req.weight <= 1.0, `Skill "${req.skillName}" weight must be between 0 and 1.0`);
      assert(req.targetLevel > 0 && req.targetLevel <= 100, `Skill "${req.skillName}" targetLevel must be between 1 and 100`);
      assert(
        taxonomySkillIds.has(req.skillId),
        `Required skill "${req.skillId}" in "${career.title}" must exist in Skill taxonomy`
      );
    }
  }
  console.log('   ✓ All career skill weights strictly sum to 1.0 and reference verified taxonomy skills');

  // --------------------------------------------------------------------------
  // TEST 3: Match Quality Centralized Threshold Boundaries
  // --------------------------------------------------------------------------
  console.log('3. Verifying centralized Match Quality threshold mappings...');
  assert.strictEqual(getMatchCategory(100), 'Excellent Match');
  assert.strictEqual(getMatchCategory(80), 'Excellent Match');
  assert.strictEqual(getMatchCategory(79.9), 'Strong Match');
  assert.strictEqual(getMatchCategory(65), 'Strong Match');
  assert.strictEqual(getMatchCategory(64.9), 'Moderate Match');
  assert.strictEqual(getMatchCategory(50), 'Moderate Match');
  assert.strictEqual(getMatchCategory(49.9), 'Low Match');
  assert.strictEqual(getMatchCategory(30), 'Low Match');
  assert.strictEqual(getMatchCategory(29.9), 'Poor Match');
  assert.strictEqual(getMatchCategory(0), 'Poor Match');
  console.log('   ✓ Match category thresholds (80-100, 65-79.99, 50-64.99, 30-49.99, 0-29.99) verified');

  // --------------------------------------------------------------------------
  // TEST 4: Deterministic Matching Formula Calculation
  // --------------------------------------------------------------------------
  console.log('4. Verifying Deterministic Matching Formula calculation...');
  const testCareer: CareerRole = {
    id: 'car_test_formula',
    title: 'Formula Test Engineer',
    slug: 'formula-test-engineer',
    description: 'Deterministic test role',
    marketDemand: 'high',
    requiredSkills: [
      { skillId: 'skl_programming', skillName: 'Programming', weight: 0.60, targetLevel: 100 },
      { skillId: 'skl_database', skillName: 'Database', weight: 0.40, targetLevel: 80 },
    ],
  };

  // Student scores: skl_programming = 50 (50/100 = 0.5 fulfillment), skl_database = 80 (80/80 = 1.0 fulfillment)
  // Weighted calculation:
  // Programming: 0.60 * 50 = 30
  // Database: 0.40 * 100 = 40
  // Total assessed weighted sum = 70. Total assessed weight = 1.0.
  // Match score = 70.
  const studentSkills: UserSkillScore[] = [
    { skillId: 'skl_programming', skillName: 'Programming', score: 50, level: 'intermediate', lastAssessedAt: new Date().toISOString() },
    { skillId: 'skl_database', skillName: 'Database', score: 80, level: 'expert', lastAssessedAt: new Date().toISOString() },
  ];

  const matchRes = CareerMatchingEngine.calculateMatch(testCareer, studentSkills);
  assert.strictEqual(matchRes.matchScore, 70);
  assert.strictEqual(matchRes.matchPercentage, 70);
  assert.strictEqual(matchRes.matchCategory, 'Strong Match');
  assert.strictEqual(matchRes.matchedSkillCount, 2);
  assert.strictEqual(matchRes.requiredSkillCount, 2);
  console.log('   ✓ Formula Σ(studentSkillScore × weight) / Σ(weight) produced exact deterministic score 70');

  // --------------------------------------------------------------------------
  // TEST 5: Explicit Handling of Missing / Unassessed Skills
  // --------------------------------------------------------------------------
  console.log('5. Verifying explicit missing skill handling without zero-penalty distortion...');
  // Only Programming is assessed (score 60, weight 0.60). Database (weight 0.40) is unassessed.
  const partialSkills: UserSkillScore[] = [
    { skillId: 'skl_programming', skillName: 'Programming', score: 60, level: 'advanced', lastAssessedAt: new Date().toISOString() },
  ];

  const partialMatch = CareerMatchingEngine.calculateMatch(testCareer, partialSkills);
  // Programming normalized score: (60 / 100) * 100 = 60.
  // Assessed weight = 0.60. Assessed weighted sum = 0.60 * 60 = 36.
  // matchScore = 36 / 0.60 = 60.
  assert.strictEqual(partialMatch.matchScore, 60);
  assert.strictEqual(partialMatch.matchedSkillCount, 1);
  assert.strictEqual(partialMatch.requiredSkillCount, 2);

  // Missing skill must be explicitly recorded
  const missingSkill = partialMatch.skillContributions.find(s => s.skillId === 'skl_database');
  assert(missingSkill, 'Missing skill must be present in contributions');
  assert.strictEqual(missingSkill.isAssessed, false);
  assert.strictEqual(missingSkill.isMissing, true);

  // Weakest matching skills / skills to improve must contain the unassessed skill
  const toImprove = partialMatch.weakestMatchingSkills.find(s => s.skillId === 'skl_database');
  assert(toImprove, 'Unassessed skill must be surfaced under weakestMatchingSkills');
  assert.strictEqual(toImprove.isMissing, true);
  console.log('   ✓ Missing skills handled explicitly without penalizing assessed skills as zero');

  // --------------------------------------------------------------------------
  // TEST 6: Ranking Logic & Deterministic Alphabetical Tie-Breaking
  // --------------------------------------------------------------------------
  console.log('6. Verifying Career Ranking & deterministic alphabetical tie-breaking...');
  const careerBeta: CareerRole = {
    id: 'car_beta',
    title: 'Beta Specialist',
    slug: 'beta-specialist',
    description: 'Beta role',
    marketDemand: 'high',
    requiredSkills: [{ skillId: 'skl_programming', skillName: 'Programming', weight: 1.0, targetLevel: 100 }],
  };

  const careerAlpha: CareerRole = {
    id: 'car_alpha',
    title: 'Alpha Specialist',
    slug: 'alpha-specialist',
    description: 'Alpha role',
    marketDemand: 'high',
    requiredSkills: [{ skillId: 'skl_programming', skillName: 'Programming', weight: 1.0, targetLevel: 100 }],
  };

  const careerGamma: CareerRole = {
    id: 'car_gamma',
    title: 'Gamma Specialist',
    slug: 'gamma-specialist',
    description: 'Gamma role with higher score',
    marketDemand: 'high',
    requiredSkills: [{ skillId: 'skl_programming', skillName: 'Programming', weight: 1.0, targetLevel: 50 }],
  };

  // Student has programming = 50.
  // For Beta (target 100): score = 50
  // For Alpha (target 100): score = 50
  // For Gamma (target 50): score = 100 (50/50 = 1.0)
  const ranked = CareerMatchingEngine.rankCareers(
    [careerBeta, careerGamma, careerAlpha],
    [{ skillId: 'skl_programming', skillName: 'Programming', score: 50, level: 'intermediate', lastAssessedAt: new Date().toISOString() }]
  );

  // 1. First by score descending: Gamma has 100
  assert.strictEqual(ranked[0].careerTitle, 'Gamma Specialist');
  assert.strictEqual(ranked[0].matchScore, 100);

  // 2. Tied careers (Alpha and Beta both have 50): Alpha must come before Beta alphabetically
  assert.strictEqual(ranked[1].careerTitle, 'Alpha Specialist');
  assert.strictEqual(ranked[1].matchScore, 50);
  assert.strictEqual(ranked[2].careerTitle, 'Beta Specialist');
  assert.strictEqual(ranked[2].matchScore, 50);
  console.log('   ✓ Ranking sorts by matchScore descending with deterministic alphabetical tie-break');

  // --------------------------------------------------------------------------
  // TEST 7: Selected Career Target Persistence
  // --------------------------------------------------------------------------
  console.log('7. Verifying Selected Career persistence in database client...');
  const testStudentId = 'usr_test_student_career_01';
  db.createUser({
    id: testStudentId,
    email: 'careerstudent@skillup.ai',
    passwordHash: 'hash',
    fullName: 'Career Test Student',
    role: 'student',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Initially no selected career
  const initialSelected = db.getSelectedCareer(testStudentId);
  assert.strictEqual(initialSelected, undefined, 'Initially student should have no selected career');

  // Student selects Full Stack Developer
  const record1 = db.setSelectedCareer(testStudentId, 'car_fullstack');
  assert.strictEqual(record1.studentId, testStudentId);
  assert.strictEqual(record1.careerId, 'car_fullstack');
  assert(record1.selectedAt, 'Selected record must have timestamp');

  // Retrieve saved career
  const retrieved1 = db.getSelectedCareer(testStudentId);
  assert(retrieved1);
  assert.strictEqual(retrieved1.careerId, 'car_fullstack');

  // Student switches target career to Data Analyst
  const record2 = db.setSelectedCareer(testStudentId, 'car_data_analyst');
  assert.strictEqual(record2.careerId, 'car_data_analyst');
  const retrieved2 = db.getSelectedCareer(testStudentId);
  assert(retrieved2);
  assert.strictEqual(retrieved2.careerId, 'car_data_analyst');
  console.log('   ✓ Career selection persistence and target changing verified');

  // --------------------------------------------------------------------------
  // TEST 8: Live HTTP API Integration Tests (Auth, 401, 403, 404, 400, End-to-End)
  // --------------------------------------------------------------------------
  console.log('8. Running Live HTTP API Integration Tests on ephemeral server...');
  const app = express();
  app.use(express.json());
  app.use('/api/careers', careersRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/assessment', assessmentRouter);

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 8a. Public endpoint: GET /api/careers
    const resCatalog = await fetch(`${baseUrl}/api/careers`);
    assert.strictEqual(resCatalog.status, 200);
    const catalogJson = await resCatalog.json();
    assert.strictEqual(catalogJson.success, true);
    assert(catalogJson.data.length >= 6);
    console.log('   ✓ GET /api/careers returned 200 with catalog');

    // 8b. Public endpoint: GET /api/careers/:careerId (Valid and Invalid)
    const resDetail = await fetch(`${baseUrl}/api/careers/car_fullstack`);
    assert.strictEqual(resDetail.status, 200);
    const detailJson = await resDetail.json();
    assert.strictEqual(detailJson.data.id, 'car_fullstack');

    const resNotFound = await fetch(`${baseUrl}/api/careers/car_non_existent_999`);
    assert.strictEqual(resNotFound.status, 404);
    const notFoundJson = await resNotFound.json();
    assert.strictEqual(notFoundJson.error.code, 'CAREER_NOT_FOUND');
    console.log('   ✓ GET /api/careers/:careerId handled 200 and 404 cleanly');

    // 8c. Protected endpoint without token: GET /api/careers/recommendations -> 401
    const resUnauthRecs = await fetch(`${baseUrl}/api/careers/recommendations`);
    assert.strictEqual(resUnauthRecs.status, 401);
    const unauthRecsJson = await resUnauthRecs.json();
    assert.strictEqual(unauthRecsJson.error.code, 'UNAUTHORIZED');
    console.log('   ✓ GET /api/careers/recommendations rejected unauthenticated query with 401');

    // 8d. Protected endpoint without token: POST /api/careers/select -> 401
    const resUnauthSelect = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careerId: 'car_fullstack' }),
    });
    assert.strictEqual(resUnauthSelect.status, 401);
    console.log('   ✓ POST /api/careers/select rejected unauthenticated request with 401');

    // 8e. Authenticated student with NO assessments -> hasCompletedAssessment: false
    const freshStudentId = 'usr_fresh_unassessed_student';
    const freshUser = db.createUser({
      id: freshStudentId,
      email: 'fresh@skillup.ai',
      passwordHash: 'hash',
      fullName: 'Fresh Student',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const freshToken = createSessionToken(freshUser);

    const resFreshRecs = await fetch(`${baseUrl}/api/careers/recommendations`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(resFreshRecs.status, 200);
    const freshRecsJson = await resFreshRecs.json();
    assert.strictEqual(freshRecsJson.data.hasCompletedAssessment, false);
    assert.strictEqual(freshRecsJson.data.recommendations.length, 0);
    assert.strictEqual(freshRecsJson.data.topCareer, null);
    console.log('   ✓ Unassessed student handled cleanly with hasCompletedAssessment: false');

    // 8f. Cross-student access rejection: GET /api/careers/recommendations/:studentId -> 403
    const anotherStudentId = 'usr_another_student_private';
    db.createUser({
      id: anotherStudentId,
      email: 'another@skillup.ai',
      passwordHash: 'hash',
      fullName: 'Another Student',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resCrossAccess = await fetch(`${baseUrl}/api/careers/recommendations/${anotherStudentId}`, {
      headers: { Authorization: `Bearer ${freshToken}` }, // freshToken belongs to freshStudentId
    });
    assert.strictEqual(resCrossAccess.status, 403);
    const crossJson = await resCrossAccess.json();
    assert.strictEqual(crossJson.error.code, 'FORBIDDEN_CROSS_STUDENT');
    console.log('   ✓ Cross-student recommendation query rejected with HTTP 403 Forbidden');

    // 8g. POST /api/careers/select validation (empty body -> 400, invalid career -> 404, valid -> 200)
    const resBadBody = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${freshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadBody.status, 400);
    const badBodyJson = await resBadBody.json();
    assert.strictEqual(badBodyJson.error.code, 'MISSING_FIELD');

    const resInvalidCareer = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${freshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ careerId: 'car_does_not_exist' }),
    });
    assert.strictEqual(resInvalidCareer.status, 404);
    const invalidCareerJson = await resInvalidCareer.json();
    assert.strictEqual(invalidCareerJson.error.code, 'CAREER_NOT_FOUND');

    // Valid career selection
    const resValidSelect = await fetch(`${baseUrl}/api/careers/select`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${freshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ careerId: 'car_fullstack' }),
    });
    assert.strictEqual(resValidSelect.status, 200);
    const validSelectJson = await resValidSelect.json();
    assert.strictEqual(validSelectJson.data.selectedCareerId, 'car_fullstack');
    assert.strictEqual(validSelectJson.data.selectedCareer.careerId, 'car_fullstack');

    // GET /api/careers/selected
    const resGetSelected = await fetch(`${baseUrl}/api/careers/selected`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(resGetSelected.status, 200);
    const getSelectedJson = await resGetSelected.json();
    assert.strictEqual(getSelectedJson.data.selectedCareer.careerId, 'car_fullstack');
    assert.strictEqual(getSelectedJson.data.career.id, 'car_fullstack');
    console.log('   ✓ POST /api/careers/select and GET /api/careers/selected validated cleanly');

    // 8h. Full Pipeline Integration: Complete Assessment -> Module 3 Skill Analysis -> Module 4 Career Recommendations
    console.log('9. Verifying full end-to-end flow: Assessment -> Skill Profile -> Career Recommendations...');
    const assessedStudentId = 'usr_pipeline_student_mod4';
    const assessedUser = db.createUser({
      id: assessedStudentId,
      email: 'pipeline4@skillup.ai',
      passwordHash: 'hash',
      fullName: 'Pipeline Student Mod4',
      role: 'student',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const pipelineToken = createSessionToken(assessedUser);

    // Seed realistic assessment result with strong scores in Programming & Web Dev
    const assessmentRes: AssessmentResult = {
      assessmentId: 'asm_pipe_mod4',
      userId: assessedStudentId,
      isReassessment: false,
      totalQuestions: 10,
      curatedCount: 10,
      aiGeneratedCount: 0,
      overallScore: 82,
      skillBreakdown: {
        skl_prog_ts: {
          skillName: 'TypeScript & JavaScript',
          correct: 5,
          total: 5,
          percentage: 100,
          weightedScore: 92,
        },
        skl_prog_py: {
          skillName: 'Python Core',
          correct: 4,
          total: 5,
          percentage: 80,
          weightedScore: 85,
        },
        skl_db_sql: {
          skillName: 'SQL & Relational DBs',
          correct: 4,
          total: 5,
          percentage: 80,
          weightedScore: 82,
        },
        skl_ds_linear: {
          skillName: 'Linear Data Structures',
          correct: 4,
          total: 5,
          percentage: 80,
          weightedScore: 80,
        },
      },
      completedAt: new Date().toISOString(),
    };

    // Update assessment attempt and trigger Module 3 profile processing
    db.createAssessmentAttempt({
      id: 'att_pipe_mod4',
      userId: assessedStudentId,
      status: 'completed',
      isReassessment: false,
      targetSkillIds: ['skl_prog_ts', 'skl_prog_py', 'skl_db_sql', 'skl_ds_linear'],
      questionIds: ['q1', 'q2'],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      resultId: 'asm_pipe_mod4',
    });
    SkillAnalysisEngine.processAssessmentResult(assessmentRes);

    // Call GET /api/careers/recommendations
    const resPipelineRecs = await fetch(`${baseUrl}/api/careers/recommendations`, {
      headers: { Authorization: `Bearer ${pipelineToken}` },
    });
    assert.strictEqual(resPipelineRecs.status, 200);
    const pipelineRecsJson = await resPipelineRecs.json();
    assert.strictEqual(pipelineRecsJson.data.hasCompletedAssessment, true);
    assert(pipelineRecsJson.data.recommendations.length > 0);

    const topRec = pipelineRecsJson.data.topCareer;
    assert(topRec, 'Must return top career recommendation');
    assert(topRec.matchScore > 50, `Expected top career match score > 50, got ${topRec.matchScore}`);
    assert(topRec.strongestMatchingSkills.length > 0);
    assert(topRec.strongestMatchingSkills[0].score >= 80);

    console.log(`   ✓ Pipeline successful: Top Career is "${topRec.careerTitle}" with match score ${topRec.matchScore}% (${topRec.matchCategory})`);
  } finally {
    server.close();
  }

  console.log('✅ Module 4: Career Recommendation Engine & Architectural Tests PASSED\n');
}
