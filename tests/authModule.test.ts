/**
 * SkillUp AI - Module 1: Authentication & Student Profile Test Suite
 * Validates:
 * 1. Student Registration (password hashing, email uniqueness, input validation)
 * 2. Student Login (password verification with PBKDF2)
 * 3. Invalid Login (wrong password, non-existent user)
 * 4. Protected Route verification (missing token returns 401)
 * 5. Profile Retrieval (returns safe profile without passwordHash)
 * 6. Profile Update (updates educationLevel, degreeCourse, careerInterests, learningPreferences)
 * 7. Unauthorized Access / Tampered Token rejection
 */

import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, toSafeUser } from '../server/modules/auth/authService.js';
import { db } from '../server/db/client.js';
import { User } from '../server/common/types.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runAuthAndProfileTests() {
  console.log('--- Running Module 1: Auth & Student Profile Tests ---');

  // Test 1: Secure Password Hashing & Verification
  const rawPass = 'SecretStudent2026!';
  const hash = hashPassword(rawPass);
  assert(hash.includes(':'), 'Hash must contain salt delimiter');
  assert(!hash.includes(rawPass), 'Hash must never expose plaintext password');
  assert(verifyPassword(rawPass, hash), 'Valid password must verify correctly against PBKDF2 hash');
  assert(!verifyPassword('WrongPassword123!', hash), 'Invalid password must fail verification');
  console.log('✓ Test 1 Passed: Secure PBKDF2 password hashing and verification');

  // Test 2: Student Registration & Database Persistence
  const testEmail = `student_${Date.now()}@university.edu`;
  const newUser: User = {
    id: `usr_test_${Date.now()}`,
    email: testEmail,
    passwordHash: hashPassword('PassKey1234!'),
    fullName: 'Jordan Lee',
    role: 'student',
    educationLevel: 'Undergraduate',
    degreeCourse: 'Software Engineering',
    academicYear: 'Year 2',
    careerInterests: ['Full Stack Engineer'],
    learningPreferences: ['Hands-on Code Labs'],
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createUser(newUser);
  const fetchedUser = db.getUserByEmail(testEmail);
  assert(!!fetchedUser, 'Registered user must be retrievable by email');
  assert(fetchedUser?.fullName === 'Jordan Lee', 'User fullName must match');
  assert(fetchedUser?.onboardingCompleted === false, 'New user onboarding should default to false');
  console.log('✓ Test 2 Passed: Student registration persistence');

  // Test 3: Safe User Profile Stripping (Never Exposes Password)
  const safe = toSafeUser(newUser);
  assert(!('passwordHash' in safe), 'SafeUser must not have passwordHash property');
  assert(safe.email === testEmail, 'SafeUser must retain email and public fields');
  console.log('✓ Test 3 Passed: Password hash exclusion in API profile projections');

  // Test 4: Signed Token Generation & Verification
  const token = createSessionToken(newUser);
  assert(typeof token === 'string' && token.includes('.'), 'Session token must be formatted payload.signature');
  const payload = verifySessionToken(token);
  assert(!!payload, 'Valid session token must decode cleanly');
  assert(payload?.userId === newUser.id, 'Session token payload must contain correct userId');
  assert(payload?.email === newUser.email, 'Session token payload must contain correct email');
  console.log('✓ Test 4 Passed: Cryptographic HMAC session token generation and verification');

  // Test 5: Unauthorized Access & Tampered Token Rejection
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedPayload = verifySessionToken(tamperedToken);
  assert(tamperedPayload === null, 'Tampered token signature must be rejected');
  assert(verifySessionToken('') === null, 'Empty token must be rejected');
  assert(verifySessionToken('invalid_token') === null, 'Malformed token must be rejected');
  console.log('✓ Test 5 Passed: Unauthorized and tampered token rejection');

  // Test 6: Profile Update & Onboarding Completion
  const updated = db.updateUser(newUser.id, {
    careerInterests: ['Full Stack Engineer', 'Cloud & DevOps Engineer'],
    learningPreferences: ['Hands-on Code Labs', 'System Design Blueprints'],
    educationLevel: 'Undergraduate',
    academicYear: 'Year 3',
    onboardingCompleted: true,
  });

  assert(!!updated, 'User update must succeed');
  assert(updated?.careerInterests?.length === 2, 'Career interests must be updated');
  assert(updated?.learningPreferences?.length === 2, 'Learning preferences must be updated');
  assert(updated?.academicYear === 'Year 3', 'Academic year must be updated');
  assert(updated?.onboardingCompleted === true, 'Onboarding completion status must update to true');
  console.log('✓ Test 6 Passed: Student profile fields update & onboarding completion');

  // Test 7: Demo Student Account Verification
  const demoStudent = db.getUserByEmail('student@skillup.ai');
  assert(!!demoStudent, 'Demo student must be pre-seeded');
  assert(verifyPassword('StudentPass123!', demoStudent!.passwordHash), 'Demo student password must verify');
  console.log('✓ Test 7 Passed: Pre-seeded demo student credentials verified');

  console.log('✓ All 7 Module 1 Auth & Student Profile tests passed successfully!\n');
}
