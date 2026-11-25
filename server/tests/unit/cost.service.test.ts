import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCostsByServiceId,
  getCostSummary,
  upsertCostRecord,
  estimateConfiguredServiceCost,
  syncDailyCosts,
} from '../../src/modules/cost/cost.service.js';
import { query } from '../../src/database/index.js';

const { mockEstimateServiceCost, mockFetchCostsByService } = vi.hoisted(() => ({
  mockEstimateServiceCost: vi.fn(),
  mockFetchCostsByService: vi.fn(),
}));

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/modules/cost/cost-estimator.js', () => ({
  estimateServiceCost: mockEstimateServiceCost,
}));

vi.mock('../../src/modules/cost/explorer-client.js', () => ({
  AwsCostExplorerClient: vi.fn().mockImplementation(() => ({
    fetchCostsByService: mockFetchCostsByService,
  })),
}));

describe('Cost Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves an active template and forwards its infrastructure shape for estimation', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ terraform_module_path: 'terraform/modules/nodejs-api' }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });
    mockEstimateServiceCost.mockResolvedValueOnce({ totalEstimateUsd: 12 });

    await expect(estimateConfiguredServiceCost({
      templateId: 'template-id',
      region: 'ap-south-1',
      computeMode: 'ec2',
      ec2InstanceType: 't3.small',
      requestedVcpu: 0.5,
      requestedMemoryGiB: 1,
      expectedDurationHours: 24,
    })).resolves.toEqual({ totalEstimateUsd: 12 });
    expect(mockEstimateServiceCost).toHaveBeenCalledWith(expect.objectContaining({
      modulePath: 'terraform/modules/nodejs-api',
      expectedDurationHours: 24,
    }));
  });

  it('aggregates AWS service groups into one idempotent per-service daily actual', async () => {
    mockFetchCostsByService.mockResolvedValueOnce([
      { serviceId: 'service-1', amountUsd: 2, periodStart: '2026-11-24', periodEnd: '2026-11-25', resourceIds: ['Amazon EC2'] },
      { serviceId: 'service-1', amountUsd: 3, periodStart: '2026-11-24', periodEnd: '2026-11-25', resourceIds: ['Amazon RDS'] },
    ]);
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        id: 'cost-1',
        service_id: 'service-1',
        period_start: '2026-11-24',
        period_end: '2026-11-25',
        amount_usd: '5.0000',
        currency: 'USD',
        aws_resource_ids: ['Amazon EC2', 'Amazon RDS'],
        synced_at: new Date(),
        created_at: new Date(),
      }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });

    await expect(syncDailyCosts()).resolves.toBe(1);
    const upsertValues = vi.mocked(query).mock.calls[0][1] as unknown[];
    expect(upsertValues[3]).toBe(5);
    expect(JSON.parse(String(upsertValues[5]))).toEqual(['Amazon EC2', 'Amazon RDS']);
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
