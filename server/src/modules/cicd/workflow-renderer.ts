/**
 * Workflow Renderer
 * Spec: 08-CICD-Integration
 *
 * Renders GitHub Actions workflow YAML from Handlebars templates.
 * Each service template type has its own workflow template:
 * - nodejs-api.yml.hbs → build, test, docker, ECR push, ECS deploy
 * - static-frontend.yml.hbs → build, S3 sync, CloudFront invalidate
 *
 * ADR-021: Template-per-service-type over dynamic workflow generation
 *
 * Performance: workflow rendering < 100ms
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import handlebars from 'handlebars';
import { logger } from '../../utils/logger.js';
import type { WorkflowTemplateData, ServiceTemplateType } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Template Cache (compiled Handlebars templates)
// ---------------------------------------------------------------------------

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Load and compile a Handlebars template, with caching.
 */
async function getCompiledTemplate(
  templateName: string,
): Promise<HandlebarsTemplateDelegate> {
  const cached = templateCache.get(templateName);
  if (cached) return cached;

  const templateFilePath = path.resolve(
    __dirname,
    '../../templates/workflows',
    `${templateName}.yml.hbs`,
  );

  const templateContent = await fs.readFile(templateFilePath, 'utf-8');
  const compiled = handlebars.compile(templateContent);
  templateCache.set(templateName, compiled);

  return compiled;
}

// ---------------------------------------------------------------------------
// Fallback Templates
// ---------------------------------------------------------------------------

const FALLBACK_NODEJS_API = (data: WorkflowTemplateData) => `name: Deploy — ${data.serviceName}

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: ${data.awsRegion || ''}

permissions:
  id-token: write
  contents: read

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${data.awsRegion || ''}
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push Docker image
        run: |
          docker build -t \${{ steps.login-ecr.outputs.registry }}/${data.ecrRepository || 'app'}:\${{ github.sha }} .
          docker push \${{ steps.login-ecr.outputs.registry }}/${data.ecrRepository || 'app'}:\${{ github.sha }}
      - name: Deploy to ECS
        run: echo "Deploy step — configure ECS deployment"
`;

const FALLBACK_STATIC_FRONTEND = (data: WorkflowTemplateData) => `name: Deploy — ${data.serviceName}

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: ${data.awsRegion || ''}

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${data.awsRegion || ''}
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://${data.s3BucketName || 'bucket'}/ --delete
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${data.cloudFrontDistributionId || 'DISTRIBUTION_ID'} --paths "/*"
`;

const FALLBACK_CONTAINER_API = (data: WorkflowTemplateData) => `name: Deploy — ${data.serviceName}

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: ${data.awsRegion || ''}
  ECR_REPOSITORY: ${data.ecrRepository || 'app'}
  ECS_CLUSTER: ${data.ecsCluster || 'cluster'}
  ECS_SERVICE: ${data.ecsService || 'service'}

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${data.awsRoleArn || '${{ secrets.AWS_DEPLOY_ROLE_ARN }}'}
          aws-region: ${data.awsRegion || ''}
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE" --desired-count 1 --force-new-deployment
          aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render GitHub Actions workflow YAML from a Handlebars template.
 *
 * Falls back to an inline template if the .hbs file cannot be read.
 */
export async function renderWorkflowYaml(
  templateName: ServiceTemplateType | string,
  data: WorkflowTemplateData,
): Promise<string> {
  const normalizedData = {
    ...data,
    s3Bucket: data.s3BucketName || (data as any).s3Bucket,
    s3BucketName: data.s3BucketName || (data as any).s3Bucket,
    cloudfrontDistributionId: data.cloudFrontDistributionId || (data as any).cloudfrontDistributionId,
    cloudFrontDistributionId: data.cloudFrontDistributionId || (data as any).cloudfrontDistributionId,
  };

  try {
    const compiled = await getCompiledTemplate(templateName);
    return compiled(normalizedData);
  } catch (err: any) {
    logger.warn(
      { err: err.message, templateName },
      'Could not read Handlebars template file, using fallback template',
    );

    // Fallback templates
    if (templateName === 'static-frontend') {
      return FALLBACK_STATIC_FRONTEND(normalizedData);
    }
    return templateName === 'nodejs-api'
      ? FALLBACK_NODEJS_API(normalizedData)
      : FALLBACK_CONTAINER_API(normalizedData);
  }
}

/**
 * Validate that the rendered YAML is not empty and contains expected keys.
 */
export function validateWorkflowYaml(yaml: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!yaml || yaml.trim().length === 0) {
    errors.push('Rendered workflow YAML is empty');
  }

  if (!yaml.includes('name:')) {
    errors.push('Workflow YAML is missing "name" field');
  }

  if (!yaml.includes('on:')) {
    errors.push('Workflow YAML is missing "on" trigger field');
  }

  if (!yaml.includes('jobs:')) {
    errors.push('Workflow YAML is missing "jobs" field');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a SHA-256 hash of the workflow content.
 * Stored in the deployments table for audit purposes.
 */
export function hashWorkflowContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Clear the template cache (useful for testing or hot-reload).
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
