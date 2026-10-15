import { Request, Response } from 'express';
import { pool, query } from '../../database/index.js';
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
export async function getMetrics(_req: Request, res: Response): Promise<void> {
  const uptimeMs = Date.now() - SERVER_START_TIME;

  // Parallel queries for platform stats
  const [
    servicesRes,
    activeServicesRes,
    pendingServicesRes,
    failedServicesRes,
    deploymentsRes,
    recentDeploymentsRes,
    activeJobsRes,
    costTotalRes,
    dbHealthRes,
  ] = await Promise.allSettled([
    query('SELECT COUNT(*) AS total FROM services'),
    query("SELECT COUNT(*) AS total FROM services WHERE status = 'active'"),
    query("SELECT COUNT(*) AS total FROM services WHERE status IN ('pending','provisioning')"),
    query("SELECT COUNT(*) AS total FROM services WHERE status = 'failed'"),
    query("SELECT COUNT(*) AS total FROM deployments"),
    query(
      `SELECT d.id, d.status, d.branch, d.commit_sha, d.started_at, d.completed_at, s.name AS service_name
       FROM deployments d
       JOIN services s ON s.id = d.service_id
       ORDER BY d.created_at DESC
       LIMIT 10`,
    ),
    query("SELECT COUNT(*) AS total FROM provisioning_jobs WHERE status IN ('queued','running')"),
    query('SELECT COALESCE(SUM(amount_usd), 0) AS total FROM cost_records'),
    pool.query('SELECT 1'),
  ]);

  const get = (result: PromiseSettledResult<any>, field = 'total') => {
    if (result.status === 'fulfilled') {
      const row = result.value?.rows?.[0];
      return row ? Number(row[field] ?? 0) : 0;
    }
    return 0;
  };

  const recentDeployments =
    recentDeploymentsRes.status === 'fulfilled'
      ? recentDeploymentsRes.value.rows.map((d: any) => ({
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
        }))
      : [];

  const dbOk = dbHealthRes.status === 'fulfilled';

  // Deployment success rate (last 20)
  const successRateRes = await query<{ status: string; cnt: string }>(
    `SELECT status, COUNT(*) AS cnt
     FROM (SELECT status FROM deployments ORDER BY created_at DESC LIMIT 20) sub
     GROUP BY status`,
  ).catch(() => ({ rows: [] as { status: string; cnt: string }[] }));

  const statusCounts: Record<string, number> = {};
  for (const row of successRateRes.rows) {
    statusCounts[row.status] = Number(row.cnt);
  }
  const totalRecent = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const successRate = totalRecent > 0 ? Math.round(((statusCounts['succeeded'] || 0) / totalRecent) * 100) : 100;

  res.json({
    status: dbOk ? 'healthy' : 'degraded',
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
        totalSpendUsd: parseFloat(Number(get(costTotalRes)).toFixed(2)),
      },
      infrastructure: {
        database: dbOk ? 'healthy' : 'unreachable',
        api: 'healthy',
        provisioningQueue: get(activeJobsRes) >= 0 ? 'operational' : 'unknown',
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

  try {
    const [servicesByStatus, jobsByStatus, deploymentsByStatus, costRes] = await Promise.allSettled([
      query<{ status: string; count: string }>('SELECT status, COUNT(*) AS count FROM services GROUP BY status'),
      query<{ status: string; count: string }>('SELECT status, COUNT(*) AS count FROM provisioning_jobs GROUP BY status'),
      query<{ status: string; count: string }>('SELECT status, COUNT(*) AS count FROM deployments GROUP BY status'),
      query<{ total: string }>('SELECT COALESCE(SUM(amount_usd), 0) AS total FROM cost_records'),
    ]);

    const lines: string[] = [
      '# HELP forge_uptime_seconds Total time the server has been running in seconds',
      '# TYPE forge_uptime_seconds gauge',
      `forge_uptime_seconds ${uptimeSeconds.toFixed(2)}`,
      '',
      '# HELP forge_services_total Total count of registered services by status',
      '# TYPE forge_services_total gauge',
    ];

    if (servicesByStatus.status === 'fulfilled') {
      for (const row of servicesByStatus.value.rows) {
        lines.push(`forge_services_total{status="${row.status}"} ${row.count}`);
      }
    }

    lines.push(
      '',
      '# HELP forge_provisioning_jobs_total Total count of provisioning jobs by status',
      '# TYPE forge_provisioning_jobs_total gauge',
    );
    if (jobsByStatus.status === 'fulfilled') {
      for (const row of jobsByStatus.value.rows) {
        lines.push(`forge_provisioning_jobs_total{status="${row.status}"} ${row.count}`);
      }
    }

    lines.push(
      '',
      '# HELP forge_deployments_total Total count of deployments by status',
      '# TYPE forge_deployments_total gauge',
    );
    if (deploymentsByStatus.status === 'fulfilled') {
      for (const row of deploymentsByStatus.value.rows) {
        lines.push(`forge_deployments_total{status="${row.status}"} ${row.count}`);
      }
    }

    lines.push(
      '',
      '# HELP forge_cost_total_usd Total aggregated cloud infrastructure spend in USD',
      '# TYPE forge_cost_total_usd gauge',
    );
    const totalCost = costRes.status === 'fulfilled' ? Number(costRes.value.rows[0]?.total ?? 0) : 0;
    lines.push(`forge_cost_total_usd ${totalCost.toFixed(2)}`, '');

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(lines.join('\n'));
  } catch (err) {
    logger.error({ err }, 'Error collecting prometheus metrics');
    res.status(500).send('# Error collecting metrics\n');
  }
}

