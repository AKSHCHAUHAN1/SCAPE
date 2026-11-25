import { describe, it, expect, vi } from 'vitest';
import { renderWorkflowYaml } from '../../src/modules/cicd/workflow-renderer.js';
import { GitHubIntegrator } from '../../src/modules/cicd/github-client.js';

const { mockGetRepository, mockListRepositories } = vi.hoisted(() => ({
  mockGetRepository: vi.fn(),
  mockListRepositories: vi.fn(),
}));

vi.mock('../../src/modules/cicd/github-app-auth.js', () => ({
  createAuthenticatedOctokit: vi.fn(() => Promise.resolve({
    repos: { get: mockGetRepository },
    apps: { listReposAccessibleToInstallation: mockListRepositories },
    paginate: vi.fn((operation: () => Promise<{ data: { repositories: unknown[] } }>) =>
      operation().then((response) => response.data.repositories)),
  })),
}));

describe('CI/CD Integration - Unit Tests', () => {
  describe('renderWorkflowYaml()', () => {
    it('should render a valid GitHub Actions workflow YAML for nodejs-api', async () => {
      const yaml = await renderWorkflowYaml('nodejs-api', {
        serviceName: 'payments-api',
        awsRegion: 'us-east-1',
        ecrRepository: 'payments-repo',
        ecsCluster: 'production-cluster',
        ecsService: 'payments-service',
        taskDefinition: 'payments-task',
        awsRoleArn: 'arn:aws:iam::123456789012:role/forge-deploy',
      });

      expect(yaml).toContain('name: Deploy — payments-api');
      expect(yaml).toContain('AWS_REGION: us-east-1');
      expect(yaml).toContain('ECR_REPOSITORY: payments-repo');
      expect(yaml).toContain('ECS_CLUSTER: production-cluster');
      expect(yaml).toContain('build-and-deploy');
    });

    it('should render fallback workflow for unknown template', async () => {
      const yaml = await renderWorkflowYaml('unknown-template-xyz', {
        serviceName: 'custom-svc',
        awsRegion: 'eu-west-1',
      });

      expect(yaml).toContain('custom-svc');
      expect(yaml).toContain('eu-west-1');
    });
  });

  describe('GitHubIntegrator.parseRepoUrl()', () => {
    it('parses only HTTPS GitHub repository URLs', () => {
      const gh = new GitHubIntegrator();
      expect(gh.parseRepoUrl('https://github.com/myorg/myservice.git')).toEqual({
        owner: 'myorg',
        repo: 'myservice',
      });
      expect(gh.parseRepoUrl('https://github.com/myorg/myservice')).toEqual({
        owner: 'myorg',
        repo: 'myservice',
      });
      expect(gh.parseRepoUrl('invalid-url')).toBeNull();
      expect(gh.parseRepoUrl('https://github.com.evil.test/myorg/myservice')).toBeNull();
    });
  });

  describe('GitHubIntegrator repository access', () => {
    it('lists repositories available to the installation', async () => {
      mockListRepositories.mockResolvedValueOnce({
        data: {
          repositories: [{
            id: 2,
            name: 'myservice',
            full_name: 'myorg/myservice',
            html_url: 'https://github.com/myorg/myservice',
            owner: { login: 'myorg' },
          }],
        },
      });
      const gh = new GitHubIntegrator();

      await expect(gh.listAccessibleRepositories()).resolves.toEqual([{
        id: 2,
        name: 'myservice',
        fullName: 'myorg/myservice',
        htmlUrl: 'https://github.com/myorg/myservice',
        owner: 'myorg',
      }]);
    });

    it('returns immutable repository identifiers and administrator access', async () => {
      mockGetRepository.mockResolvedValueOnce({
        data: {
          html_url: 'https://github.com/myorg/myservice',
          full_name: 'myorg/myservice',
          id: 2,
          owner: { id: 1 },
          permissions: { admin: true },
        },
      });
      const gh = new GitHubIntegrator();

      await expect(gh.getRepositoryMetadata('https://github.com/myorg/myservice')).resolves.toEqual({
        htmlUrl: 'https://github.com/myorg/myservice',
        fullName: 'myorg/myservice',
        ownerId: 1,
        repositoryId: 2,
        hasAdminAccess: true,
      });
    });
  });
});
