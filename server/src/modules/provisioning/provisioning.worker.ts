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
import { generateEnvironment } from './environment-generator.js';
import { getStateBackendConfig } from './state-manager.js';
import { sanitizeTerraformLogs } from './log-sanitizer.js';
import { CicdIntegrator } from '../cicd/cicd-integrator.js';
import type { ProvisioningJobData } from './types.js';
import { APPLY_TIMEOUT_MS } from './types.js';

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
) {
  let q = 'UPDATE services SET status = $2, updated_at = NOW()';
  const values: unknown[] = [serviceId, status];

  if (repositoryUrl) {
    q += ', repository_url = $3';
    values.push(repositoryUrl);
  }

  q += ' WHERE id = $1';
  await query(q, values);
}

// ---------------------------------------------------------------------------
// STS Credential Helper
// ---------------------------------------------------------------------------

async function assumeProvisioningRole(serviceId: string) {
  const command = new AssumeRoleCommand({
    RoleArn: config.aws.provisioningRoleArn,
    RoleSessionName: `scape-provision-${serviceId.slice(0, 20)}`,
    DurationSeconds: 3600, // 1 hour
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

export async function processProvisioningJob(job: Job<ProvisioningJobData>) {
  const {
      jobId,
      serviceId,
      serviceName,
      templateId,
      terraformModulePath,
      region,
      teamId,
      triggeredBy,
    } = job.data;

    logger.info({ jobId, serviceId, serviceName }, 'Starting provisioning job');

    // Calculate timeout deadline
    const timeoutAt = new Date(Date.now() + APPLY_TIMEOUT_MS);

    await updateJobStatus(jobId, 'running', { timeoutAt });
    await updateServiceStatus(serviceId, 'provisioning');

    try {
      // ── 1. Assume IAM Role ──
      const awsEnv: NodeJS.ProcessEnv = config.aws.provisioningRoleArn
        ? (await assumeProvisioningRole(serviceId)) as unknown as NodeJS.ProcessEnv
        : {};

      // ── 2. Generate per-service environment directory ──
      const stateBackend = getStateBackendConfig(serviceId);
      const envDir = await generateEnvironment({
        serviceId,
        serviceName,
        modulePath: terraformModulePath,
        region,
        environment: config.nodeEnv,
        ownerTeam: teamId,
        tags: {
          ManagedBy: 'scape',
          ServiceId: serviceId,
          TeamId: teamId,
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
        environment: config.nodeEnv,
        owner_team: teamId,
        tags: {
          ManagedBy: 'scape',
          ServiceId: serviceId,
          TeamId: teamId,
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
        const repositoryUrl = outputs.repository_url?.value;
        const serviceEndpoint = outputs.service_endpoint?.value;

        await updateJobStatus(jobId, 'succeeded', {
          terraformLogs: sanitizedLogs,
        });
        await updateServiceStatus(serviceId, 'active', repositoryUrl);

        // ── 6. CI/CD Integration ──
        try {
          const cicd = new CicdIntegrator();
          await cicd.integrate({
            serviceId,
            serviceName,
            templateId,
            repositoryUrl: repositoryUrl || '',
            region,
            terraformOutputs: outputs,
          });
        } catch (cicdErr: any) {
          // CI/CD failure should not fail the provisioning job
          logger.warn(
            { cicdErr: cicdErr.message, serviceId },
            'CI/CD workflow integration warning — provisioning still succeeded',
          );
        }

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
