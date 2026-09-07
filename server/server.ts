import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Common Middleware
import { errorHandler } from './common/middleware/errorHandler.js';
import { optionalAuthenticate } from './common/middleware/auth.js';

// Modular Monolith Routers
import { authRouter } from './modules/auth/routes.js';
import { skillsRouter } from './modules/skills/routes.js';
import { assessmentRouter } from './modules/assessment/routes.js';
import { careersRouter } from './modules/careers/routes.js';
import { skillGapRouter } from './modules/skill-gap/routes.js';
import { roadmapRouter } from './modules/roadmap/routes.js';
import { resourcesRouter } from './modules/resources/routes.js';
import { progressRouter } from './modules/progress/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

// Simple in-memory rate limiter for auth endpoints (brute-force protection)
// Maps: IP -> { count, resetAt }
const authRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX = 20; // max 20 auth requests per IP per window

function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = authRateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    authRateLimitStore.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > AUTH_RATE_LIMIT_MAX) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
      },
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();

  // CORS: Allow same-origin and localhost development origins
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '';
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const appUrl = process.env.APP_URL || '';
    if (isLocalhost || (appUrl && origin === appUrl)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Basic Body Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global Auth Middleware (populates req.user if session token is provided)
  app.use(optionalAuthenticate);

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'SkillUp AI',
      timestamp: new Date().toISOString(),
      architecture: 'Modular Monolith + Dedicated AI Service',
    });
  });

  // Architectural manifest & module catalog endpoint for Antigravity & developer insight
  app.get('/api/architecture/status', (_req: Request, res: Response) => {
    res.json({
      name: 'SkillUp AI',
      pattern: 'Modular Monolith (Express/Node.js) + Dedicated AI Service (Python/FastAPI)',
      database: 'PostgreSQL (Source of Truth)',
      rules: [
        { id: 1, text: 'Do not use AI for deterministic calculations.', status: 'enforced' },
        { id: 2, text: 'Assessment scoring must be handled by backend logic.', status: 'enforced' },
        { id: 3, text: 'Career matching must use a weighted skill-matching algorithm.', status: 'enforced' },
        { id: 4, text: 'Skill-gap calculation must be deterministic.', status: 'enforced' },
        { id: 5, text: 'AI should be used for personalization, explanations, roadmap refinement, feedback and AI-generated questions.', status: 'enforced' },
        { id: 6, text: 'Hybrid assessment system: 100% curated initial, ~70% curated + ~30% AI-generated for reassessment.', status: 'enforced' },
        { id: 7, text: 'Use PostgreSQL as the source of truth.', status: 'enforced' },
        { id: 8, text: 'Follow modular architecture.', status: 'enforced' },
        { id: 9, text: 'Do not modify unrelated modules when implementing a module.', status: 'enforced' },
        { id: 10, text: 'Keep APIs and database relationships consistent across the entire project.', status: 'enforced' },
        { id: 11, text: 'Use TypeScript for frontend and Node.js backend.', status: 'enforced' },
        { id: 12, text: 'Use proper validation, error handling and authentication.', status: 'enforced' },
        { id: 13, text: 'Never expose API keys in frontend code.', status: 'enforced' },
        { id: 14, text: 'Build the system so that it can later be integrated and tested in Antigravity.', status: 'enforced' },
      ],
      modules: [
        { name: 'auth', path: '/api/auth', status: 'ready' },
        { name: 'skills', path: '/api/skills', status: 'ready' },
        { name: 'assessment', path: '/api/assessment', status: 'ready' },
        { name: 'careers', path: '/api/careers', status: 'ready' },
        { name: 'skill-gap', path: '/api/skill-gap', status: 'ready' },
        { name: 'roadmap', path: '/api/roadmap', status: 'ready' },
        { name: 'resources', path: '/api/resources', status: 'ready' },
        { name: 'progress', path: '/api/progress', status: 'ready' },
      ],
    });
  });

  // Mount Modular Monolith Domain Routers
  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/assessment', assessmentRouter);
  app.use('/api/careers', careersRouter);
  app.use('/api/skill-gap', skillGapRouter);
  app.use('/api/roadmap', roadmapRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api/progress', progressRouter);

  // Global Error Handler
  app.use(errorHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkillUp AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
