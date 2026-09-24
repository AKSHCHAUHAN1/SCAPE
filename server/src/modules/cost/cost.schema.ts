import { z } from 'zod';

export const costQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format').optional(),
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
