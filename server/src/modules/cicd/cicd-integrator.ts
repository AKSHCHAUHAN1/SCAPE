/**
 * CI/CD Integrator
 * Spec: 08-CICD-Integration
 *
 * Orchestrates the full CI/CD integration after Terraform provisioning:
 * 1. Render workflow YAML from Handlebars template
 * 2. Commit workflow file to the service repository
 * 3. Register GitHub webhook for workflow_run events
 * 4. Create an initial deployment record with workflow content hash
 *
 * Data Flow:
 * terraform apply → outputs captured → CicdIntegrator.integrate()
 *   → renderWorkflowYaml()
 *   → GitHubIntegrator.commitWorkflowFile()
 *   → GitHubIntegrator.registerWebhook()
 *   → INSERT deployment record
 *
 * ADR-020: Commit workflow file over GitHub Actions API
 * ADR-021: Template-per-service-type over dynamic workflow generation
 */

import { query } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { logAction } from '../audit/audit.service.js';
import { config } from '../../config/index.js';
import { GitHubIntegrator } from './github-client.js';
import { renderWorkflowYaml, hashWorkflowContent } from './workflow-renderer.js';
import type {
  CicdIntegrationResult,
  ServiceTemplateType,
} from './types.js';
import type { TerraformOutput } from '../provisioning/types.js';

// ---------------------------------------------------------------------------
// Integration Payload
// ---------------------------------------------------------------------------

export interface CicdIntegrationPayload {
  serviceId: string;
  serviceName: string;
  templateId: string;
  templateType: ServiceTemplateType;
  repositoryUrl: string;
  region: string;
  terraformOutputs: Record<string, TerraformOutput>;
}

// ---------------------------------------------------------------------------
// CI/CD Integrator
// ---------------------------------------------------------------------------

export class CicdIntegrator {
  private github: GitHubIntegrator;

  constructor() {
    this.github = new GitHubIntegrator();
  }

  /**
   * Run the full CI/CD integration flow.
   */
  async integrate(payload: CicdIntegrationPayload): Promise<CicdIntegrationResult> {
    const {
      serviceId,
      serviceName,
      templateId,
      templateType,
      repositoryUrl,
      region,
      terraformOutputs,
    } = payload;

    const result: CicdIntegrationResult = {
      workflowCommitted: false,
      webhookRegistered: false,
      workflowContentHash: '',
      errors: [],
    };

    if (!repositoryUrl) {
      logger.info({ serviceId }, 'No repository URL — skipping CI/CD integration');
      result.errors.push('No repository URL available');
      return result;
    }

    const awsRoleArn = terraformOutputs.deploy_role_arn?.value;
    if (!awsRoleArn) {
      result.errors.push('AWS GitHub Actions OIDC deploy role ARN is not configured');
      return result;
    }

    // ── 1. Determine template type ──
    // ── 2. Render workflow YAML ──
    const workflowData = this.extractWorkflowData(
      templateType,
      serviceName,
      region,
      String(awsRoleArn),
      terraformOutputs,
    );

    const workflowYaml = await renderWorkflowYaml(templateType, workflowData);
    const workflowContentHash = hashWorkflowContent(workflowYaml);
    result.workflowContentHash = workflowContentHash;

    logger.info(
      { serviceId, templateType, contentHash: workflowContentHash },
      'Workflow YAML rendered',
    );

    const filePath = '.github/workflows/deploy.yml';

    // Record the first run before installing the workflow and enabling its webhook.
    try {
      const deploymentResult = await query(
        `INSERT INTO deployments
           (service_id, triggered_by, status, branch, workflow_content_hash, workflow_file_path, started_at)
         VALUES ($1, (SELECT owner_id FROM services WHERE id = $1), 'pending', 'main', $2, $3, NULL)
         RETURNING id`,
        [serviceId, workflowContentHash, filePath],
      );
      result.deploymentRecordId = deploymentResult.rows[0]?.id;
    } catch (err: any) {
      logger.error({ err: err.message, serviceId }, 'Failed to create deployment record');
      result.errors.push(`Deployment record creation failed: ${err.message}`);
      return result;
    }

    // ── 3. Register webhook before committing the push-triggered workflow ──
    try {
      const webhookUrl = this.getWebhookUrl();
      const webhookSecret = config.github.webhookSecret;

      if (webhookUrl && webhookSecret) {
        const webhookResult = await this.github.registerWebhook({
          repoUrl: repositoryUrl,
          webhookUrl,
          secret: webhookSecret,
          events: ['workflow_run', 'push'],
        });

        result.webhookRegistered = webhookResult.success;
        result.webhookId = webhookResult.hookId;
        if (!webhookResult.success) {
          result.errors.push(`Webhook registration failed: ${webhookResult.message}`);
        }
      } else {
        logger.info({ serviceId }, 'Webhook URL or secret not configured');
        result.errors.push('Webhook URL or secret not configured');
      }
    } catch (err: any) {
      logger.error({ err: err.message, serviceId }, 'Failed to register webhook');
      result.errors.push(`Webhook registration exception: ${err.message}`);
    }

    if (!result.webhookRegistered) {
      await query(`UPDATE deployments SET status = 'failed', completed_at = NOW() WHERE id = $1`, [result.deploymentRecordId]);
      return result;
    }

    // ── 4. Commit the workflow file ──
    try {
      const commitResult = await this.github.commitWorkflowFile({
        repoUrl: repositoryUrl,
        filePath,
        content: workflowYaml,
        commitMessage: `ci: add SCAPE automated deployment workflow\n\nTemplate: ${templateType}\nService: ${serviceName}\nContent-Hash: ${workflowContentHash}`,
      });

      result.workflowCommitted = commitResult.success;
      result.workflowSha = commitResult.sha;

      if (!commitResult.success) {
        result.errors.push(`Workflow commit failed: ${commitResult.message}`);
      }
    } catch (err: any) {
      logger.error({ err: err.message, serviceId }, 'Failed to commit workflow file');
      result.errors.push(`Workflow commit exception: ${err.message}`);
    }

    if (!result.workflowCommitted) {
      await query(`UPDATE deployments SET status = 'failed', completed_at = NOW() WHERE id = $1`, [result.deploymentRecordId]);
    }

    try {
      await logAction({
        actorId: 'system',
        action: 'cicd.integrated',
        resourceType: 'service',
        resourceId: serviceId,
        payload: {
          templateId,
          templateType,
          workflowCommitted: result.workflowCommitted,
          webhookRegistered: result.webhookRegistered,
          workflowContentHash,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message, serviceId }, 'Failed to write CI/CD audit event');
      result.errors.push(`CI/CD audit event failed: ${err.message}`);
    }

    logger.info(
      {
        serviceId,
        workflowCommitted: result.workflowCommitted,
        webhookRegistered: result.webhookRegistered,
        errorCount: result.errors.length,
      },
      'CI/CD integration completed',
    );

    return result;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Extract workflow template data from Terraform outputs.
   */
  private extractWorkflowData(
    templateType: ServiceTemplateType,
    serviceName: string,
    region: string,
    awsRoleArn: string,
    outputs: Record<string, TerraformOutput>,
  ) {
    const baseData = {
      serviceName,
      awsRegion: region,
      awsRoleArn,
    };

    if (templateType !== 'static-frontend') {
      return {
        ...baseData,
        ecrRepository: String(outputs.ecr_repository_url?.value || outputs.repository_url?.value || '').split('/').at(-1) || '',
        ecsCluster: outputs.ecs_cluster_name?.value || '',
        ecsService: outputs.ecs_service_name?.value || '',
        taskDefinition: outputs.ecs_task_definition_family?.value || '',
      };
    }

    // static-frontend
    return {
      ...baseData,
      s3BucketName: outputs.s3_bucket_name?.value || '',
      cloudFrontDistributionId: outputs.cloudfront_distribution_id?.value || '',
    };
  }

  /**
   * Get the public webhook URL for this SCAPE instance.
   */
  private getWebhookUrl(): string | null {
    const baseUrl = process.env.SCAPE_PUBLIC_URL || process.env.PUBLIC_URL;
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/$/, '')}/webhooks/github`;
  }
}
