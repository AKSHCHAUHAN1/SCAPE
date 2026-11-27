/* ========================
 * SCAPE — Shared TypeScript Types
 * Mirrors backend API response shapes
 * ======================== */

// ---- Enums ----

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
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
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
  expectedDurationHours?: number;
  infrastructureStartedAt?: string | null;
  infrastructureDecommissionedAt?: string | null;
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
  awsServices: string[];
  awsServiceCosts: {
    serviceName: string;
    amountUsd: number;
  }[];
  syncedAt: string;
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
  repositoryUrl: string;
  expectedDurationHours: number;
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
  serviceStatus: ServiceStatus;
  hasAwsData: boolean;
  totalUsd: number | null;
  expectedDurationHours: number;
  actualRuntimeHours: number | null;
  records: CostRecord[];
  awsServiceBreakdown: {
    serviceName: string;
    amountUsd: number;
  }[];
}

export interface ServiceCostEstimateInput {
  templateId: string;
  region: string;
  computeMode: 'fargate' | 'ec2';
  ec2InstanceType?: string;
  requestedVcpu: number;
  requestedMemoryGiB: number;
  expectedDurationHours: number;
}

export interface ServiceCostEstimate {
  available: boolean;
  currency: 'USD';
  expectedDurationHours: number;
  hourlyEstimateUsd: number | null;
  totalEstimateUsd: number | null;
  includedResources: string[];
  exclusions: string[];
  message: string;
  pricedAt: string | null;
}

export interface CostSummary {
  hasAwsData: boolean;
  totalCostUsd: number | null;
  monthlyCostUsd: number | null;
  servicesCount: number;
  servicesCosts: {
    serviceId: string;
    serviceName: string;
    totalUsd: number | null;
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

