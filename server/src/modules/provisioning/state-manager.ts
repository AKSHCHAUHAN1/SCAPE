/**
 * State Manager
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * Manages Terraform remote state configuration.
 * - Generates per-service S3 backend configuration
 * - Provides state file path conventions
 * - Ensures state isolation via workspace-per-service model
 *
 * State path: scape-tf-state/<service-id>/terraform.tfstate
 * Lock table: scape-tf-locks (DynamoDB)
 */

import { config } from '../../config/index.js';
import type { StateBackendConfig } from './types.js';

// ---------------------------------------------------------------------------
// State Path Convention
// ---------------------------------------------------------------------------

/**
 * Generate the S3 state key for a given service.
 * Pattern: `services/<service-id>/terraform.tfstate`
 */
export function getStateKey(serviceId: string): string {
  return `services/${serviceId}/terraform.tfstate`;
}

/**
 * Generate the full state backend configuration for a service.
 */
export function getStateBackendConfig(serviceId: string): StateBackendConfig {
  return {
    bucket: config.terraform.stateBucket,
    key: getStateKey(serviceId),
    region: config.aws.region,
    dynamodbTable: config.terraform.lockTable,
    encrypt: true,
  };
}

/**
 * Generate the `-backend-config` CLI arguments for terraform init.
 * These are passed as individual key=value pairs.
 *
 * Example output:
 * [
 *   '-backend-config=bucket=scape-tf-state',
 *   '-backend-config=key=services/abc-123/terraform.tfstate',
 *   '-backend-config=region=ap-south-1',
 *   '-backend-config=dynamodb_table=scape-tf-locks',
 *   '-backend-config=encrypt=true'
 * ]
 */
export function getBackendConfigArgs(serviceId: string): string[] {
  const cfg = getStateBackendConfig(serviceId);

  return [
    `-backend-config=bucket=${cfg.bucket}`,
    `-backend-config=key=${cfg.key}`,
    `-backend-config=region=${cfg.region}`,
    `-backend-config=dynamodb_table=${cfg.dynamodbTable}`,
    `-backend-config=encrypt=${cfg.encrypt}`,
  ];
}

/**
 * Generate the Terraform workspace name for a service.
 * We use the service UUID directly as workspace name for isolation.
 */
export function getWorkspaceName(serviceId: string): string {
  return serviceId;
}

/**
 * Get the S3 URI for the state file of a specific service.
 * Useful for debugging and audit logs.
 */
export function getStateFileUri(serviceId: string): string {
  return `s3://${config.terraform.stateBucket}/${getStateKey(serviceId)}`;
}
