import {
  GetProductsCommand,
  PricingClient,
  type Filter,
} from '@aws-sdk/client-pricing';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface PricingProduct {
  product?: {
    attributes?: Record<string, string>;
  };
  terms?: {
    OnDemand?: Record<string, {
      priceDimensions?: Record<string, {
        unit?: string;
        description?: string;
        beginRange?: string;
        pricePerUnit?: Record<string, string>;
      }>;
    }>;
  };
}

export interface ServiceCostEstimateInput {
  region: string;
  modulePath: string;
  computeMode: 'fargate' | 'ec2';
  ec2InstanceType?: string;
  requestedVcpu: number;
  requestedMemoryGiB: number;
  expectedDurationHours: number;
}

export interface ServiceCostEstimate {
  available: boolean;
  currency: 'USD';
  expectedDurationHours: number;
  hourlyEstimateUsd: number | null;
  totalEstimateUsd: number | null;
  includedResources: string[];
  exclusions: string[];
  message: string;
  pricedAt: string | null;
}

let pricingClientPromise: Promise<PricingClient> | undefined;
const productCache = new Map<string, { expiresAt: number; products: PricingProduct[] }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function getPricingEstimateFailureMessage(error: unknown): string {
  const pricingError = error as { name?: unknown; message?: unknown } | null;
  const errorName = typeof pricingError?.name === 'string' ? pricingError.name : '';
  const errorMessage = typeof pricingError?.message === 'string' ? pricingError.message : '';

  if (errorName === 'AccessDeniedException' || errorName === 'AccessDenied') {
    return 'AWS denied access to the Pricing API. Re-apply the SCAPE foundation IAM policy so CostExplorerReadRole includes pricing:GetProducts, then retry.';
  }
  if (
    errorMessage.startsWith('AWS Price List returned no ')
    || errorMessage === 'AWS Price List did not contain a matching hourly on-demand rate.'
  ) {
    return errorMessage;
  }
  return 'Could not retrieve current AWS Pricing data. Check the configured AWS cost role and Pricing API access, then retry.';
}

async function getPricingClient(): Promise<PricingClient> {
  if (!pricingClientPromise) {
    const pendingClient = (async () => {
      if (config.aws.costExplorerRoleArn) {
        const sts = new STSClient({ region: config.aws.region });
        const response = await sts.send(new AssumeRoleCommand({
          RoleArn: config.aws.costExplorerRoleArn,
          RoleSessionName: 'scape-price-estimate',
          DurationSeconds: 1800,
        }));
        if (!response.Credentials) {
          throw new Error('AWS pricing role returned no credentials.');
        }
        return new PricingClient({
          region: 'us-east-1',
          credentials: {
            accessKeyId: response.Credentials.AccessKeyId!,
            secretAccessKey: response.Credentials.SecretAccessKey!,
            sessionToken: response.Credentials.SessionToken,
          },
        });
      }
      if (config.nodeEnv === 'production') {
        throw new Error('AWS_COST_EXPLORER_ROLE_ARN must be configured for cost estimates.');
      }
      return new PricingClient({ region: 'us-east-1' });
    })();
    pricingClientPromise = pendingClient.catch((error: unknown) => {
      pricingClientPromise = undefined;
      throw error;
    });
  }
  return pricingClientPromise;
}

async function getProducts(serviceCode: string, filters: Filter[]): Promise<PricingProduct[]> {
  const cacheKey = `${serviceCode}:${JSON.stringify(filters)}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.products;

  const client = await getPricingClient();
  const products: PricingProduct[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.send(new GetProductsCommand({
      ServiceCode: serviceCode,
      Filters: filters,
      FormatVersion: 'aws_v1',
      MaxResults: 100,
      NextToken: nextToken,
    }));
    for (const product of response.PriceList ?? []) {
      products.push(JSON.parse(product) as PricingProduct);
    }
    nextToken = response.NextToken;
  } while (nextToken);

  if (products.length === 0) {
    throw new Error(`AWS Price List returned no ${serviceCode} products for the selected configuration.`);
  }
  productCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, products });
  return products;
}

function termMatch(field: string, value: string): Filter {
  return { Type: 'TERM_MATCH', Field: field, Value: value };
}

function findHourlyPrice(
  products: PricingProduct[],
  matches: (attributes: Record<string, string>) => boolean = () => true,
  descriptionIncludes?: string,
): number {
  const rates: number[] = [];
  for (const product of products) {
    const attributes = product.product?.attributes ?? {};
    if (!matches(attributes)) continue;
    for (const term of Object.values(product.terms?.OnDemand ?? {})) {
      for (const dimension of Object.values(term.priceDimensions ?? {})) {
        const unit = dimension.unit?.toLowerCase() ?? '';
        if (!unit.includes('hour') && !['hr', 'hrs'].includes(unit)) continue;
        if (descriptionIncludes && !dimension.description?.toLowerCase().includes(descriptionIncludes.toLowerCase())) continue;
        const price = Number(dimension.pricePerUnit?.USD);
        if (Number.isFinite(price) && price > 0 && (dimension.beginRange === undefined || dimension.beginRange === '0')) {
          rates.push(price);
        }
      }
    }
  }
  if (rates.length === 0) throw new Error('AWS Price List did not contain a matching hourly on-demand rate.');
  return Math.min(...rates);
}

async function getEc2Rate(region: string, instanceType: string): Promise<number> {
  const products = await getProducts('AmazonEC2', [
    termMatch('regionCode', region),
    termMatch('instanceType', instanceType),
    termMatch('operatingSystem', 'Linux'),
    termMatch('tenancy', 'Shared'),
    termMatch('preInstalledSw', 'NA'),
    termMatch('capacitystatus', 'Used'),
  ]);
  return findHourlyPrice(products, (attributes) =>
    attributes.regionCode === region
    && attributes.instanceType === instanceType
    && attributes.operatingSystem === 'Linux'
    && attributes.tenancy === 'Shared'
    && attributes.preInstalledSw === 'NA'
    && attributes.capacitystatus === 'Used');
}

async function getRdsRate(region: string): Promise<number> {
  const products = await getProducts('AmazonRDS', [
    termMatch('regionCode', region),
    termMatch('instanceType', 'db.t3.micro'),
    termMatch('databaseEngine', 'PostgreSQL'),
    termMatch('deploymentOption', 'Single-AZ'),
  ]);
  return findHourlyPrice(products, (attributes) =>
    attributes.regionCode === region
    && attributes.instanceType === 'db.t3.micro'
    && attributes.databaseEngine === 'PostgreSQL'
    && attributes.deploymentOption === 'Single-AZ');
}

async function getApplicationLoadBalancerRate(region: string): Promise<number> {
  const products = await getProducts('AWSELB', [
    termMatch('regionCode', region),
    termMatch('productFamily', 'Load Balancer'),
  ]);
  return findHourlyPrice(
    products,
    (attributes) => attributes.regionCode === region
      && attributes.productFamily === 'Load Balancer'
      && /application/i.test(attributes.loadBalancerType ?? ''),
    'application',
  );
}

async function getFargateRate(region: string, resource: 'vCPU' | 'GB'): Promise<number> {
  const products = await getProducts('AmazonECS', [
    termMatch('regionCode', region),
    termMatch('operatingSystem', 'Linux'),
  ]);
  const usage = resource === 'vCPU' ? 'fargate-vcpu-hours' : 'fargate-gb-hours';
  const matchingProducts = products.filter((product) =>
    (product.product?.attributes?.usagetype ?? '').toLowerCase().includes(usage));
  return findHourlyPrice(matchingProducts);
}

export async function estimateServiceCost(input: ServiceCostEstimateInput): Promise<ServiceCostEstimate> {
  const base = {
    currency: 'USD' as const,
    expectedDurationHours: input.expectedDurationHours,
    includedResources: [] as string[],
    exclusions: [
      'Storage (including RDS and EBS), data transfer, request volume, backups, logs, and taxes are excluded.',
      'AWS Cost Explorer billed totals can arrive later than the usage date.',
    ],
  };

  if (input.modulePath.endsWith('/static-frontend')) {
    return {
      ...base,
      available: false,
      hourlyEstimateUsd: null,
      totalEstimateUsd: null,
      message: 'Static hosting charges depend on storage, requests, and data transfer; this template has no reliable fixed hourly estimate.',
      pricedAt: null,
    };
  }
  if (!input.modulePath.endsWith('/nodejs-api')) {
    throw new Error('A cost estimate is not available for this infrastructure template.');
  }

  let prices: number[];
  try {
    prices = await Promise.all([
      input.computeMode === 'ec2'
        ? getEc2Rate(input.region, input.ec2InstanceType ?? 't3.small')
        : Promise.all([
            getFargateRate(input.region, 'vCPU'),
            getFargateRate(input.region, 'GB'),
          ]).then(([vcpuRate, memoryRate]) =>
            vcpuRate * input.requestedVcpu + memoryRate * input.requestedMemoryGiB),
      getRdsRate(input.region),
      getApplicationLoadBalancerRate(input.region),
    ]);
  } catch (error) {
    logger.error({ err: error, region: input.region, computeMode: input.computeMode }, 'AWS Pricing estimate failed');
    throw new Error(getPricingEstimateFailureMessage(error));
  }
  const hourlyEstimateUsd = prices.reduce((sum, price) => sum + price, 0);

  return {
    ...base,
    available: true,
    hourlyEstimateUsd: Number(hourlyEstimateUsd.toFixed(6)),
    totalEstimateUsd: Number((hourlyEstimateUsd * input.expectedDurationHours).toFixed(2)),
    includedResources: [
      input.computeMode === 'ec2' ? `One ${input.ec2InstanceType ?? 't3.small'} EC2 instance` : 'One Linux Fargate task',
      'One db.t3.micro PostgreSQL RDS instance',
      'One Application Load Balancer',
    ],
    message: `Estimated fixed baseline for ${input.expectedDurationHours} hours. The estimate assumes one running application task and uses current AWS on-demand list rates; variable charges are not included.`,
    pricedAt: new Date().toISOString(),
  };
}
