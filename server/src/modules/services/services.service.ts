import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { provisioningQueue } from '../../queue/index.js';
import { logAction } from '../audit/audit.service.js';
import { GitHubIntegrator } from '../cicd/github-client.js';
import { GitHubInstallationNotFoundError } from '../cicd/github-app-auth.js';
import type { CreateServiceInput } from './services.schema.js';

interface ServiceRow {
  id: string;
  name: string;
  owner_id: string;
  team_id?: string | null;
  template_id: string;
  template_name?: string | null;
  status: string;
  region: string;
  environment: string;
  repository_url: string | null;
  service_endpoint: string | null;
  compute_mode: 'fargate' | 'ec2';
  ec2_instance_type: string | null;
  requested_vcpu: number;
  requested_memory_gib: number;
  workload_profile: 'bursty' | 'balanced' | 'compute' | 'memory';
  expected_duration_hours: number;
  infrastructure_started_at: Date | null;
  infrastructure_decommissioned_at: Date | null;
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
    templateId: s.template_id,
    templateName: s.template_name ?? null,
    status: s.status,
    region: s.region,
    environment: s.environment,
    repositoryUrl: s.repository_url,
    serviceEndpoint: s.service_endpoint,
    computeMode: s.compute_mode ?? 'fargate',
    ec2InstanceType: s.ec2_instance_type ?? null,
    requestedVcpu: Number(s.requested_vcpu ?? 0.5),
    requestedMemoryGiB: Number(s.requested_memory_gib ?? 1),
    workloadProfile: s.workload_profile ?? 'bursty',
    expectedDurationHours: Number(s.expected_duration_hours ?? 24),
    infrastructureStartedAt: s.infrastructure_started_at,
    infrastructureDecommissionedAt: s.infrastructure_decommissioned_at,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

/**
 * Create a new service and enqueue a provisioning job.
 *
 * Flow: validate input → check duplicate name per owner → create service record
 * (status: pending) → create provisioning_job (status: queued) → enqueue
 * to BullMQ → respond 202 Accepted
 */
export async function createService(
  input: CreateServiceInput,
  userId: string,
) {
  const computeMode = input.computeMode ?? 'fargate';
  const requestedVcpu = input.requestedVcpu ?? 0.5;
  const requestedMemoryGiB = input.requestedMemoryGiB ?? 1;
  const workloadProfile = input.workloadProfile ?? 'bursty';
  const environment = input.environment ?? 'development';

  const repository = await new GitHubIntegrator().getRepositoryMetadata(input.repositoryUrl);

  // Verify template exists
  const template = await query(
    'SELECT id, terraform_module_path, template_type FROM service_templates WHERE id = $1 AND is_active = true',
    [input.templateId],
  );
  if (!template.rowCount || template.rowCount === 0) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Service template not found or inactive');
  }

  // Check duplicate service name for this account.
  const existing = await query(
    'SELECT id FROM services WHERE name = $1 AND owner_id = $2',
    [input.name, userId],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'SERVICE_EXISTS', 'A service with this name already exists in your team');
  }

  // Create service record (status: pending)
  const serviceResult = await query<ServiceRow>(
    `INSERT INTO services
       (name, owner_id, team_id, template_id, status, region, environment,
        compute_mode, ec2_instance_type, requested_vcpu, requested_memory_gib, workload_profile,
          repository_url, expected_duration_hours)
       VALUES ($1, $2, NULL, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.name,
      userId,
      input.templateId,
      input.region,
      environment,
      computeMode,
      input.ec2InstanceType ?? null,
      requestedVcpu,
      requestedMemoryGiB,
      workloadProfile,
      repository.htmlUrl,
      input.expectedDurationHours,
    ],
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
    templateType: template.rows[0].template_type,
    terraformModulePath: template.rows[0].terraform_module_path,
    repositoryUrl: repository.htmlUrl,
    region: input.region,
    environment: input.environment,
    computeMode,
    ec2InstanceType: input.ec2InstanceType,
    requestedVcpu,
    requestedMemoryGiB,
    workloadProfile,
    expectedDurationHours: input.expectedDurationHours,
    ownerId: userId,
    triggeredBy: userId,
  }, { jobId: job.id });

  // Audit log
  await logAction({
    actorId: userId,
    action: 'service.create',
    resourceType: 'service',
    resourceId: service.id,
    payload: {
      name: input.name,
      templateId: input.templateId,
      region: input.region,
      environment,
      computeMode,
      ec2InstanceType: input.ec2InstanceType,
      requestedVcpu,
      requestedMemoryGiB,
      workloadProfile,
      repositoryUrl: repository.htmlUrl,
      expectedDurationHours: input.expectedDurationHours,
    },
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
 * Get all services owned by the account.
 */
export async function getAllServices(ownerId: string) {
  const result = await query<ServiceRow>(
    `SELECT s.*, st.name AS template_name
     FROM services s
     LEFT JOIN service_templates st ON st.id = s.template_id
     WHERE s.owner_id = $1
     ORDER BY s.created_at DESC`,
    [ownerId],
  );
  return result.rows.map(formatService);
}

export async function validateGitHubRepository(repositoryUrl: string) {
  let repository;
  try {
    repository = await new GitHubIntegrator().getRepositoryMetadata(repositoryUrl);
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error
      ? error.status
      : undefined;
    if (error instanceof GitHubInstallationNotFoundError) {
      throw new AppError(
        422,
        'GITHUB_APP_NOT_INSTALLED',
        'Install the SCAPE GitHub App on this repository owner or organization, then verify the URL again.',
      );
    }
    if (status === 403 || status === 404) {
      throw new AppError(
        422,
        'GITHUB_REPOSITORY_UNAVAILABLE',
        'SCAPE cannot access this repository. Install the SCAPE GitHub App on it, then verify the URL again.',
      );
    }
    throw error;
  }

  return {
    htmlUrl: repository.htmlUrl,
    fullName: repository.fullName,
  };
}

/**
 * Get a service by ID, scoped to its owner.
 */
export async function getServiceById(serviceId: string, ownerId: string) {
  const result = await query<ServiceRow>(
    `SELECT s.*, st.name AS template_name
     FROM services s
     LEFT JOIN service_templates st ON st.id = s.template_id
     WHERE s.id = $1 AND s.owner_id = $2`,
    [serviceId, ownerId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }

  return formatService(result.rows[0]);
}

/** Check a provisioned endpoint without following redirects or arbitrary URLs. */
export async function getServiceHealth(serviceId: string, ownerId: string) {
  const service = await getServiceById(serviceId, ownerId);
  const checkedAt = new Date().toISOString();

  if (service.status !== 'active' || !service.serviceEndpoint) {
    return { status: 'unknown' as const, checkedAt, latencyMs: null, statusCode: null };
  }

  let target: URL;
  try {
    target = new URL(service.serviceEndpoint);
  } catch {
    return { status: 'unknown' as const, checkedAt, latencyMs: null, statusCode: null };
  }

  const isAlb = target.hostname.endsWith('.elb.amazonaws.com') || target.hostname.includes('.elb.') && target.hostname.endsWith('.amazonaws.com');
  const isCloudFront = target.hostname.endsWith('.cloudfront.net');
  if (!['http:', 'https:'].includes(target.protocol) || (!isAlb && !isCloudFront)) {
    return { status: 'unknown' as const, checkedAt, latencyMs: null, statusCode: null };
  }

  const isStatic = service.templateName?.toLowerCase().includes('static') ?? false;
  target.pathname = isStatic ? '/' : '/health';
  target.search = '';
  target.hash = '';

  const startedAt = Date.now();
  try {
    const response = await fetch(target, {
      method: isStatic ? 'HEAD' : 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    await response.body?.cancel();
    return {
      status: response.status >= 200 && response.status < 400 ? 'healthy' as const : 'unhealthy' as const,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      statusCode: response.status,
    };
  } catch {
    return {
      status: 'unhealthy' as const,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      statusCode: null,
    };
  }
}

/**
 * Delete (decommission) a service.
 */
export async function deleteService(serviceId: string, userId: string) {
  const service = await getServiceById(serviceId, userId);

  if (service.status === 'decommissioned') {
    throw new AppError(409, 'ALREADY_DECOMMISSIONED', 'Service is already decommissioned');
  }
  if (service.status === 'decommissioning') {
    throw new AppError(409, 'DECOMMISSION_IN_PROGRESS', 'Service decommissioning is already in progress');
  }
  if (service.status === 'pending' || service.status === 'provisioning') {
    throw new AppError(409, 'PROVISIONING_IN_PROGRESS', 'Wait for provisioning to finish before decommissioning this service');
  }

  const template = await query<{ terraform_module_path: string }>(
    'SELECT terraform_module_path FROM service_templates WHERE id = $1',
    [service.templateId],
  );
  if (!template.rowCount) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'The service template is no longer available');
  }

  const jobResult = await query<JobRow>(
    `INSERT INTO provisioning_jobs (service_id, triggered_by, status, terraform_workspace)
     VALUES ($1, $2, 'queued', $3) RETURNING *`,
    [service.id, userId, service.id],
  );
  const job = jobResult.rows[0];

  await provisioningQueue.add('decommission', {
    jobId: job.id,
    serviceId: service.id,
    serviceName: service.name,
    templateId: service.templateId,
    terraformModulePath: template.rows[0].terraform_module_path,
    region: service.region,
    environment: service.environment,
    ownerId: userId,
    triggeredBy: userId,
    repositoryUrl: service.repositoryUrl,
  }, { jobId: `decommission-${job.id}` });

  await query(
    `UPDATE services SET status = 'decommissioning', updated_at = NOW() WHERE id = $1`,
    [serviceId],
  );

  // Audit log
  await logAction({
    actorId: userId,
    action: 'service.decommission_requested',
    resourceType: 'service',
    resourceId: serviceId,
    payload: { previousStatus: service.status, jobId: job.id },
  });

  return {
    message: 'Service decommissioning has been queued',
    serviceId,
    jobId: job.id,
    status: 'decommissioning',
  };
}
