/**
 * Provisioning Engine — Shared Types
 * Spec: 07-Terraform-Provisioning-Engine
 *
 * Central type definitions for the provisioning subsystem.
 * Every component in this module imports from here to ensure
 * a single source of truth for data shapes.
 */

// ---------------------------------------------------------------------------
// Job Status State Machine
// ---------------------------------------------------------------------------
// queued → running → succeeded
//                  → failed → (retry) → queued
//                  → rolled_back
//                  → manual_intervention_required
// ---------------------------------------------------------------------------

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rolled_back'
  | 'manual_intervention_required';

export const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  'succeeded',
  'failed',
  'rolled_back',
  'manual_intervention_required',
]);

export const RETRYABLE_STATUSES: ReadonlySet<JobStatus> = new Set([
  'failed',
  'rolled_back',
  'manual_intervention_required',
]);

// ---------------------------------------------------------------------------
// Provisioning Job
// ---------------------------------------------------------------------------

export interface ProvisioningJob {
  id: string;
  serviceId: string;
  triggeredBy: string;
  status: JobStatus;
  terraformWorkspace: string | null;
  terraformRunId: string | null;
  terraformLogs: string | null;
  terraformPlanOutput: string | null;
  errorMessage: string | null;
  timeoutAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ProvisioningJobData {
  jobId: string;
  serviceId: string;
  serviceName: string;
  templateId: string;
  templateType?: string;
  terraformModulePath: string;
  region: string;
  environment?: string;
  computeMode?: 'fargate' | 'ec2';
  ec2InstanceType?: string;
  requestedVcpu?: number;
  requestedMemoryGiB?: number;
  workloadProfile?: 'bursty' | 'balanced' | 'compute' | 'memory';
  teamId: string;
  triggeredBy: string;
  repositoryUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Terraform Run Result
// ---------------------------------------------------------------------------

export interface TerraformOutput {
  value: any;
  type?: string;
  sensitive?: boolean;
}

export interface TerraformRunResult {
  success: boolean;
  outputs?: Record<string, TerraformOutput>;
  error?: string;
  logs?: string;
  planOutput?: string;
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Terraform Diagnostic (from -json output)
// ---------------------------------------------------------------------------

export interface TerraformDiagnostic {
  severity: 'error' | 'warning';
  summary: string;
  detail?: string;
  address?: string;
}

export interface TerraformJsonLine {
  '@level'?: string;
  '@message'?: string;
  '@module'?: string;
  type?: string;
  diagnostic?: TerraformDiagnostic;
  hook?: Record<string, unknown>;
  change?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// State Manager
// ---------------------------------------------------------------------------

export interface StateBackendConfig {
  bucket: string;
  key: string;
  region: string;
  dynamodbTable: string;
  encrypt: boolean;
}

// ---------------------------------------------------------------------------
// Environment Generator
// ---------------------------------------------------------------------------

export interface EnvironmentConfig {
  serviceId: string;
  serviceName: string;
  modulePath: string;
  region: string;
  environment: string;
  computeMode?: 'fargate' | 'ec2';
  ec2InstanceType?: string;
  requestedVcpu?: number;
  requestedMemoryGiB?: number;
  ownerTeam: string;
  githubRepository: string;
  tags: Record<string, string>;
  stateBackend: StateBackendConfig;
}

// ---------------------------------------------------------------------------
// Worker Timeouts (ms)
// ---------------------------------------------------------------------------

export const APPLY_TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutes
export const DESTROY_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
export const INIT_TIMEOUT_MS = 2 * 60 * 1000;      // 2 minutes
