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

  it('returns a clear 503 when AWS cannot provide a cost estimate', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ terraform_module_path: 'terraform/modules/nodejs-api' }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });
    mockEstimateServiceCost.mockRejectedValueOnce(new Error(
      'AWS denied access to the Pricing API. Re-apply the SCAPE foundation IAM policy so CostExplorerReadRole includes pricing:GetProducts, then retry.',
    ));

    await expect(estimateConfiguredServiceCost({
      templateId: 'template-id',
      region: 'ap-south-1',
      computeMode: 'ec2',
      ec2InstanceType: 't3.small',
      requestedVcpu: 0.5,
      requestedMemoryGiB: 1,
      expectedDurationHours: 24,
    })).rejects.toMatchObject({
      statusCode: 503,
      code: 'COST_ESTIMATE_UNAVAILABLE',
      message: expect.stringContaining('pricing:GetProducts'),
    });
  });

  it('preserves exact AWS service-group amounts, including credits', async () => {
    mockFetchCostsByService.mockResolvedValueOnce([
      { serviceId: 'service-1', amountUsd: 2, periodStart: '2026-11-24', periodEnd: '2026-11-25', awsService: 'Amazon EC2' },
      { serviceId: 'service-1', amountUsd: -3, periodStart: '2026-11-24', periodEnd: '2026-11-25', awsService: 'Amazon RDS' },
    ]);
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        id: 'cost-1',
        service_id: 'service-1',
        period_start: '2026-11-24',
        period_end: '2026-11-25',
        amount_usd: '-1.0000',
        currency: 'USD',
        aws_resource_ids: ['Amazon EC2', 'Amazon RDS'],
        aws_service_costs: [
          { serviceName: 'Amazon EC2', amountUsd: 2 },
          { serviceName: 'Amazon RDS', amountUsd: -3 },
        ],
        synced_at: new Date(),
        created_at: new Date(),
      }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });

    await expect(syncDailyCosts()).resolves.toBe(1);
    const upsertValues = vi.mocked(query).mock.calls[0][1] as unknown[];
    expect(upsertValues[3]).toBe(-1);
    expect(JSON.parse(String(upsertValues[5]))).toEqual(['Amazon EC2', 'Amazon RDS']);
    expect(JSON.parse(String(upsertValues[6]))).toEqual([
      { serviceName: 'Amazon EC2', amountUsd: 2 },
      { serviceName: 'Amazon RDS', amountUsd: -3 },
    ]);
  });

  describe('getCostsByServiceId()', () => {
    it('should aggregate costs and exact AWS service breakdown', async () => {
      const mockQuery = vi.mocked(query);

      // 1. getServiceById check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'srv-1', owner_id: 'user-1' }],
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
            aws_resource_ids: ['ECS', 'RDS', 'AWS service'],
            aws_service_costs: [
              { serviceName: 'ECS', amountUsd: 10 },
              { serviceName: 'RDS', amountUsd: 5.5 },
            ],
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
            aws_service_costs: [{ serviceName: 'ECS', amountUsd: 10 }],
            synced_at: new Date(),
            created_at: new Date(),
          },
        ],
        rowCount: 2, command: '', oid: 0, fields: []
      });

      const res = await getCostsByServiceId('srv-1', undefined, 'user-1');
      expect(res.serviceId).toBe('srv-1');
      expect(res.totalUsd).toBe(25.5);
      expect(res.records).toHaveLength(2);
      expect(res.records[0].awsServices).toEqual(['ECS', 'RDS']);
      expect(res.awsServiceBreakdown).toEqual([
        { serviceName: 'ECS', amountUsd: 20 },
        { serviceName: 'RDS', amountUsd: 5.5 },
      ]);
    });

    it('returns null actual spend when AWS has not reported any records', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'srv-1', owner_id: 'user-1', status: 'decommissioned' }],
        rowCount: 1, command: '', oid: 0, fields: [],
      }).mockResolvedValueOnce({
        rows: [],
        rowCount: 0, command: '', oid: 0, fields: [],
      });

      await expect(getCostsByServiceId('srv-1', undefined, 'user-1')).resolves.toMatchObject({
        serviceStatus: 'decommissioned',
        hasAwsData: false,
        totalUsd: null,
        awsServiceBreakdown: [],
      });
    });

    it('returns missing AWS actuals as null rather than zero', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'srv-1', name: 'Service', owner_id: 'user-1', status: 'active' }],
        rowCount: 1, command: '', oid: 0, fields: [],
      }).mockResolvedValueOnce({
        rows: [],
        rowCount: 0, command: '', oid: 0, fields: [],
      });

      await expect(getCostSummary('user-1')).resolves.toMatchObject({
        hasAwsData: false,
        totalCostUsd: null,
        monthlyCostUsd: null,
        servicesCosts: [{ totalUsd: null }],
        monthlyTrend: [],
      });
    });

    it('returns an empty summary when the account owns no services', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      await expect(getCostSummary('user-1')).resolves.toEqual({
        hasAwsData: false,
        totalCostUsd: null,
        monthlyCostUsd: null,
        servicesCount: 0,
        servicesCosts: [],
        monthlyTrend: [],
      });
      expect(query).toHaveBeenCalledWith(
        'SELECT id, name, status FROM services WHERE owner_id = $1',
        ['user-1'],
      );
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
        awsServices: ['S3'],
      });

      expect(rec.id).toBe('c-1');
      expect(rec.amountUsd).toBe(12);
      expect(rec.currency).toBe('USD');
    });
  });
});
