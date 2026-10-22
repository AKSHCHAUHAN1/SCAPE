export type WorkloadProfile = 'bursty' | 'balanced' | 'compute' | 'memory';
export type ServiceUseCase = 'website' | 'api' | 'container' | 'unsure';
export type ApiRuntime = 'nodejs' | 'python' | 'undecided';

export interface Ec2InstanceOption {
  type: string;
  family: string;
  vcpu: number;
  memoryGiB: number;
  useCase: string;
}

// Starter catalog for the offline capstone advisor. AWS account and region
// availability is checked during Terraform planning, and this list is not a
// live price catalog.
export const EC2_INSTANCE_OPTIONS: Ec2InstanceOption[] = [
  { type: 't3.micro', family: 'bursty', vcpu: 2, memoryGiB: 1, useCase: 'Tiny experiments' },
  { type: 't3.small', family: 'bursty', vcpu: 2, memoryGiB: 2, useCase: 'Small demo services' },
  { type: 't3.medium', family: 'bursty', vcpu: 2, memoryGiB: 4, useCase: 'Development APIs' },
  { type: 't3.large', family: 'bursty', vcpu: 2, memoryGiB: 8, useCase: 'Moderate bursty workloads' },
  { type: 't3.xlarge', family: 'bursty', vcpu: 4, memoryGiB: 16, useCase: 'Larger bursty workloads' },
  { type: 't3.2xlarge', family: 'bursty', vcpu: 8, memoryGiB: 32, useCase: 'Large bursty workloads' },
  { type: 'm8i.large', family: 'balanced', vcpu: 2, memoryGiB: 8, useCase: 'General-purpose services' },
  { type: 'm8i.xlarge', family: 'balanced', vcpu: 4, memoryGiB: 16, useCase: 'Larger general-purpose services' },
  { type: 'c7i.large', family: 'compute', vcpu: 2, memoryGiB: 4, useCase: 'CPU-heavy services' },
  { type: 'c7i.xlarge', family: 'compute', vcpu: 4, memoryGiB: 8, useCase: 'Sustained CPU-heavy services' },
  { type: 'r7i.large', family: 'memory', vcpu: 2, memoryGiB: 16, useCase: 'Memory-heavy services' },
  { type: 'r7i.xlarge', family: 'memory', vcpu: 4, memoryGiB: 32, useCase: 'Large in-memory workloads' },
];

export const FARGATE_MEMORY_BY_VCPU: Record<number, number[]> = {
  0.25: [0.5, 1, 2],
  0.5: [1, 2, 3, 4],
  1: [2, 3, 4, 5, 6, 7, 8],
  2: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  4: Array.from({ length: 23 }, (_, index) => index + 8),
};

export function recommendEc2InstanceType(
  requestedVcpu: number,
  requestedMemoryGiB: number,
  workloadProfile: WorkloadProfile,
): Ec2InstanceOption | null {
  return EC2_INSTANCE_OPTIONS
    .filter((option) => option.family === workloadProfile)
    .filter((option) => option.vcpu >= requestedVcpu + 0.5 && option.memoryGiB >= requestedMemoryGiB + 1)
    .sort((left, right) => (left.vcpu * left.memoryGiB) - (right.vcpu * right.memoryGiB))[0] ?? null;
}

export function isSupportedEc2InstanceType(instanceType: string): boolean {
  return /^[a-z][a-z0-9]*\.[a-z0-9-]+$/.test(instanceType)
    && !/^(?:a1|[a-z0-9]+g(?:d|n)?)\./.test(instanceType);
}

export function getRecommendedTemplateType(
  useCase: ServiceUseCase,
  runtime: ApiRuntime,
): 'static-frontend' | 'nodejs-api' | 'python-api' | 'container-api' {
  if (useCase === 'website') return 'static-frontend';
  if (useCase === 'container') return 'container-api';
  if (useCase === 'api' && runtime === 'python') return 'python-api';
  // Node.js is the default API starter when no runtime preference is set.
  return 'nodejs-api';
}
