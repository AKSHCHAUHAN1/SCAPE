import apiClient from './index.js';
import type { AuditLog } from '../types/index.js';

export interface AuditLogQuery {
  resourceId?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  /**
   * Fetch audit logs (admin only).
   */
  async getAuditLogs(params?: AuditLogQuery): Promise<AuditLog[]> {
    const { data } = await apiClient.get<AuditLog[]>('/audit-logs', { params });
    return data;
  },
};
