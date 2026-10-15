import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Custom application error with HTTP status code.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || undefined;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, correlationId, code: err.code }, 'Server error in request');
    } else {
      logger.warn({ correlationId, code: err.code, statusCode: err.statusCode, message: err.message }, 'Client error in request');
    }

    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Unexpected errors
  logger.error({ err, correlationId }, 'Unhandled server error');
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

