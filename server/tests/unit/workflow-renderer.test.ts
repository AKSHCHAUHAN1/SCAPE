import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderWorkflowYaml,
  validateWorkflowYaml,
  hashWorkflowContent,
  clearTemplateCache,
} from '../../src/modules/cicd/workflow-renderer.js';

describe('WorkflowRenderer', () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  describe('renderWorkflowYaml', () => {
    it('renders nodejs-api workflow YAML with provided data', async () => {
      const data = {
        serviceName: 'order-service',
        awsRegion: 'ap-south-1',
        ecrRepository: 'order-service-repo',
        ecsCluster: 'order-service-cluster',
        ecsService: 'order-service-service',
        taskDefinition: 'order-service-task',
        awsRoleArn: 'arn:aws:iam::123456789012:role/scape-deploy-role',
      };

      const yaml = await renderWorkflowYaml('nodejs-api', data);

      expect(yaml).toContain('Deploy — order-service');
      expect(yaml).toContain('AWS_REGION: ap-south-1');
      expect(yaml).toContain('ECR_REPOSITORY: order-service-repo');
      expect(yaml).toContain('ECS_CLUSTER: order-service-cluster');
      expect(yaml).toContain('role-to-assume: arn:aws:iam::123456789012:role/scape-deploy-role');
      expect(yaml).toContain('uses: actions/checkout@v4');
    });

    it('renders static-frontend workflow YAML with S3 and CloudFront', async () => {
      const data = {
        serviceName: 'dashboard-frontend',
        awsRegion: 'us-east-1',
        s3BucketName: 'dashboard-static-bucket',
        cloudFrontDistributionId: 'E1A2B3C4D5E6F',
        awsRoleArn: 'arn:aws:iam::123456789012:role/scape-deploy-role',
      };

      const yaml = await renderWorkflowYaml('static-frontend', data);

      expect(yaml).toContain('Deploy — dashboard-frontend');
      expect(yaml).toContain('S3_BUCKET: dashboard-static-bucket');
      expect(yaml).toContain('E1A2B3C4D5E6F');
    });

    it('falls back to default template if file does not exist', async () => {
      const data = {
        serviceName: 'unknown-service',
        awsRegion: 'ap-south-1',
      };

      const yaml = await renderWorkflowYaml('unknown-template-type' as any, data);
      expect(yaml).toContain('Deploy — unknown-service');
      expect(yaml).toContain('AWS_REGION: ap-south-1');
    });
  });

  describe('validateWorkflowYaml', () => {
    it('validates valid workflow YAML successfully', () => {
      const validYaml = `
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
`;
      const result = validateWorkflowYaml(validYaml);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty or malformed workflow YAML', () => {
      const emptyResult = validateWorkflowYaml('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors).toContain('Rendered workflow YAML is empty');

      const invalidResult = validateWorkflowYaml('echo "hello world"');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('hashWorkflowContent', () => {
    it('generates consistent SHA-256 hash for workflow content', () => {
      const content = 'name: Test Pipeline';
      const hash1 = hashWorkflowContent(content);
      const hash2 = hashWorkflowContent(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates different hash for different content', () => {
      const hashA = hashWorkflowContent('pipeline A');
      const hashB = hashWorkflowContent('pipeline B');

      expect(hashA).not.toBe(hashB);
    });
  });
});
