import { Request, Response } from 'express';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

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
 * Readiness check — verifies database connectivity.
 */
export async function getReady(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, string> = {};

  // Check PostgreSQL
  try {
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: database unreachable');
    checks.database = 'unreachable';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
