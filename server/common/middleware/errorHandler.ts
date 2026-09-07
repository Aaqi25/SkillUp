import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export function errorHandler(
  err: Error & { statusCode?: number; code?: string; details?: unknown },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred';

  console.error(`[Error] [${req.method} ${req.url}]`, err);

  return sendError(res, message, statusCode, errorCode, err.details, 'server');
}
