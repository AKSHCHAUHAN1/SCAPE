import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
const mockQuery = vi.fn();
vi.mock('../../src/database/index.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock audit logger
vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock environment generator
vi.mock('../../src/modules/provisioning/environment-generator.js', () => ({
  generateEnvironment: vi.fn().mockResolvedValue('/fake/env/dir'),
}));

// Mock state manager
vi.mock('../../src/modules/provisioning/state-manager.js', () => ({
  getStateBackendConfig: vi.fn().mockReturnValue({
    bucket: 'test-bucket',
    key: 'state/key',
    region: 'ap-south-1',
    dynamodbTable: 'locks',
  }),
}));

// Mock STS credentials
vi.mock('@aws-sdk/client-sts', () => ({
  STSClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Credentials: {
        AccessKeyId: 'ASIA_MOCK_KEY',
        SecretAccessKey: 'MOCK_SECRET',
        SessionToken: 'MOCK_TOKEN',
      },
    }),
  })),
  AssumeRoleCommand: vi.fn(),
}));

// Mock TerraformRunner
const mockApply = vi.fn();
const mockDestroy = vi.fn();
vi.mock('../../src/modules/provisioning/terraform-runner.js', () => ({
  TerraformRunner: vi.fn().mockImplementation(() => ({
    apply: (...args: any[]) => mockApply(...args),
    destroy: (...args: any[]) => mockDestroy(...args),
  })),
}));

// Mock Rollback Coordinator
const mockExecuteRollback = vi.fn();
vi.mock('../../src/modules/provisioning/rollback-coordinator.js', () => ({
  executeRollback: (...args: any[]) => mockExecuteRollback(...args),
}));

// Mock CI/CD Integrator
const mockIntegrate = vi.fn();
vi.mock('../../src/modules/cicd/cicd-integrator.js', () => ({
  CicdIntegrator: vi.fn().mockImplementation(() => ({
    integrate: (...args: any[]) => mockIntegrate(...args),
  })),
}));

import { processProvisioningJob } from '../../src/modules/provisioning/provisioning.worker.js';

describe('ProvisioningWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully processes provisioning job and triggers CI/CD integration', async () => {
    // Mock DB update job -> running
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    // Mock DB update service -> provisioning
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    // Mock successful terraform apply
    mockApply.mockResolvedValueOnce({
      success: true,
      exitCode: 0,
      logs: 'Apply complete! 5 added, 0 changed, 0 destroyed.',
      outputs: {
        service_endpoint: { value: 'http://my-alb.amazonaws.com' },
        repository_url: { value: '123456.dkr.ecr.ap-south-1.amazonaws.com/test-svc' },
        resource_arns: { value: ['arn:aws:ecs:1'] },
      },
    });

    // Mock DB update job -> succeeded
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    // Mock DB update service -> active
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'svc-123', repository_url: 'https://github.com/org/repo' }],
    });

    // Mock CI/CD integration success
    mockIntegrate.mockResolvedValueOnce({
      workflowCommitted: true,
      webhookRegistered: true,
      workflowSha: 'commit-123',
    });

    const job = {
      id: 'job-1',
      data: {
        jobId: 'job-1',
        serviceId: 'svc-123',
        serviceName: 'test-svc',
        templateId: 'tpl-node',
        terraformModulePath: 'terraform/modules/nodejs-api',
        region: 'ap-south-1',
        teamId: 'team-1',
        triggeredBy: 'user-1',
      },
    };

    await processProvisioningJob(job as any);

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockIntegrate).toHaveBeenCalledTimes(1);
    expect(mockExecuteRollback).not.toHaveBeenCalled();
  });

  it('triggers rollback when terraform apply fails', async () => {
    // Mock DB update job -> running
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    // Mock DB update service -> provisioning
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    // Mock failed terraform apply
    mockApply.mockResolvedValueOnce({
      success: false,
      exitCode: 1,
      logs: 'Error: ResourceCreationFailed',
      errorMessage: 'ResourceCreationFailed',
      outputs: {},
    });

    // Mock rollback coordinator
    mockExecuteRollback.mockResolvedValueOnce({
      success: true,
      status: 'rolled_back',
      logs: 'Rollback complete.',
    });

    const job = {
      id: 'job-fail-1',
      data: {
        jobId: 'job-fail-1',
        serviceId: 'svc-fail-123',
        serviceName: 'test-fail-svc',
        templateId: 'tpl-node',
        terraformModulePath: 'terraform/modules/nodejs-api',
        region: 'ap-south-1',
        teamId: 'team-1',
        triggeredBy: 'user-1',
      },
    };

    await expect(processProvisioningJob(job as any)).rejects.toThrow();
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockExecuteRollback).toHaveBeenCalledTimes(1);
  });
});
