import { z } from 'zod';

export const costQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format').optional(),
});

export const serviceCostEstimateSchema = z.object({
  templateId: z.string().uuid(),
  region: z.string().min(5).max(32).regex(/^[a-z0-9]+(?:-[a-z0-9]+)+-\d+$/),
  computeMode: z.enum(['fargate', 'ec2']).default('fargate'),
  ec2InstanceType: z.string().optional(),
  requestedVcpu: z.number().min(0.25).max(192).default(0.5),
  requestedMemoryGiB: z.number().min(0.5).max(1536).default(1),
  expectedDurationHours: z.number().int().min(1).max(8760),
});

export const recordCostSchema = z.object({
  serviceId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountUsd: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  awsResourceIds: z.array(z.string()).default([]),
});

export type RecordCostInput = z.infer<typeof recordCostSchema>;
export type ServiceCostEstimateRequest = z.infer<typeof serviceCostEstimateSchema>;
