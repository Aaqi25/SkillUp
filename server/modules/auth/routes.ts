import { Router, Request, Response } from 'express';
import { db } from '../../db/client.js';
import { sendSuccess, sendError } from '../../common/utils/response.js';
import { authenticate, AuthenticatedRequest } from '../../common/middleware/auth.js';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  toSafeUser,
} from './authService.js';
import { User } from '../../common/types.js';

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Student registration with email format validation and password length checks.
 */
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, fullName, educationLevel, degreeCourse, academicYear } = req.body;

  // Validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return sendError(res, 'A valid email address is required', 400, 'INVALID_EMAIL', null, 'auth');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!password || typeof password !== 'string' || password.length < 8) {
    return sendError(
      res,
      'Password must be at least 8 characters long',
      400,
      'WEAK_PASSWORD',
      null,
      'auth'
    );
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return sendError(res, 'Full name is required (minimum 2 characters)', 400, 'INVALID_NAME', null, 'auth');
  }

  // Check unique email
  const existingUser = db.getUserByEmail(normalizedEmail);
  if (existingUser) {
    return sendError(
      res,
      'An account with this email address already exists',
      409,
      'EMAIL_ALREADY_EXISTS',
      null,
      'auth'
    );
  }

  // Create new student
  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: User = {
    id: newUserId,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    fullName: fullName.trim(),
    role: 'student',
    educationLevel: educationLevel ? String(educationLevel).trim() : undefined,
    degreeCourse: degreeCourse ? String(degreeCourse).trim() : undefined,
    academicYear: academicYear ? String(academicYear).trim() : undefined,
    careerInterests: [],
    learningPreferences: [],
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createUser(newUser);

  const token = createSessionToken(newUser);
  const safeUser = toSafeUser(newUser);

  return sendSuccess(
    res,
    {
      token,
      user: safeUser,
    },
    'auth'
  );
});

/**
 * POST /api/auth/login
 * Validates credentials and generates signed session token.
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400, 'MISSING_CREDENTIALS', null, 'auth');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.getUserByEmail(normalizedEmail);

  if (!user) {
    return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS', null, 'auth');
  }

  const isPasswordValid = verifyPassword(String(password), user.passwordHash);
  if (!isPasswordValid) {
    return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS', null, 'auth');
  }

  const token = createSessionToken(user);
  const safeUser = toSafeUser(user);

  return sendSuccess(
    res,
    {
      token,
      user: safeUser,
    },
    'auth'
  );
});

/**
 * POST /api/auth/logout
 * Terminates active session.
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  return sendSuccess(res, { message: 'Logged out successfully' }, 'auth');
});

/**
 * GET /api/auth/me
 * Protected route: Returns current authenticated student profile.
 */
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED', null, 'auth');
  }

  const user = db.getUser(req.user.id);
  if (!user) {
    return sendError(res, 'Student profile not found', 404, 'USER_NOT_FOUND', null, 'auth');
  }

  return sendSuccess(res, toSafeUser(user), 'auth');
});

/**
 * PATCH /api/auth/profile
 * Protected route: Student can only update their own profile fields.
 * Supports updating educationLevel, degreeCourse, academicYear, careerInterests, learningPreferences, fullName, onboardingCompleted.
 */
authRouter.patch('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED', null, 'auth');
  }

  const user = db.getUser(req.user.id);
  if (!user) {
    return sendError(res, 'Student profile not found', 404, 'USER_NOT_FOUND', null, 'auth');
  }

  const {
    fullName,
    educationLevel,
    degreeCourse,
    academicYear,
    careerInterests,
    learningPreferences,
    onboardingCompleted,
  } = req.body;

  const updates: Partial<User> = {};

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return sendError(res, 'Full name must be at least 2 characters', 400, 'INVALID_NAME', null, 'auth');
    }
    updates.fullName = fullName.trim();
  }

  if (educationLevel !== undefined) {
    updates.educationLevel = typeof educationLevel === 'string' ? educationLevel.trim() : undefined;
  }

  if (degreeCourse !== undefined) {
    updates.degreeCourse = typeof degreeCourse === 'string' ? degreeCourse.trim() : undefined;
  }

  if (academicYear !== undefined) {
    updates.academicYear = typeof academicYear === 'string' ? academicYear.trim() : undefined;
  }

  if (careerInterests !== undefined) {
    if (!Array.isArray(careerInterests)) {
      return sendError(res, 'careerInterests must be an array of strings', 400, 'INVALID_CAREER_INTERESTS', null, 'auth');
    }
    updates.careerInterests = careerInterests.map(item => String(item).trim()).filter(Boolean);
  }

  if (learningPreferences !== undefined) {
    if (!Array.isArray(learningPreferences)) {
      return sendError(res, 'learningPreferences must be an array of strings', 400, 'INVALID_LEARNING_PREFERENCES', null, 'auth');
    }
    updates.learningPreferences = learningPreferences.map(item => String(item).trim()).filter(Boolean);
  }

  if (onboardingCompleted !== undefined) {
    updates.onboardingCompleted = Boolean(onboardingCompleted);
  }

  const updatedUser = db.updateUser(user.id, updates);
  if (!updatedUser) {
    return sendError(res, 'Failed to update student profile', 500, 'UPDATE_FAILED', null, 'auth');
  }

  return sendSuccess(res, toSafeUser(updatedUser), 'auth');
});
