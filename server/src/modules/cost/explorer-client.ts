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

    if (config.aws.provisioningRoleArn) {
      try {
        const sts = new STSClient({ region: config.aws.region });
        const res = await sts.send(
          new AssumeRoleCommand({
            RoleArn: config.aws.provisioningRoleArn,
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
        logger.warn({ err }, 'Could not assume STS role for Cost Explorer, using default credentials');
      }
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
      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        GroupBy: [
          { Type: 'TAG', Key: 'forge:service-id' },
          { Type: 'DIMENSION', Key: 'SERVICE' },
        ],
      });

      const response = await client.send(command);
      const results: ServiceCostItem[] = [];

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
              resourceIds: [group.Keys?.[1] || 'AWS-Resource'],
            });
          }
        }
      }

      return results;
    } catch (err: any) {
      logger.info({ err: err.message }, 'AWS Cost Explorer unavailable, fallback to simulated cost data');
      return [];
    }
  }
}
