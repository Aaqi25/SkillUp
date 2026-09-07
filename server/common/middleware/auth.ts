import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { verifySessionToken } from '../../modules/auth/authService.js';
import { db } from '../../db/client.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Strict authentication middleware:
 * 1. Extracts Bearer token from Authorization header or 'skillup_token' cookie.
 * 2. Cryptographically verifies HMAC signature and expiration timestamp.
 * 3. Confirms user exists in database.
 * 4. Injects verified user context onto req.user.
 * 5. Rejects unauthenticated requests with HTTP 401 UNAUTHORIZED.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(
      res,
      'Authentication required. Please provide a valid Authorization header.',
      401,
      'UNAUTHORIZED',
      null,
      'auth'
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return sendError(res, 'Authentication token format invalid', 401, 'INVALID_TOKEN_FORMAT', null, 'auth');
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return sendError(res, 'Session token expired or invalid signature', 401, 'INVALID_OR_EXPIRED_TOKEN', null, 'auth');
  }

  const user = db.getUser(payload.userId);
  if (!user) {
    return sendError(res, 'Authenticated user account not found', 401, 'ACCOUNT_NOT_FOUND', null, 'auth');
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
}

/**
 * Optional authentication: populates req.user if a valid token exists, but does not reject if absent.
 */
export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const payload = verifySessionToken(token);
  if (payload) {
    const user = db.getUser(payload.userId);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  }

  next();
}
