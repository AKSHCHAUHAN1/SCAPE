import { Request, Response } from 'express';

/**
 * GET /health
 * Basic liveness check.
 */
export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'scape-api',
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /health/ready
 * Readiness check — verifies database and Redis connectivity.
 * Expand as dependencies are added.
 */
export function getReady(_req: Request, res: Response): void {
  // TODO: Add DB and Redis ping checks in Sprint 1
  res.json({
    status: 'ok',
    checks: {
      database: 'not_configured',
      redis: 'not_configured',
    },
    timestamp: new Date().toISOString(),
  });
}
