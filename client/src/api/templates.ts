import apiClient from './index.js';
import type { ServiceTemplate } from '../types/index.js';

export const templatesApi = {
  /**
   * Fetch all active service templates.
   */
  async getTemplates(): Promise<ServiceTemplate[]> {
    const { data } = await apiClient.get<ServiceTemplate[]>('/templates');
    return data;
  },

  /**
   * Fetch single template by ID.
   */
  async getTemplate(id: string): Promise<ServiceTemplate> {
    const { data } = await apiClient.get<ServiceTemplate>(`/templates/${id}`);
    return data;
  },
};
