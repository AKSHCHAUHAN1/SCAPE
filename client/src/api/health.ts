import apiClient from './index.js';

export interface InfrastructureHealth {
  database: string;
  api: string;
  provisioningQueue: string;
  costSync: string;
}

export interface RecentDeployment {
  id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  branch: string;
  commitSha: string | null;
  serviceName: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface PlatformMetrics {
  status: 'healthy' | 'degraded';
  uptimeMs: number;
  uptimeFormatted: string;
  timestamp: string;
  platform: {
    services: {
      total: number;
      active: number;
      pending: number;
      failed: number;
    };
    deployments: {
      total: number;
      activeJobs: number;
      successRate: number;
      recentDeployments: RecentDeployment[];
    };
    cost: {
      totalSpendUsd: number;
    };
    infrastructure: InfrastructureHealth;
  };
}

export const healthApi = {
  /**
   * GET /health/metrics — authenticated platform-wide metrics for the dashboard.
   */
  async getMetrics(): Promise<PlatformMetrics> {
    const { data } = await apiClient.get<PlatformMetrics>('/health/metrics');
    return data;
  },

  /**
   * GET /health/ready — readiness probe (unauthenticated).
   */
  async getReady(): Promise<{ status: string; checks: Record<string, string> }> {
    const { data } = await apiClient.get('/health/ready');
    return data;
  },
};
