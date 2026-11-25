import { describe, expect, it, vi } from 'vitest';

const { pricingSend } = vi.hoisted(() => ({
  pricingSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-pricing', () => ({
  PricingClient: vi.fn().mockImplementation(() => ({ send: pricingSend })),
  GetProductsCommand: vi.fn().mockImplementation((input) => input),
}));

import { estimateServiceCost } from '../../src/modules/cost/cost-estimator.js';

describe('estimateServiceCost()', () => {
  it('calculates a planned Fargate estimate from AWS on-demand rates', async () => {
    const makeProduct = (attributes: Record<string, string>, price: string, description: string) => JSON.stringify({
      product: { attributes },
      terms: {
        OnDemand: {
          term: {
            priceDimensions: {
              rate: { unit: 'Hrs', description, beginRange: '0', pricePerUnit: { USD: price } },
            },
          },
        },
      },
    });
    pricingSend.mockImplementation((command: { ServiceCode: string }) => {
      if (command.ServiceCode === 'AmazonECS') {
        return Promise.resolve({
          PriceList: [
            makeProduct({ regionCode: 'ap-south-1', usagetype: 'APS1-Fargate-vCPU-Hours:perCPU' }, '0.10', 'Fargate vCPU Hours'),
            makeProduct({ regionCode: 'ap-south-1', usagetype: 'APS1-Fargate-GB-Hours' }, '0.01', 'Fargate memory GB Hours'),
          ],
        });
      }
      if (command.ServiceCode === 'AmazonRDS') {
        return Promise.resolve({
          PriceList: [makeProduct({
            regionCode: 'ap-south-1',
            instanceType: 'db.t3.micro',
            databaseEngine: 'PostgreSQL',
            deploymentOption: 'Single-AZ',
          }, '0.05', 'RDS instance hours')],
        });
      }
      return Promise.resolve({
        PriceList: [makeProduct({
          regionCode: 'ap-south-1',
          productFamily: 'Load Balancer',
          loadBalancerType: 'Application',
        }, '0.02', 'Application Load Balancer hours')],
      });
    });

    const result = await estimateServiceCost({
      region: 'ap-south-1',
      modulePath: 'terraform/modules/nodejs-api',
      computeMode: 'fargate',
      requestedVcpu: 0.5,
      requestedMemoryGiB: 1,
      expectedDurationHours: 10,
    });

    expect(result.hourlyEstimateUsd).toBe(0.13);
    expect(result.totalEstimateUsd).toBe(1.3);
    expect(result.includedResources).toContain('One Linux Fargate task');
  });

  it('does not present variable static-site charges as a fixed estimate', async () => {
    const result = await estimateServiceCost({
      region: 'ap-south-1',
      modulePath: 'terraform/modules/static-frontend',
      computeMode: 'fargate',
      requestedVcpu: 0.5,
      requestedMemoryGiB: 1,
      expectedDurationHours: 24,
    });

    expect(result.available).toBe(false);
    expect(result.hourlyEstimateUsd).toBeNull();
    expect(result.totalEstimateUsd).toBeNull();
    expect(result.message).toMatch(/storage, requests, and data transfer/i);
  });

  it('rejects unsupported infrastructure modules instead of returning a zero estimate', async () => {
    await expect(estimateServiceCost({
      region: 'ap-south-1',
      modulePath: 'terraform/modules/unknown',
      computeMode: 'fargate',
      requestedVcpu: 0.5,
      requestedMemoryGiB: 1,
      expectedDurationHours: 24,
    })).rejects.toThrow('A cost estimate is not available');
  });
});
