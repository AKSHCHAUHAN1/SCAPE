import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per user

/**
 * Simple in-memory rate limiter.
 * Limits to MAX_REQUESTS per WINDOW_MS per user (or IP for unauthenticated).
 *
 * Note: Replace with Redis-backed limiter for multi-instance deployments.
 */
export function rateLimiter(req: Request, _res: Response, next: NextFunction): void {
  const key = req.user?.userId || req.ip || 'unknown';
  const now = Date.now();

  const record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_REQUESTS) {
    throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
  }

  record.count++;
  next();
}
