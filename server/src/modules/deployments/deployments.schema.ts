import { z } from 'zod';

export const createDeploymentSchema = z.object({
  serviceId: z.string().uuid(),
  branch: z.literal('main').default('main'),
});

export const updateDeploymentSchema = z.object({
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  githubRunId: z.string().max(100).optional(),
  commitSha: z.string().min(7).max(40).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateDeploymentInput = z.infer<typeof updateDeploymentSchema>;
