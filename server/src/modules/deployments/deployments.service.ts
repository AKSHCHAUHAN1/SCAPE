import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getServiceById } from '../services/services.service.js';
import { logAction } from '../audit/audit.service.js';
import type { CreateDeploymentInput, UpdateDeploymentInput } from './deployments.schema.js';

interface DeploymentRow {
  id: string;
  service_id: string;
  triggered_by: string;
  github_run_id: string | null;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  commit_sha: string | null;
  branch: string;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

function formatDeployment(row: DeploymentRow) {
  return {
    id: row.id,
    serviceId: row.service_id,
    triggeredBy: row.triggered_by,
    githubRunId: row.github_run_id,
    status: row.status,
    commitSha: row.commit_sha,
    branch: row.branch,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

/**
 * Trigger / record a deployment for a service.
 */
export async function createDeployment(
  input: CreateDeploymentInput,
  userId: string,
  teamId: string,
  userRole: string,
) {
  // Validate service exists and user has access
  const service = await getServiceById(input.serviceId, teamId, userRole);

  const result = await query<DeploymentRow>(
    `INSERT INTO deployments (service_id, triggered_by, github_run_id, status, commit_sha, branch, started_at)
     VALUES ($1, $2, $3, 'running', $4, $5, NOW())
     RETURNING *`,
    [
      service.id,
      userId,
      input.githubRunId || null,
      input.commitSha || 'main',
      input.branch || 'main',
    ],
  );

  const deployment = result.rows[0];

  await logAction({
    actorId: userId,
    action: 'deployment.trigger',
    resourceType: 'deployment',
    resourceId: deployment.id,
    payload: { serviceId: service.id, branch: input.branch, commitSha: input.commitSha },
  });

  return formatDeployment(deployment);
}

/**
 * List deployments for a given service.
 */
export async function getDeploymentsByServiceId(
  serviceId: string,
  teamId: string,
  userRole: string,
) {
  // Ensure access
  await getServiceById(serviceId, teamId, userRole);

  const result = await query<DeploymentRow>(
    `SELECT * FROM deployments WHERE service_id = $1 ORDER BY created_at DESC`,
    [serviceId],
  );

  return result.rows.map(formatDeployment);
}

/**
 * Get deployment by ID.
 */
export async function getDeploymentById(
  deploymentId: string,
  teamId: string,
  userRole: string,
) {
  const result = await query<DeploymentRow>(
    `SELECT * FROM deployments WHERE id = $1`,
    [deploymentId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found');
  }

  const deployment = result.rows[0];
  // Verify access to service
  await getServiceById(deployment.service_id, teamId, userRole);

  return formatDeployment(deployment);
}

/**
 * Update deployment status (e.g. from GitHub webhook or CI callback).
 */
export async function updateDeployment(
  deploymentId: string,
  input: UpdateDeploymentInput,
) {
  const fields = ['status = $2'];
  const values: any[] = [deploymentId, input.status];
  let idx = 3;

  if (input.githubRunId) {
    fields.push(`github_run_id = $${idx++}`);
    values.push(input.githubRunId);
  }
  if (input.commitSha) {
    fields.push(`commit_sha = $${idx++}`);
    values.push(input.commitSha);
  }
  if (input.status === 'succeeded' || input.status === 'failed') {
    fields.push(`completed_at = NOW()`);
  }

  const result = await query<DeploymentRow>(
    `UPDATE deployments SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    values,
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found');
  }

  return formatDeployment(result.rows[0]);
}
