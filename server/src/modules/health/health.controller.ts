import { Request, Response } from 'express';
import { pool, query } from '../../database/index.js';
import { redisConnection } from '../../queue/index.js';
import { logger } from '../../utils/logger.js';

const SERVER_START_TIME = Date.now();

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

/**
 * GET /health/metrics  (authenticated)
 * Extended platform health metrics for the dashboard.
 * Returns live counts, uptime, queue status, and recent activity.
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  const uptimeMs = Date.now() - SERVER_START_TIME;
  const ownerId = req.user!.userId;

  const [
    servicesRes,
    activeServicesRes,
    pendingServicesRes,
    failedServicesRes,
    deploymentsRes,
    recentDeploymentsRes,
    activeJobsRes,
    costTotalRes,
    queueHealth,
  ] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM services WHERE owner_id = $1', [ownerId]),
    query("SELECT COUNT(*) AS total FROM services WHERE owner_id = $1 AND status = 'active'", [ownerId]),
    query("SELECT COUNT(*) AS total FROM services WHERE owner_id = $1 AND status IN ('pending','provisioning')", [ownerId]),
    query("SELECT COUNT(*) AS total FROM services WHERE owner_id = $1 AND status = 'failed'", [ownerId]),
    query(
      `SELECT COUNT(*) AS total FROM deployments d
       JOIN services s ON s.id = d.service_id WHERE s.owner_id = $1`,
      [ownerId],
    ),
    query(
      `SELECT d.id, d.status, d.branch, d.commit_sha, d.started_at, d.completed_at, s.name AS service_name
       FROM deployments d
       JOIN services s ON s.id = d.service_id
       WHERE s.owner_id = $1
       ORDER BY d.created_at DESC
       LIMIT 10`,
      [ownerId],
    ),
    query(
      `SELECT COUNT(*) AS total FROM provisioning_jobs j
       JOIN services s ON s.id = j.service_id
       WHERE s.owner_id = $1 AND j.status IN ('queued','running')`,
      [ownerId],
    ),
    query(
      `SELECT COUNT(*) AS count, SUM(c.amount_usd) AS total FROM cost_records c
       JOIN services s ON s.id = c.service_id WHERE s.owner_id = $1`,
      [ownerId],
    ),
    redisConnection.ping(),
  ]);

  const get = (result: { rows: Array<Record<string, unknown>> }, field = 'total') =>
    Number(result.rows[0][field]);
  const recentDeployments = recentDeploymentsRes.rows.map((d: any) => ({
    id: d.id,
    status: d.status,
    branch: d.branch,
    commitSha: d.commit_sha,
    serviceName: d.service_name,
    startedAt: d.started_at,
    completedAt: d.completed_at,
    durationMs:
      d.started_at && d.completed_at
        ? new Date(d.completed_at).getTime() - new Date(d.started_at).getTime()
        : null,
  }));

  const successRateRes = await query<{ status: string; cnt: string }>(
    `SELECT status, COUNT(*) AS cnt
     FROM (
       SELECT d.status FROM deployments d
       JOIN services s ON s.id = d.service_id
       WHERE s.owner_id = $1
       ORDER BY d.created_at DESC LIMIT 20
     ) sub
     GROUP BY status`,
    [ownerId],
  );

  const statusCounts: Record<string, number> = {};
  for (const row of successRateRes.rows) {
    statusCounts[row.status] = Number(row.cnt);
  }
  const totalRecent = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const successRate = totalRecent > 0
    ? Math.round(((statusCounts['succeeded'] || 0) / totalRecent) * 100)
    : null;
  const queueHealthy = queueHealth === 'PONG';

  res.json({
    status: queueHealthy ? 'healthy' : 'degraded',
    uptimeMs,
    uptimeFormatted: formatUptime(uptimeMs),
    timestamp: new Date().toISOString(),
    platform: {
      services: {
        total: get(servicesRes),
        active: get(activeServicesRes),
        pending: get(pendingServicesRes),
        failed: get(failedServicesRes),
      },
      deployments: {
        total: get(deploymentsRes),
        activeJobs: get(activeJobsRes),
        successRate,
        recentDeployments,
      },
      cost: {
        totalSpendUsd: get(costTotalRes, 'count') > 0
          ? parseFloat(Number(get(costTotalRes, 'total')).toFixed(2))
          : null,
      },
      infrastructure: {
        database: 'healthy',
        api: 'healthy',
        provisioningQueue: queueHealthy ? 'operational' : 'unreachable',
        costSync: 'scheduled',
      },
    },
  });
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

/**
 * GET /metrics
 * Prometheus text exposition format (version 0.0.4) for scraper integration.
 * Spec: 05-Backend-API, 11-Testing-and-Deployment, 14-Forge-Master-Instructions.
 */
export async function getPrometheusMetrics(_req: Request, res: Response): Promise<void> {
  const uptimeSeconds = (Date.now() - SERVER_START_TIME) / 1000;
  const lines = [
    '# HELP scape_uptime_seconds Total time the server has been running in seconds',
    '# TYPE scape_uptime_seconds gauge',
    `scape_uptime_seconds ${uptimeSeconds.toFixed(2)}`,
    '',
  ];
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n'));
}

