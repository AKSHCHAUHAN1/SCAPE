import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  GetCostAndUsageCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

vi.mock('../../src/config/index.js', () => ({
  config: {
    aws: { costExplorerRoleArn: null, region: 'us-east-1' },
    nodeEnv: 'test',
  },
}));

import { AwsCostExplorerClient } from '../../src/modules/cost/explorer-client.js';

describe('AWS Cost Explorer client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps negative adjustments and AWS service group names from Cost Explorer', async () => {
    mockSend.mockResolvedValueOnce({
      ResultsByTime: [{
        TimePeriod: { Start: '2026-11-24', End: '2026-11-25' },
        Groups: [
          {
            Keys: ['forge:service-id$service-1', 'Amazon EC2'],
            Metrics: { UnblendedCost: { Amount: '1.25' } },
          },
          {
            Keys: ['forge:service-id$service-1', 'Amazon RDS'],
            Metrics: { UnblendedCost: { Amount: '-0.25' } },
          },
          {
            Keys: ['forge:service-id$service-1', 'Amazon S3'],
            Metrics: { UnblendedCost: { Amount: '0' } },
          },
          {
            Keys: ['No tag key', 'Amazon EC2'],
            Metrics: { UnblendedCost: { Amount: '5' } },
          },
        ],
      }],
    });

    await expect(
      new AwsCostExplorerClient().fetchCostsByService('2026-11-24', '2026-11-25'),
    ).resolves.toEqual([
      {
        serviceId: 'service-1',
        amountUsd: 1.25,
        periodStart: '2026-11-24',
        periodEnd: '2026-11-25',
        awsService: 'Amazon EC2',
      },
      {
        serviceId: 'service-1',
        amountUsd: -0.25,
        periodStart: '2026-11-24',
        periodEnd: '2026-11-25',
        awsService: 'Amazon RDS',
      },
    ]);
  });
});
