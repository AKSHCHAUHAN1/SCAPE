import apiClient from './index.js';
import type {
  Service,
  CreateServiceInput,
  CreateServiceResponse,
  ProvisioningJob,
} from '../types/index.js';

export const servicesApi = {
  /**
   * Fetch all services accessible to the user.
   */
  async getServices(): Promise<Service[]> {
    const { data } = await apiClient.get<Service[]>('/services');
    return data;
  },

  /**
   * Fetch single service by ID.
   */
  async getService(id: string): Promise<Service> {
    const { data } = await apiClient.get<Service>(`/services/${id}`);
    return data;
  },

  /**
   * Create a new service and enqueue provisioning.
   */
  async createService(payload: CreateServiceInput): Promise<CreateServiceResponse> {
    const { data } = await apiClient.post<CreateServiceResponse>('/services', payload);
    return data;
  },

  /**
   * Decommission a service.
   */
  async deleteService(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/services/${id}`);
    return data;
  },

  /**
   * Get provisioning jobs for a specific service.
   */
  async getServiceJobs(serviceId: string): Promise<ProvisioningJob[]> {
    const { data } = await apiClient.get<ProvisioningJob[]>(`/services/${serviceId}/jobs`);
    return data;
  },

  /**
   * Get provisioning job details by ID.
   */
  async getJob(jobId: string): Promise<ProvisioningJob> {
    const { data } = await apiClient.get<ProvisioningJob>(`/jobs/${jobId}`);
    return data;
  },

  /**
   * Retry a failed provisioning job.
   */
  async retryJob(jobId: string): Promise<{ message: string; jobId: string }> {
    const { data } = await apiClient.post<{ message: string; jobId: string }>(`/jobs/${jobId}/retry`);
    return data;
  },
};
