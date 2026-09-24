import apiClient from './index.js';
import type { ServiceCostResponse, CostSummary } from '../types/index.js';

export const costsApi = {
  /**
   * Fetch cost breakdown for a specific service.
   */
  async getServiceCosts(serviceId: string, period?: string): Promise<ServiceCostResponse> {
    const params = period ? { period } : {};
    const { data } = await apiClient.get<ServiceCostResponse>(`/services/${serviceId}/costs`, {
      params,
    });
    return data;
  },

  /**
   * Fetch aggregated cost summary across accessible services.
   */
  async getCostSummary(): Promise<CostSummary> {
    const { data } = await apiClient.get<CostSummary>('/costs/summary');
    return data;
  },

  /**
   * Trigger AWS Cost Explorer sync.
   */
  async triggerSync(): Promise<{ message: string; syncedCount: number }> {
    const { data } = await apiClient.post<{ message: string; syncedCount: number }>('/costs/sync');
    return data;
  },
};
