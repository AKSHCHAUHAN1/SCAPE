import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { provisioningQueue } from '../../queue/index.js';
import { logAction } from '../audit/audit.service.js';
import { getServiceById } from '../services/services.service.js';

interface JobRow {
  id: string;
  service_id: string;
  triggered_by: string;
  status: string;
  terraform_workspace: string | null;
  terraform_run_id: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

/**
 * Get all jobs for a specific service.
 */
export async function getJobsByServiceId(serviceId: string, teamId: string, userRole: string) {
  // Check if user has access to this service
  await getServiceById(serviceId, teamId, userRole);

  const result = await query<JobRow>(
    `SELECT * FROM provisioning_jobs WHERE service_id = $1 ORDER BY created_at DESC`,
    [serviceId],
  );

  return result.rows;
}

/**
 * Get a specific job by ID.
 */
export async function getJobById(jobId: string, teamId: string, userRole: string) {
  const result = await query<JobRow>(
    `SELECT * FROM provisioning_jobs WHERE id = $1`,
    [jobId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'JOB_NOT_FOUND', 'Provisioning job not found');
  }

  const job = result.rows[0];

  // Verify access via service
  await getServiceById(job.service_id, teamId, userRole);

  return job;
}

/**
 * Retry a failed job.
 */
export async function retryJob(jobId: string, userId: string, teamId: string, userRole: string) {
  const job = await getJobById(jobId, teamId, userRole);

  if (job.status === 'queued' || job.status === 'running') {
    throw new AppError(409, 'JOB_NOT_FAILED', 'Only failed jobs can be retried');
  }

  // Ensure service exists
  const service = await getServiceById(job.service_id, teamId, userRole);
  
  // Get template path
  const templateResult = await query(
    'SELECT terraform_module_path FROM service_templates WHERE id = $1',
    [service.templateId]
  );

  // Update job status
  const updateResult = await query<JobRow>(
    `UPDATE provisioning_jobs 
     SET status = 'queued', error_message = NULL, started_at = NULL, completed_at = NULL
     WHERE id = $1
     RETURNING *`,
    [job.id],
  );

  // Enqueue job again
  await provisioningQueue.add('provision', {
    jobId: job.id,
    serviceId: service.id,
    serviceName: service.name,
    templateId: service.templateId,
    terraformModulePath: templateResult.rows[0].terraform_module_path,
    region: service.region,
    teamId: service.teamId,
    triggeredBy: userId,
  });

  await logAction({
    actorId: userId,
    action: 'job.retry',
    resourceType: 'provisioning_job',
    resourceId: job.id,
  });

  return updateResult.rows[0];
}
