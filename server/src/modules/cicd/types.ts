/**
 * CI/CD Integration — Shared Types
 * Spec: 08-CICD-Integration
 *
 * Central type definitions for the CI/CD integration subsystem.
 */

// ---------------------------------------------------------------------------
// Workflow Template
// ---------------------------------------------------------------------------

export interface WorkflowTemplateData {
  serviceName: string;
  awsRegion: string;
  ecrRepository?: string;
  ecsCluster?: string;
  ecsService?: string;
  taskDefinition?: string;
  s3BucketName?: string;
  cloudFrontDistributionId?: string;
  awsRoleArn?: string;
}

export type ServiceTemplateType = 'nodejs-api' | 'static-frontend';

// ---------------------------------------------------------------------------
// GitHub Commit Payload
// ---------------------------------------------------------------------------

export interface GitHubCommitPayload {
  repoUrl: string;
  filePath: string;
  content: string;
  commitMessage: string;
  branch?: string;
}

export interface GitHubCommitResult {
  success: boolean;
  sha?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Webhook Registration
// ---------------------------------------------------------------------------

export interface WebhookRegistrationPayload {
  repoUrl: string;
  webhookUrl: string;
  secret: string;
  events: string[];
}

export interface WebhookRegistrationResult {
  success: boolean;
  hookId?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Workflow Run Event (from GitHub webhook)
// ---------------------------------------------------------------------------

export interface WorkflowRunEvent {
  action: string;
  workflowRun: {
    id: number;
    name: string;
    headBranch: string;
    headSha: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
    htmlUrl: string;
    createdAt: string;
    updatedAt: string;
  };
  repository: {
    id: number;
    name: string;
    fullName: string;
    htmlUrl: string;
  };
}

// ---------------------------------------------------------------------------
// Deployment Record
// ---------------------------------------------------------------------------

export interface DeploymentRecord {
  id: string;
  serviceId: string;
  triggeredBy: string;
  githubRunId: string | null;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  commitSha: string | null;
  branch: string;
  workflowContentHash: string | null;
  workflowFilePath: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// CI/CD Integration Result
// ---------------------------------------------------------------------------

export interface CicdIntegrationResult {
  workflowCommitted: boolean;
  workflowSha?: string;
  webhookRegistered: boolean;
  webhookId?: number;
  workflowContentHash: string;
  deploymentRecordId?: string;
  errors: string[];
}

// ---------------------------------------------------------------------------
// GitHub App Token
// ---------------------------------------------------------------------------

export interface GitHubAppToken {
  token: string;
  expiresAt: Date;
  installationId: number;
}
