/**
 * SkillUp AI - Antigravity Test Harness
 * Runs all deterministic engine verifications and outputs report.
 */

import { runScoringTests } from './scoringEngine.test.js';
import { runMatchingTests } from './matchingEngine.test.js';
import { runGapTests } from './gapEngine.test.js';
import { runHybridAssessmentTests } from './hybridAssessment.test.js';
import { runAuthAndProfileTests } from './authModule.test.js';

async function main() {
  console.log('====================================================');
  console.log('SkillUp AI - Antigravity Architectural Test Runner');
  console.log('====================================================\n');

  try {
    await runAuthAndProfileTests();
    runScoringTests();
    runMatchingTests();
    runGapTests();
    await runHybridAssessmentTests();

    console.log('\n====================================================');
    console.log('✓ ALL DETERMINISTIC & ARCHITECTURAL TESTS PASSED!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Architectural test assertion failed:', error);
    process.exit(1);
  }
}

main();
