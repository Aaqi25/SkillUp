import { Response } from 'express';
import { ApiResponse } from '../types.js';

export function sendSuccess<T>(res: Response, data: T, moduleName: string, statusCode = 200) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      module: moduleName,
    },
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: unknown,
  moduleName = 'core'
) {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      module: moduleName,
    },
  };
  return res.status(statusCode).json(payload);
}
