/* ========================
 * SCAPE — Shared TypeScript Types
 * Mirrors backend API response shapes
 * ======================== */

// ---- Enums ----

export type UserRole = 'developer' | 'team_lead' | 'devops' | 'admin';

export type ServiceStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'decommissioning'
  | 'decommissioned';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rolled_back'
  | 'manual_intervention_required';

export type DeploymentStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed';

// ---- Entities ----

export interface User {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  cloudProvider: 'aws' | 'gcp';
  resourceTypes: string[];
  templateType?: 'static-frontend' | 'nodejs-api' | 'python-api' | 'container-api';
  isActive: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  ownerId: string;
  teamId: string;
  templateId: string;
  templateName?: string | null;
  status: ServiceStatus;
  region: string;
  environment: 'development' | 'staging' | 'production';
  repositoryUrl: string | null;
  serviceEndpoint: string | null;
  computeMode?: 'fargate' | 'ec2';
  ec2InstanceType?: string | null;
  requestedVcpu?: number;
  requestedMemoryGiB?: number;
  workloadProfile?: 'bursty' | 'balanced' | 'compute' | 'memory';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  checkedAt: string;
  latencyMs: number | null;
  statusCode: number | null;
}

export interface ProvisioningJob {
  id: string;
  serviceId: string;
  triggeredBy: string;
  status: JobStatus;
  terraformWorkspace: string;
  terraformRunId: string | null;
  terraformLogs?: string | null;
  terraformPlanOutput?: string | null;
  errorMessage: string | null;
  timeoutAt?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  serviceId: string;
  triggeredBy: string;
  githubRunId: string | null;
  status: DeploymentStatus;
  commitSha: string | null;
  branch: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CostRecord {
  id: string;
  serviceId: string;
  periodStart: string;
  periodEnd: string;
  amountUsd: number;
  currency: string;
  awsResourceIds: string[];
  syncedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// ---- API Responses ----

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface CreateServiceInput {
  name: string;
  templateId: string;
  region: string;
  environment: 'development' | 'staging' | 'production';
  computeMode?: 'fargate' | 'ec2';
  ec2InstanceType?: string;
  requestedVcpu?: number;
  requestedMemoryGiB?: number;
  workloadProfile?: 'bursty' | 'balanced' | 'compute' | 'memory';
}

export interface CreateServiceResponse {
  service: Service;
  job: {
    id: string;
    status: JobStatus;
    createdAt: string;
  };
}

export interface ServiceCostResponse {
  serviceId: string;
  totalUsd: number;
  records: CostRecord[];
  resourceBreakdown: {
    resource: string;
    amountUsd: number;
  }[];
}

export interface CostSummary {
  totalCostUsd: number;
  monthlyCostUsd: number;
  servicesCount: number;
  servicesCosts: {
    serviceId: string;
    serviceName: string;
    totalUsd: number;
  }[];
  monthlyTrend: {
    month: string;
    amountUsd: number;
  }[];
}

export interface CreateDeploymentInput {
  serviceId: string;
  branch?: 'main';
}

