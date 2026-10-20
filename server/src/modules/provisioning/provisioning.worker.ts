/**
 * Provisioning Worker
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * BullMQ worker that consumes provisioning jobs from the queue and
 * orchestrates the full lifecycle:
 *
 * 1. Assume IAM Role via STS (short-lived credentials)
 * 2. Generate per-service Terraform environment
 * 3. Run Terraform Apply with timeout enforcement
 * 4. On success → update DB, trigger CI/CD integration
 * 5. On failure → coordinate rollback via RollbackCoordinator
 * 6. Persist sanitised logs to provisioning_jobs table
 *
 * ADR-016: CLI runner over Terraform Cloud API
 * ADR-017: One workspace per service for state isolation
 */

import { Worker, Job } from 'bullmq';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { redisConnection } from '../../queue/index.js';
import { query } from '../../database/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';
import { TerraformRunner } from './terraform-runner.js';
import { executeRollback } from './rollback-coordinator.js';
import { cleanupEnvironment, generateEnvironment } from './environment-generator.js';
import { getStateBackendConfig } from './state-manager.js';
import { sanitizeTerraformLogs } from './log-sanitizer.js';
import { CicdIntegrator } from '../cicd/cicd-integrator.js';
import { GitHubIntegrator } from '../cicd/github-client.js';
import type { ProvisioningJobData } from './types.js';
import { APPLY_TIMEOUT_MS, DESTROY_TIMEOUT_MS } from './types.js';

const stsClient = new STSClient({ region: config.aws.region });

// ---------------------------------------------------------------------------
// Job Status Helpers
// ---------------------------------------------------------------------------

async function updateJobStatus(
  jobId: string,
  status: string,
  extra?: {
    errorMessage?: string;
    terraformLogs?: string;
    terraformPlanOutput?: string;
    timeoutAt?: Date;
  },
) {
  const fields = ['status = $2'];
  const values: unknown[] = [jobId, status];
  let idx = 3;

  if (status === 'running') {
    fields.push('started_at = NOW()');
  } else if (['succeeded', 'failed', 'rolled_back', 'manual_intervention_required'].includes(status)) {
    fields.push('completed_at = NOW()');
  }

  if (extra?.errorMessage !== undefined) {
    fields.push(`error_message = $${idx++}`);
    values.push(extra.errorMessage);
  }

  if (extra?.terraformLogs !== undefined) {
    fields.push(`terraform_logs = $${idx++}`);
    values.push(extra.terraformLogs);
  }

  if (extra?.terraformPlanOutput !== undefined) {
    fields.push(`terraform_plan_output = $${idx++}`);
    values.push(extra.terraformPlanOutput);
  }

  if (extra?.timeoutAt !== undefined) {
    fields.push(`timeout_at = $${idx++}`);
    values.push(extra.timeoutAt);
  }

  await query(
    `UPDATE provisioning_jobs SET ${fields.join(', ')} WHERE id = $1`,
    values,
  );
}

async function updateServiceStatus(
  serviceId: string,
  status: string,
  repositoryUrl?: string,
  serviceEndpoint?: string,
) {
  let q = 'UPDATE services SET status = $2, updated_at = NOW()';
  const values: unknown[] = [serviceId, status];
  let nextParam = 3;

  if (repositoryUrl) {
    q += `, repository_url = $${nextParam++}`;
    values.push(repositoryUrl);
  }
  if (serviceEndpoint) {
    q += `, service_endpoint = $${nextParam++}`;
    values.push(serviceEndpoint);
  }

  q += ' WHERE id = $1';
  await query(q, values);
}

// ---------------------------------------------------------------------------
// STS Credential Helper
// ---------------------------------------------------------------------------

async function assumeProvisioningRole(serviceId: string, teamId: string) {
  const command = new AssumeRoleCommand({
    RoleArn: config.aws.provisioningRoleArn,
    RoleSessionName: `scape-provision-${serviceId.slice(0, 20)}`,
    DurationSeconds: 3600, // 1 hour
    ExternalId: `scape-service-${serviceId}`,
    Tags: [
      { Key: 'forge:service-id', Value: serviceId },
      { Key: 'forge:team-id', Value: teamId },
    ],
  });

  const response = await stsClient.send(command);

  if (!response.Credentials) {
    throw new Error('Failed to assume role: No credentials returned');
  }

  return {
    AWS_ACCESS_KEY_ID: response.Credentials.AccessKeyId,
    AWS_SECRET_ACCESS_KEY: response.Credentials.SecretAccessKey,
    AWS_SESSION_TOKEN: response.Credentials.SessionToken,
  };
}

// ---------------------------------------------------------------------------
// Worker Definition
// ---------------------------------------------------------------------------

async function processDecommissionJob(job: Job<ProvisioningJobData>) {
  const { jobId, serviceId, serviceName, repositoryUrl, triggeredBy } = job.data;
  logger.info({ jobId, serviceId }, 'Starting service decommission job');
  await updateJobStatus(jobId, 'running');
  await updateServiceStatus(serviceId, 'decommissioning');

  try {
    const awsEnv: NodeJS.ProcessEnv = config.aws.provisioningRoleArn
      ? (await assumeProvisioningRole(serviceId, job.data.teamId)) as unknown as NodeJS.ProcessEnv
      : {};
    const runner = new TerraformRunner(`terraform/environments/${serviceId}`);
    const result = await runner.destroy(serviceId, awsEnv, { timeoutMs: DESTROY_TIMEOUT_MS });
    const sanitizedLogs = result.logs ? sanitizeTerraformLogs(result.logs) : undefined;

    if (!result.success) {
      throw new Error(result.error || 'Terraform destroy failed');
    }

    if (repositoryUrl) {
      await new GitHubIntegrator().archiveRepository(repositoryUrl);
    }
    await cleanupEnvironment(serviceId);
    await updateJobStatus(jobId, 'succeeded', { terraformLogs: sanitizedLogs });
    await updateServiceStatus(serviceId, 'decommissioned');
    await logAction({
      actorId: triggeredBy,
      action: 'service.decommissioned',
      resourceType: 'service',
      resourceId: serviceId,
      payload: { serviceName, durationMs: result.durationMs },
    });
    logger.info({ jobId, serviceId }, 'Service decommission completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Service decommission failed';
    await updateJobStatus(jobId, 'failed', { errorMessage: message });
    await updateServiceStatus(serviceId, 'failed');
    await logAction({
      actorId: triggeredBy,
      action: 'service.decommission_failed',
      resourceType: 'service',
      resourceId: serviceId,
      payload: { error: message },
    });
    logger.error({ err: message, jobId, serviceId }, 'Service decommission failed');
    throw err;
  }
}

export async function processProvisioningJob(job: Job<ProvisioningJobData>) {
  if (job.name === 'decommission') return processDecommissionJob(job);

  const {
      jobId,
      serviceId,
      serviceName,
      templateId,
      terraformModulePath,
      region,
      environment = config.nodeEnv,
      teamId,
      triggeredBy,
    } = job.data;

    logger.info({ jobId, serviceId, serviceName }, 'Starting provisioning job');

    // Calculate timeout deadline
    const timeoutAt = new Date(Date.now() + APPLY_TIMEOUT_MS);

    await updateJobStatus(jobId, 'running', { timeoutAt });
    await updateServiceStatus(serviceId, 'provisioning');

    try {
      const templateType = terraformModulePath.includes('static-frontend')
        ? 'static-frontend'
        : 'nodejs-api';
      const github = new GitHubIntegrator();
      const sourceRepository = await github.createRepositoryFromTemplate({
        serviceId,
        serviceName,
        templateType,
      });
      await updateServiceStatus(serviceId, 'provisioning', sourceRepository.htmlUrl);

      // ── 1. Assume IAM Role ──
      const awsEnv: NodeJS.ProcessEnv = config.aws.provisioningRoleArn
        ? (await assumeProvisioningRole(serviceId, teamId)) as unknown as NodeJS.ProcessEnv
        : {};

      // ── 2. Generate per-service environment directory ──
      const stateBackend = getStateBackendConfig(serviceId);
      const envDir = await generateEnvironment({
        serviceId,
        serviceName,
        modulePath: terraformModulePath,
        region,
        environment,
        ownerTeam: teamId,
        githubRepository: sourceRepository.fullName,
        tags: {
          'forge:service-id': serviceId,
          'forge:team-id': teamId,
          'forge:template-id': templateId,
          Environment: environment,
          ManagedBy: 'scape',
        },
        stateBackend,
      });

      logger.debug({ envDir, serviceId }, 'Generated environment directory');

      // ── 3. Initialize Terraform Runner ──
      // Point runner at the generated environment directory
      const runner = new TerraformRunner(
        `terraform/environments/${serviceId}`,
      );

      // ── 4. Prepare variables ──
      const variables = {
        service_name: serviceName,
        service_id: serviceId,
        region,
        environment,
        owner_team: teamId,
        tags: {
          'forge:service-id': serviceId,
          'forge:team-id': teamId,
          'forge:template-id': templateId,
          Environment: environment,
          ManagedBy: 'scape',
        },
      };

      // ── 5. Run Terraform Apply ──
      const result = await runner.apply(serviceId, variables, awsEnv, {
        timeoutMs: APPLY_TIMEOUT_MS,
      });

      // Persist logs regardless of outcome
      const sanitizedLogs = result.logs
        ? sanitizeTerraformLogs(result.logs)
        : undefined;

      if (result.success) {
        // ── Apply succeeded ──
        const outputs = result.outputs || {};
        const repositoryUrl = sourceRepository.htmlUrl;
        const serviceEndpoint = outputs.service_endpoint?.value;

        // ── 6. CI/CD Integration ──
        const cicd = new CicdIntegrator();
        const integration = await cicd.integrate({
          serviceId,
          serviceName,
          templateId,
          templateType,
          repositoryUrl,
          region,
          terraformOutputs: outputs,
        });
        if (!integration.workflowCommitted || !integration.webhookRegistered) {
          const reason = integration.errors.join('; ') || 'GitHub workflow or webhook setup failed';
          await executeRollback({
            jobId,
            serviceId,
            workspace: serviceId,
            modulePath: `terraform/environments/${serviceId}`,
            awsEnv,
            applyError: reason,
            triggeredBy,
          });
          throw new Error(`CI/CD setup failed: ${reason}`);
        }

        await updateJobStatus(jobId, 'succeeded', { terraformLogs: sanitizedLogs });
        await updateServiceStatus(serviceId, 'active', repositoryUrl, serviceEndpoint);

        await logAction({
          actorId: triggeredBy,
          action: 'job.succeeded',
          resourceType: 'provisioning_job',
          resourceId: jobId,
          payload: { serviceEndpoint, durationMs: result.durationMs },
        });

        logger.info(
          { jobId, serviceId, serviceEndpoint, durationMs: result.durationMs },
          'Provisioning completed successfully',
        );
      } else {
        // ── Apply failed → initiate rollback ──
        logger.warn(
          { jobId, serviceId, error: result.error },
          'Provisioning failed, initiating rollback',
        );

        // Update logs before rollback
        await updateJobStatus(jobId, 'failed', {
          errorMessage: result.error,
          terraformLogs: sanitizedLogs,
        });

        await executeRollback({
          jobId,
          serviceId,
          workspace: serviceId,
          modulePath: `terraform/environments/${serviceId}`,
          awsEnv,
          applyError: result.error || 'Unknown apply error',
          triggeredBy,
        });

        throw new Error(`Provisioning failed: ${result.error}`);
      }
    } catch (err: any) {
      // Only update if not already updated by rollback coordinator
      const currentJob = await query(
        'SELECT status FROM provisioning_jobs WHERE id = $1',
        [jobId],
      );
      const currentStatus = currentJob.rows[0]?.status;

      if (currentStatus === 'running') {
        await updateJobStatus(jobId, 'failed', {
          errorMessage: err.message,
        });
        await updateServiceStatus(serviceId, 'failed');
      }

      logger.error({ err: err.message, jobId, serviceId }, 'Provisioning worker error');
      throw err;
    }
}

export const provisioningWorker = new Worker<ProvisioningJobData>(
  'provisioning',
  processProvisioningJob,
  {
    connection: redisConnection,
    concurrency: 5, // Run up to 5 Terraform jobs concurrently
  },
);

provisioningWorker.on('error', (err) => {
  logger.error({ err }, 'Provisioning worker error');
});
