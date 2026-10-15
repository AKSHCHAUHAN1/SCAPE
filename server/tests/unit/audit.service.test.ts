import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/database/index.js';
import { logAction, getAuditLogs } from '../../src/modules/audit/audit.service.js';

describe('Audit Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logAction() should insert an audit record into audit_logs table', async () => {
    (query as any).mockResolvedValueOnce({ rowCount: 1 });

    await logAction({
      actorId: 'usr-123',
      action: 'service.create',
      resourceType: 'service',
      resourceId: 'svc-456',
      payload: { name: 'test-service' },
      ipAddress: '127.0.0.1',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      ['usr-123', 'service.create', 'service', 'svc-456', { name: 'test-service' }, '127.0.0.1'],
    );
  });

  it('logAction() should not throw an error if database query fails', async () => {
    (query as any).mockRejectedValueOnce(new Error('DB failure'));

    await expect(
      logAction({
        action: 'service.create',
        resourceType: 'service',
      }),
    ).resolves.not.toThrow();
  });

  it('getAuditLogs() should return all logs when no resourceId is specified', async () => {
    (query as any).mockResolvedValueOnce({
      rows: [
        {
          id: 'log-1',
          actor_id: 'usr-1',
          action: 'service.create',
          resource_type: 'service',
          resource_id: 'svc-1',
          payload: {},
          ip_address: null,
          created_at: new Date('2026-10-15T12:00:00Z'),
        },
      ],
    });

    const logs = await getAuditLogs({});

    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('log-1');
    expect(logs[0].action).toBe('service.create');
  });

  it('getAuditLogs() should filter by resourceId when specified', async () => {
    (query as any).mockResolvedValueOnce({
      rows: [
        {
          id: 'log-2',
          actor_id: 'usr-2',
          action: 'job.succeeded',
          resource_type: 'service',
          resource_id: 'svc-specific',
          payload: {},
          ip_address: '10.0.0.1',
          created_at: new Date('2026-10-15T13:00:00Z'),
        },
      ],
    });

    const logs = await getAuditLogs({ resourceId: 'svc-specific' });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE resource_id = $1'),
      ['svc-specific', 50, 0],
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].resourceId).toBe('svc-specific');
  });
});
