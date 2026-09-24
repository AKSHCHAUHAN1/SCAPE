import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handlebars from 'handlebars';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WorkflowTemplateData {
  serviceName: string;
  awsRegion: string;
  ecrRepository?: string;
  ecsCluster?: string;
  ecsService?: string;
  taskDefinition?: string;
  s3BucketName?: string;
  cloudFrontDistributionId?: string;
  awsRoleArn?: string;
}

/**
 * Render GitHub Actions workflow YAML from Handlebars template.
 */
export async function renderWorkflowYaml(
  templateName: 'nodejs-api' | 'static-frontend' | string,
  data: WorkflowTemplateData,
): Promise<string> {
  try {
    // Template files are at server/src/templates/workflows/
    const templateFilePath = path.resolve(
      __dirname,
      '../../templates/workflows',
      `${templateName}.yml.hbs`,
    );

    const templateContent = await fs.readFile(templateFilePath, 'utf-8');
    const compiled = handlebars.compile(templateContent);
    return compiled(data);
  } catch (err: any) {
    logger.warn({ err: err.message, templateName }, 'Could not read template file, using fallback template');

    // Fallback template
    return `name: Deploy — ${data.serviceName}
on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: ${data.awsRegion || 'us-east-1'}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy step
        run: echo "Deploying ${data.serviceName} to AWS region ${data.awsRegion}"
`;
  }
}
