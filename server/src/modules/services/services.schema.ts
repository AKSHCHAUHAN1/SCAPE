import { z } from 'zod';

const fargateMemoryByVcpu: Record<number, number[]> = {
  0.25: [0.5, 1, 2],
  0.5: [1, 2, 3, 4],
  1: [2, 3, 4, 5, 6, 7, 8],
  2: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  4: Array.from({ length: 23 }, (_, index) => index + 8),
};

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
    .min(5)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)+-\d+$/, 'Enter a valid AWS region code, such as ap-south-1'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  computeMode: z.enum(['fargate', 'ec2']).default('fargate'),
  ec2InstanceType: z.string().trim()
    .regex(/^[a-z][a-z0-9]*\.[a-z0-9-]+$/, 'Enter an EC2 instance type such as t3.small')
    .refine((instanceType) => !/^(?:a1|[a-z0-9]+g(?:d|n)?)\./.test(instanceType), 'This ECS starter currently supports x86_64 EC2 types; choose a type such as t3.small or m8i.large')
    .optional(),
  requestedVcpu: z.number().min(0.25).max(192).default(0.5),
  requestedMemoryGiB: z.number().min(0.5).max(1536).default(1),
  workloadProfile: z.enum(['bursty', 'balanced', 'compute', 'memory']).default('bursty'),
}).superRefine((input, ctx) => {
  if (input.computeMode === 'ec2' && !input.ec2InstanceType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ec2InstanceType'],
      message: 'Choose an EC2 instance type when EC2 compute is selected.',
    });
  }

  if (input.computeMode === 'fargate') {
    const supportedMemory = fargateMemoryByVcpu[input.requestedVcpu];
    if (!supportedMemory || !supportedMemory.includes(input.requestedMemoryGiB)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedMemoryGiB'],
        message: 'The requested CPU and memory combination is not supported by Fargate.',
      });
    }
  }
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
