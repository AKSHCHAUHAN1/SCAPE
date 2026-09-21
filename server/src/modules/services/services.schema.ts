import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z
    .string()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name must be at most 100 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Service name must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen',
    ),
  templateId: z.string().uuid('Invalid template ID'),
  region: z
    .string()
    .max(50)
    .optional()
    .default('ap-south-1'),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
