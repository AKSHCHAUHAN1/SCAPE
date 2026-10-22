import { describe, expect, it } from 'vitest';
import { createServiceSchema } from '../../src/modules/services/services.schema.js';

const baseInput = {
  name: 'demo-api',
  templateId: 'c1d2e3f4-0001-4000-8000-000000000001',
  region: 'eu-west-1',
};

describe('createServiceSchema', () => {
  it('accepts a user-selected region and a valid default Fargate size', () => {
    expect(createServiceSchema.safeParse(baseInput).success).toBe(true);
  });

  it('requires an EC2 type when EC2 compute is selected', () => {
    const result = createServiceSchema.safeParse({ ...baseInput, computeMode: 'ec2' });
    expect(result.success).toBe(false);
  });

  it('accepts a custom x86 EC2 type and rejects a Graviton type for this starter', () => {
    expect(createServiceSchema.safeParse({
      ...baseInput,
      computeMode: 'ec2',
      ec2InstanceType: 'm8i.large',
    }).success).toBe(true);

    expect(createServiceSchema.safeParse({
      ...baseInput,
      computeMode: 'ec2',
      ec2InstanceType: 'm7g.large',
    }).success).toBe(false);
  });

  it('rejects unsupported Fargate CPU and memory combinations', () => {
    expect(createServiceSchema.safeParse({
      ...baseInput,
      requestedVcpu: 0.25,
      requestedMemoryGiB: 4,
    }).success).toBe(false);
  });
});
