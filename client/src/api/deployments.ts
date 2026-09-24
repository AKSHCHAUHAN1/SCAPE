import apiClient from './index.js';
import type { Deployment, CreateDeploymentInput } from '../types/index.js';

export const deploymentsApi = {
  /**
   * Fetch deployments for a given service.
   */
  async getServiceDeployments(serviceId: string): Promise<Deployment[]> {
    const { data } = await apiClient.get<Deployment[]>(`/services/${serviceId}/deployments`);
    return data;
  },

  /**
   * Fetch deployment by ID.
   */
  async getDeployment(id: string): Promise<Deployment> {
    const { data } = await apiClient.get<Deployment>(`/deployments/${id}`);
    return data;
  },

  /**
   * Trigger a new deployment manually.
   */
  async createDeployment(payload: CreateDeploymentInput): Promise<Deployment> {
    const { data } = await apiClient.post<Deployment>('/deployments', payload);
    return data;
  },
};
