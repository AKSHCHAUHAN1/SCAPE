import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const { mockQuery, mockPing } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockPing: vi.fn(),
}));

vi.mock('../../src/database/index.js', () => ({
  pool: { query: vi.fn() },
  query: mockQuery,
}));

vi.mock('../../src/queue/index.js', () => ({
  redisConnection: { ping: mockPing },
}));

import { getMetrics } from '../../src/modules/health/health.controller.js';

describe('Health metrics account scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPing.mockResolvedValue('PONG');
    mockQuery.mockImplementation(async (sql: string) => ({
      rows: sql.includes('SELECT d.status')
        ? [{ status: 'succeeded', cnt: '1' }]
        : sql.includes('SELECT d.id')
          ? [{
            id: 'deployment-1',
            status: 'succeeded',
            branch: 'main',
            commit_sha: 'abc123',
            service_name: 'owned-service',
            started_at: null,
            completed_at: null,
          }]
          : [{ total: '1', count: '1' }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }));
  });

  it('scopes service, deployment, job, and cost queries to the authenticated owner', async () => {
    const response = { json: vi.fn() } as unknown as Response;
    await getMetrics(
      { user: { userId: 'owner-1', email: 'owner@example.com', tokenUse: 'access' } } as Request,
      response,
    );

    expect(mockQuery).toHaveBeenCalledTimes(9);
    for (const [sql, params] of mockQuery.mock.calls) {
      expect(sql).toContain('owner_id');
      expect(params).toEqual(['owner-1']);
    }

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      platform: expect.objectContaining({
        deployments: expect.objectContaining({
          recentDeployments: [expect.objectContaining({ serviceName: 'owned-service' })],
        }),
      }),
    }));
  });
});
