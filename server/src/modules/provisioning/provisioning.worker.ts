import { Worker, Job } from 'bullmq';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { redisConnection } from '../../queue/index.js';
import { query } from '../../database/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';
import { TerraformRunner } from './terraform-runner.js';

const stsClient = new STSClient({ region: config.aws.region });

export interface ProvisioningJobData {
  jobId: string;
  serviceId: string;
  serviceName: string;
  templateId: string;
  terraformModulePath: string;
  region: string;
  teamId: string;
  triggeredBy: string;
}

async function updateJobStatus(jobId: string, status: string, errorMsg?: string) {
  const fields = ['status = $2'];
  const values: any[] = [jobId, status];
  let idx = 3;

  if (status === 'running') {
    fields.push(`started_at = NOW()`);
  } else if (['succeeded', 'failed', 'rolled_back'].includes(status)) {
    fields.push(`completed_at = NOW()`);
  }

  if (errorMsg !== undefined) {
    fields.push(`error_message = $${idx++}`);
    values.push(errorMsg);
  }

  await query(
    `UPDATE provisioning_jobs SET ${fields.join(', ')} WHERE id = $1`,
    values,
  );
}

async function updateServiceStatus(serviceId: string, status: string, repositoryUrl?: string) {
  let q = `UPDATE services SET status = $2, updated_at = NOW()`;
  const values: any[] = [serviceId, status];

  if (repositoryUrl) {
    q += `, repository_url = $3`;
    values.push(repositoryUrl);
  }

  q += ` WHERE id = $1`;
  await query(q, values);
}

async function assumeProvisioningRole(serviceId: string) {
  // Use AssumeRole to get temporary credentials for the provisioning role
  // We use the serviceId as the ExternalId or RoleSessionName for tracking
  const command = new AssumeRoleCommand({
    RoleArn: config.aws.provisioningRoleArn,
    RoleSessionName: `provisioning-${serviceId}`,
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

export const provisioningWorker = new Worker(
  'provisioning',
  async (job: Job<ProvisioningJobData>) => {
    const { jobId, serviceId, serviceName, terraformModulePath, region, teamId, triggeredBy } = job.data;
    
    logger.info({ jobId, serviceId }, 'Starting provisioning job');
    
    await updateJobStatus(jobId, 'running');
    await updateServiceStatus(serviceId, 'provisioning');

    try {
      // 1. Assume IAM Role for Provisioning
      // If config.aws.provisioningRoleArn is not set, we'll just rely on the default credential provider chain (useful for local dev or testing)
      const awsEnv: NodeJS.ProcessEnv = config.aws.provisioningRoleArn 
        ? (await assumeProvisioningRole(serviceId)) as unknown as NodeJS.ProcessEnv
        : {};

      // 2. Initialize Terraform Runner
      const runner = new TerraformRunner(terraformModulePath);

      // 3. Prepare variables
      const variables = {
        service_name: serviceName,
        service_id: serviceId,
        region: region,
        environment: config.nodeEnv,
        owner_team: teamId,
        tags: {
          ManagedBy: 'scape',
          ServiceId: serviceId,
          TeamId: teamId,
        },
      };

      // 4. Run Terraform Apply
      // Use serviceId as workspace name for state isolation
      const result = await runner.apply(serviceId, variables, awsEnv);

      if (result.success) {
        // Successful apply
        const outputs = result.outputs || {};
        const repositoryUrl = outputs.repository_url?.value;
        const serviceEndpoint = outputs.service_endpoint?.value;
        // In a real implementation, you might save resource ARNs as well

        await updateJobStatus(jobId, 'succeeded');
        await updateServiceStatus(serviceId, 'active', repositoryUrl);
        
        await logAction({
          actorId: triggeredBy,
          action: 'job.succeeded',
          resourceType: 'provisioning_job',
          resourceId: jobId,
        });
        
        logger.info({ jobId, serviceId, serviceEndpoint }, 'Provisioning completed successfully');
      } else {
        // Failed apply, trigger rollback
        logger.warn({ jobId, serviceId, error: result.error }, 'Provisioning failed, initiating rollback');
        
        const rollbackResult = await runner.destroy(serviceId, awsEnv);
        
        if (rollbackResult.success) {
          await updateJobStatus(jobId, 'rolled_back', result.error);
          await updateServiceStatus(serviceId, 'failed');
          
          await logAction({
            actorId: triggeredBy,
            action: 'job.rolled_back',
            resourceType: 'provisioning_job',
            resourceId: jobId,
            payload: { reason: result.error },
          });
        } else {
          // Rollback failed, operator intervention required
          logger.error({ jobId, serviceId, error: rollbackResult.error }, 'Rollback failed!');
          
          await updateJobStatus(jobId, 'failed', `Apply error: ${result.error} | Rollback error: ${rollbackResult.error}`);
          await updateServiceStatus(serviceId, 'failed');
          
          await logAction({
            actorId: triggeredBy,
            action: 'job.failed',
            resourceType: 'provisioning_job',
            resourceId: jobId,
            payload: { applyError: result.error, rollbackError: rollbackResult.error },
          });
        }
        
        throw new Error(`Provisioning failed: ${result.error}`);
      }

    } catch (err: any) {
      logger.error({ err, jobId, serviceId }, 'Unexpected error in provisioning worker');
      // Update job status if not already updated in the catch block above
      await updateJobStatus(jobId, 'failed', err.message);
      await updateServiceStatus(serviceId, 'failed');
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Run up to 5 Terraform jobs concurrently
  }
);

provisioningWorker.on('error', (err) => {
  logger.error({ err }, 'Provisioning worker error');
});
