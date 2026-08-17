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
  | 'decommissioned';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rolled_back';

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
  teamId: string;
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
  isActive: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  ownerId: string;
  teamId: string;
  templateId: string;
  status: ServiceStatus;
  region: string;
  repositoryUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisioningJob {
  id: string;
  serviceId: string;
  triggeredBy: string;
  status: JobStatus;
  terraformWorkspace: string;
  terraformRunId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  serviceId: string;
  triggeredBy: string;
  githubRunId: string;
  status: DeploymentStatus;
  commitSha: string;
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
