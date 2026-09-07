/**
 * SkillUp AI - Authentication & Cryptography Service (Module 1)
 * Uses native Node.js crypto (PBKDF2 with salt) for secure password hashing and verification.
 * Signs and verifies self-contained signed session tokens without exposing credentials or external keys.
 */

import crypto from 'node:crypto';
import { User, SafeUser } from '../../common/types.js';

const ITERATIONS = 100000;
const KEYLEN = 64;
const DIGEST = 'sha512';
const TOKEN_SECRET = process.env.AUTH_SECRET || 'skillup_secure_session_secret_key_v1';

/**
 * In-memory token revocation set for server-side logout invalidation.
 * Entries are the full token strings that have been explicitly revoked via logout.
 * NOTE: This is cleared on server restart (acceptable limitation for in-memory DB mode).
 * In production with PostgreSQL, this would be persisted to a revoked_tokens table.
 */
const revokedTokens = new Set<string>();

/**
 * Revoke a session token (called on logout). The token will be rejected by verifySessionToken.
 */
export function revokeSessionToken(token: string): void {
  revokedTokens.add(token);
}

/**
 * Hash password securely with PBKDF2 and a random 16-byte cryptographically secure salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify plaintext password against stored salt:hash string using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const computedHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Generate a cryptographically signed HMAC token for the user session.
 */
export function createSessionToken(user: User): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed session token and return the payload if valid, unexpired, and not revoked.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;

  // Reject explicitly revoked tokens (e.g., from logout)
  if (revokedTokens.has(token)) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');

  try {
    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    if (!isValid) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Strips passwordHash and returns safe user profile for API responses and client consumption.
 */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
