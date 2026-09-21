import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { provisioningQueue } from '../../queue/index.js';
import { logAction } from '../audit/audit.service.js';
import type { CreateServiceInput } from './services.schema.js';

interface ServiceRow {
  id: string;
  name: string;
  owner_id: string;
  team_id: string;
  template_id: string;
  status: string;
  region: string;
  repository_url: string | null;
  created_at: Date;
  updated_at: Date;
}

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

function formatService(s: ServiceRow) {
  return {
    id: s.id,
    name: s.name,
    ownerId: s.owner_id,
    teamId: s.team_id,
    templateId: s.template_id,
    status: s.status,
    region: s.region,
    repositoryUrl: s.repository_url,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

/**
 * Create a new service and enqueue a provisioning job.
 *
 * Flow: validate input → check duplicate name per team → create service record
 * (status: pending) → create provisioning_job (status: queued) → enqueue
 * to BullMQ → respond 202 Accepted
 */
export async function createService(
  input: CreateServiceInput,
  userId: string,
  teamId: string,
) {
  // Verify user has a team
  if (!teamId) {
    throw new AppError(422, 'NO_TEAM', 'You must belong to a team to create a service');
  }

  // Verify template exists
  const template = await query(
    'SELECT id, terraform_module_path FROM service_templates WHERE id = $1 AND is_active = true',
    [input.templateId],
  );
  if (!template.rowCount || template.rowCount === 0) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Service template not found or inactive');
  }

  // Check duplicate service name per team
  const existing = await query(
    'SELECT id FROM services WHERE name = $1 AND team_id = $2',
    [input.name, teamId],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'SERVICE_EXISTS', 'A service with this name already exists in your team');
  }

  // Create service record (status: pending)
  const serviceResult = await query<ServiceRow>(
    `INSERT INTO services (name, owner_id, team_id, template_id, status, region)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [input.name, userId, teamId, input.templateId, input.region],
  );
  const service = serviceResult.rows[0];

  // Create provisioning job (status: queued)
  const jobResult = await query<JobRow>(
    `INSERT INTO provisioning_jobs (service_id, triggered_by, status, terraform_workspace)
     VALUES ($1, $2, 'queued', $3)
     RETURNING *`,
    [service.id, userId, service.id],
  );
  const job = jobResult.rows[0];

  // Enqueue the provisioning job to BullMQ
  await provisioningQueue.add('provision', {
    jobId: job.id,
    serviceId: service.id,
    serviceName: service.name,
    templateId: input.templateId,
    terraformModulePath: template.rows[0].terraform_module_path,
    region: input.region,
    teamId,
    triggeredBy: userId,
  });

  // Audit log
  await logAction({
    actorId: userId,
    action: 'service.create',
    resourceType: 'service',
    resourceId: service.id,
    payload: { name: input.name, templateId: input.templateId, region: input.region },
  });

  return {
    service: formatService(service),
    job: {
      id: job.id,
      status: job.status,
      createdAt: job.created_at,
    },
  };
}

/**
 * Get all services for the user's team.
 */
export async function getAllServices(teamId: string, userRole: string) {
  let result;

  if (userRole === 'admin') {
    // Admins can see all services
    result = await query<ServiceRow>(
      `SELECT * FROM services ORDER BY created_at DESC`,
    );
  } else {
    // Regular users only see services from their team
    result = await query<ServiceRow>(
      `SELECT * FROM services WHERE team_id = $1 ORDER BY created_at DESC`,
      [teamId],
    );
  }

  return result.rows.map(formatService);
}

/**
 * Get a service by ID with team ownership check.
 */
export async function getServiceById(serviceId: string, teamId: string, userRole: string) {
  const result = await query<ServiceRow>(
    'SELECT * FROM services WHERE id = $1',
    [serviceId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }

  const service = result.rows[0];

  // Enforce team ownership (admin bypasses)
  if (userRole !== 'admin' && service.team_id !== teamId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this service');
  }

  return formatService(service);
}

/**
 * Delete (decommission) a service.
 */
export async function deleteService(serviceId: string, userId: string, teamId: string, userRole: string) {
  const service = await getServiceById(serviceId, teamId, userRole);

  if (service.status === 'decommissioned') {
    throw new AppError(409, 'ALREADY_DECOMMISSIONED', 'Service is already decommissioned');
  }

  await query(
    `UPDATE services SET status = 'decommissioned', updated_at = NOW() WHERE id = $1`,
    [serviceId],
  );

  // Audit log
  await logAction({
    actorId: userId,
    action: 'service.delete',
    resourceType: 'service',
    resourceId: serviceId,
    payload: { previousStatus: service.status },
  });

  return { message: 'Service decommissioned successfully' };
}
