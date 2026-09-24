import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCostsByServiceId,
  getCostSummary,
  upsertCostRecord,
} from '../../src/modules/cost/cost.service.js';
import { query } from '../../src/database/index.js';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

describe('Cost Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCostsByServiceId()', () => {
    it('should aggregate costs and resource breakdown', async () => {
      const mockQuery = vi.mocked(query);

      // 1. getServiceById check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', team_id: 'team-1' }],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      // 2. select cost_records
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c-1',
            service_id: 'srv-1',
            period_start: '2026-09-01',
            period_end: '2026-09-02',
            amount_usd: '15.5000',
            currency: 'USD',
            aws_resource_ids: ['ECS', 'RDS'],
            synced_at: new Date(),
            created_at: new Date(),
          },
          {
            id: 'c-2',
            service_id: 'srv-1',
            period_start: '2026-09-02',
            period_end: '2026-09-03',
            amount_usd: '10.0000',
            currency: 'USD',
            aws_resource_ids: ['ECS'],
            synced_at: new Date(),
            created_at: new Date(),
          },
        ],
        rowCount: 2, command: '', oid: 0, fields: []
      });

      const res = await getCostsByServiceId('srv-1', undefined, 'team-1', 'developer');
      expect(res.serviceId).toBe('srv-1');
      expect(res.totalUsd).toBe(25.5);
      expect(res.records).toHaveLength(2);
      expect(res.resourceBreakdown.find((r) => r.resource === 'ECS')?.amountUsd).toBeGreaterThan(0);
    });
  });

  describe('upsertCostRecord()', () => {
    it('should insert or update a cost record', async () => {
      const mockQuery = vi.mocked(query);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c-1',
            service_id: 'srv-1',
            period_start: '2026-09-01',
            period_end: '2026-09-02',
            amount_usd: '12.0000',
            currency: 'USD',
            aws_resource_ids: ['S3'],
            synced_at: new Date(),
            created_at: new Date(),
          },
        ],
        rowCount: 1, command: '', oid: 0, fields: []
      });

      const rec = await upsertCostRecord({
        serviceId: 'srv-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-02',
        amountUsd: 12.0,
        currency: 'USD',
        awsResourceIds: ['S3'],
      });

      expect(rec.id).toBe('c-1');
      expect(rec.amountUsd).toBe(12);
      expect(rec.currency).toBe('USD');
    });
  });
});
