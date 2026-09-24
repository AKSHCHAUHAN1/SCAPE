import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLogQuery } from '../api/audit.js';

export function useAuditLogs(params?: AuditLogQuery) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: () => auditApi.getAuditLogs(params),
    staleTime: 10000,
  });
}
