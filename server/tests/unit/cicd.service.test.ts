import { describe, it, expect } from 'vitest';
import { renderWorkflowYaml } from '../../src/modules/cicd/workflow-renderer.js';
import { GitHubIntegrator } from '../../src/modules/cicd/github-client.js';

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
    it('should correctly parse owner and repo from various git URLs', () => {
      const gh = new GitHubIntegrator();
      expect(gh.parseRepoUrl('https://github.com/myorg/myservice.git')).toEqual({
        owner: 'myorg',
        repo: 'myservice',
      });
      expect(gh.parseRepoUrl('git@github.com:myorg/myservice.git')).toEqual({
        owner: 'myorg',
        repo: 'myservice',
      });
      expect(gh.parseRepoUrl('https://github.com/myorg/myservice')).toEqual({
        owner: 'myorg',
        repo: 'myservice',
      });
      expect(gh.parseRepoUrl('invalid-url')).toBeNull();
    });
  });
});
