import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface ServiceCostItem {
  serviceId: string;
  amountUsd: number;
  periodStart: string;
  periodEnd: string;
  resourceIds: string[];
}

export class AwsCostExplorerClient {
  private ceClient: CostExplorerClient | null = null;

  private async getClient(): Promise<CostExplorerClient> {
    if (this.ceClient) return this.ceClient;

    if (config.aws.costExplorerRoleArn) {
      try {
        const sts = new STSClient({ region: config.aws.region });
        const res = await sts.send(
          new AssumeRoleCommand({
            RoleArn: config.aws.costExplorerRoleArn,
            RoleSessionName: 'forge-cost-sync',
            DurationSeconds: 1800,
          }),
        );
        if (res.Credentials) {
          this.ceClient = new CostExplorerClient({
            region: 'us-east-1', // Cost Explorer is only available in us-east-1
            credentials: {
              accessKeyId: res.Credentials.AccessKeyId!,
              secretAccessKey: res.Credentials.SecretAccessKey!,
              sessionToken: res.Credentials.SessionToken,
            },
          });
          return this.ceClient;
        }
      } catch (err) {
        logger.error({ err }, 'Could not assume Cost Explorer read role');
        throw err;
      }
    }

    if (config.nodeEnv === 'production') {
      throw new Error('AWS_COST_EXPLORER_ROLE_ARN must be configured in production.');
    }

    this.ceClient = new CostExplorerClient({ region: 'us-east-1' });
    return this.ceClient;
  }

  /**
   * Fetch daily costs grouped by forge:service-id tag.
   */
  async fetchCostsByService(startDate: string, endDate: string): Promise<ServiceCostItem[]> {
    try {
      const client = await this.getClient();
      const results: ServiceCostItem[] = [];
      let nextPageToken: string | undefined;

      do {
        const response = await client.send(new GetCostAndUsageCommand({
          TimePeriod: { Start: startDate, End: endDate },
          Granularity: 'DAILY',
          Metrics: ['UnblendedCost'],
          GroupBy: [
            { Type: 'TAG', Key: 'forge:service-id' },
            { Type: 'DIMENSION', Key: 'SERVICE' },
          ],
          NextPageToken: nextPageToken,
        }));

        for (const period of response.ResultsByTime || []) {
          const pStart = period.TimePeriod?.Start || startDate;
          const pEnd = period.TimePeriod?.End || endDate;

          for (const group of period.Groups || []) {
            const rawTag = group.Keys?.[0] || '';
            const serviceTag = rawTag.split('$')[1] || '';
            const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');

            if (serviceTag && amount > 0) {
              results.push({
                serviceId: serviceTag,
                amountUsd: amount,
                periodStart: pStart,
                periodEnd: pEnd,
                resourceIds: [group.Keys?.[1] || 'AWS service'],
              });
            }
          }
        }

        nextPageToken = response.NextPageToken;
      } while (nextPageToken);

      return results;
    } catch (err) {
      logger.error({ err }, 'AWS Cost Explorer request failed');
      throw err;
    }
  }
}
