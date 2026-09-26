import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
const mockQuery = vi.fn();
vi.mock('../../src/database/index.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock GitHub Integrator
const mockCommitWorkflowFile = vi.fn();
const mockRegisterWebhook = vi.fn();
vi.mock('../../src/modules/cicd/github-client.js', () => ({
  GitHubIntegrator: vi.fn().mockImplementation(() => ({
    commitWorkflowFile: (...args: any[]) => mockCommitWorkflowFile(...args),
    registerWebhook: (...args: any[]) => mockRegisterWebhook(...args),
  })),
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

// Mock audit logger
vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

// Mock workflow renderer
vi.mock('../../src/modules/cicd/workflow-renderer.js', () => ({
  renderWorkflowYaml: vi.fn().mockResolvedValue('name: Deploy\non: [push]\njobs:\n  deploy:\n    runs-on: ubuntu-latest'),
  hashWorkflowContent: vi.fn().mockReturnValue('mockedhash1234567890abcdef1234567890abcdef'),
}));

// Mock config
vi.mock('../../src/config/index.js', () => ({
  config: {
    github: {
      webhookSecret: 'test-secret',
    },
  },
}));

import { CicdIntegrator } from '../../src/modules/cicd/cicd-integrator.js';

describe('CicdIntegrator', () => {
  let integrator: CicdIntegrator;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_URL = 'https://api.scape.io';
    integrator = new CicdIntegrator();
  });

  it('orchestrates workflow rendering, commit, webhook registration, and deployment record', async () => {
    mockCommitWorkflowFile.mockResolvedValueOnce({
      success: true,
      sha: 'commit-sha-999',
      message: 'Workflow successfully committed',
    });

    mockRegisterWebhook.mockResolvedValueOnce({
      success: true,
      hookId: 123456,
      message: 'Webhook registered successfully',
    });

    // Mock deployments INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'dep-test-123' }],
    });

    const result = await integrator.integrate({
      serviceId: 'svc-123',
      serviceName: 'my-service',
      templateId: 'tpl-nodejs',
      region: 'ap-south-1',
      repositoryUrl: 'https://github.com/test-org/test-repo',
      terraformOutputs: {
        service_endpoint: { value: 'http://my-alb.amazonaws.com' },
        repository_url: { value: '123456.dkr.ecr.ap-south-1.amazonaws.com/my-service' },
        ecs_cluster_name: { value: 'my-service-cluster' },
        ecs_service_name: { value: 'my-service-service' },
        ecs_task_definition_family: { value: 'my-service-task' },
      },
    });

    expect(result.workflowCommitted).toBe(true);
    expect(result.webhookRegistered).toBe(true);
    expect(result.workflowSha).toBe('commit-sha-999');
    expect(result.deploymentRecordId).toBe('dep-test-123');
    expect(mockCommitWorkflowFile).toHaveBeenCalledTimes(1);
    expect(mockRegisterWebhook).toHaveBeenCalledTimes(1);
  });

  it('skips CI/CD integration when repository URL is missing', async () => {
    const result = await integrator.integrate({
      serviceId: 'svc-no-repo',
      serviceName: 'no-repo-service',
      templateId: 'tpl-nodejs',
      region: 'ap-south-1',
      repositoryUrl: '',
      terraformOutputs: {},
    });

    expect(result.workflowCommitted).toBe(false);
    expect(result.errors).toContain('No repository URL available');
    expect(mockCommitWorkflowFile).not.toHaveBeenCalled();
  });
});
