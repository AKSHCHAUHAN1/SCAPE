import { query } from '../../database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getServiceById } from '../services/services.service.js';
import { AwsCostExplorerClient } from './explorer-client.js';
import { logger } from '../../utils/logger.js';
import type { RecordCostInput } from './cost.schema.js';
import type { ServiceCostEstimateRequest } from './cost.schema.js';
import { estimateServiceCost as estimateInfrastructureCost } from './cost-estimator.js';

interface CostRecordRow {
  id: string;
  service_id: string;
  period_start: string;
  period_end: string;
  amount_usd: string;
  currency: string;
  aws_resource_ids: any;
  aws_service_costs: any;
  synced_at: Date;
  created_at: Date;
}

export async function estimateConfiguredServiceCost(input: ServiceCostEstimateRequest) {
  const template = await query<{ terraform_module_path: string }>(
    'SELECT terraform_module_path FROM service_templates WHERE id = $1 AND is_active = true',
    [input.templateId],
  );
  if (!template.rowCount) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Service template not found or inactive.');
  }
  try {
    return await estimateInfrastructureCost({
      region: input.region,
      modulePath: template.rows[0].terraform_module_path,
      computeMode: input.computeMode,
      ec2InstanceType: input.ec2InstanceType,
      requestedVcpu: input.requestedVcpu,
      requestedMemoryGiB: input.requestedMemoryGiB,
      expectedDurationHours: input.expectedDurationHours,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not retrieve current AWS Pricing data.';
    throw new AppError(503, 'COST_ESTIMATE_UNAVAILABLE', message);
  }
}

function formatCostRecord(row: CostRecordRow) {
  // period_start / period_end are returned as strings from PostgreSQL date columns
  const pStart = String(row.period_start).substring(0, 10);
  const pEnd = String(row.period_end).substring(0, 10);

  return {
    id: row.id,
    serviceId: row.service_id,
    periodStart: pStart,
    periodEnd: pEnd,
    amountUsd: parseFloat(row.amount_usd),
    currency: row.currency,
    awsServices: Array.isArray(row.aws_resource_ids)
      ? row.aws_resource_ids.filter((service: unknown): service is string =>
          typeof service === 'string' && service !== 'AWS service')
      : [],
    awsServiceCosts: Array.isArray(row.aws_service_costs) ? row.aws_service_costs : [],
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  };
}

/**
 * Get cost history for a specific service.
 */
export async function getCostsByServiceId(
  serviceId: string,
  period: string | undefined,
  ownerId: string,
) {
  const service = await getServiceById(serviceId, ownerId);

  let q = `SELECT * FROM cost_records WHERE service_id = $1`;
  const params: any[] = [serviceId];

  if (period) {
    q += ` AND TO_CHAR(period_start, 'YYYY-MM') = $2`;
    params.push(period);
  }

  q += ` ORDER BY period_start ASC`;

  const result = await query<CostRecordRow>(q, params);
  const records = result.rows.map(formatCostRecord);

  // Calculate aggregations
  const totalAmount = records.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const startedAt = service.infrastructureStartedAt
    ? new Date(service.infrastructureStartedAt).getTime()
    : null;
  const completedAt = service.infrastructureDecommissionedAt
    ? new Date(service.infrastructureDecommissionedAt).getTime()
    : Date.now();
  const actualRuntimeHours = startedAt === null
    ? null
    : Math.max(0, (completedAt - startedAt) / (60 * 60 * 1000));

  // Use only exact AWS service-group amounts returned by Cost Explorer.
  const awsServiceBreakdown: Record<string, number> = {};
  for (const r of records) {
    for (const serviceCost of r.awsServiceCosts) {
      awsServiceBreakdown[serviceCost.serviceName] =
        (awsServiceBreakdown[serviceCost.serviceName] || 0) + Number(serviceCost.amountUsd);
    }
  }

  return {
    serviceId,
    serviceStatus: service.status,
    hasAwsData: records.length > 0,
    totalUsd: records.length ? parseFloat(totalAmount.toFixed(2)) : null,
    expectedDurationHours: service.expectedDurationHours,
    actualRuntimeHours: actualRuntimeHours === null ? null : Number(actualRuntimeHours.toFixed(2)),
    records,
    awsServiceBreakdown: Object.entries(awsServiceBreakdown).map(([serviceName, amount]) => ({
      serviceName,
      amountUsd: parseFloat(amount.toFixed(2)),
    })),
  };
}

/**
 * Get aggregate cost summary across services owned by one account.
 */
function emptyCostSummary(servicesCount = 0) {
  return {
    hasAwsData: false,
    totalCostUsd: null,
    monthlyCostUsd: null,
    servicesCount,
    servicesCosts: [],
    monthlyTrend: [],
  };
}

export async function getCostSummary(ownerId: string) {
  const services = await query(
    'SELECT id, name, status FROM services WHERE owner_id = $1',
    [ownerId],
  );
  const serviceIds = services.rows.map((s: any) => s.id);

  if (serviceIds.length === 0) {
    return emptyCostSummary();
  }

  const costRes = await query<CostRecordRow>(
    `SELECT * FROM cost_records 
     WHERE service_id = ANY($1::uuid[]) 
     ORDER BY period_start ASC`,
    [serviceIds],
  );

  const records = costRes.rows.map(formatCostRecord);
  const hasAwsData = records.length > 0;
  const totalCostUsd = hasAwsData
    ? parseFloat(records.reduce((acc, r) => acc + r.amountUsd, 0).toFixed(2))
    : null;

  // Current month cost
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthRecords = records.filter((r) => r.periodStart.startsWith(currentMonthStr));
  const currentMonthCost = currentMonthRecords.length
    ? parseFloat(currentMonthRecords.reduce((acc, r) => acc + r.amountUsd, 0).toFixed(2))
    : null;

  // Monthly trend
  const trendMap: Record<string, number> = {};
  for (const r of records) {
    const month = r.periodStart.substring(0, 7);
    trendMap[month] = (trendMap[month] || 0) + r.amountUsd;
  }

  const monthlyTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month,
      amountUsd: parseFloat(amount.toFixed(2)),
    }));

  // Cost per service
  const serviceCostMap: Record<string, number> = {};
  for (const r of records) {
    serviceCostMap[r.serviceId] = (serviceCostMap[r.serviceId] || 0) + r.amountUsd;
  }

  const servicesCosts = services.rows.map((s: any) => ({
    serviceId: s.id,
    serviceName: s.name,
    totalUsd: records.some((r) => r.serviceId === s.id)
      ? parseFloat((serviceCostMap[s.id] || 0).toFixed(2))
      : null,
  }));

  return {
    hasAwsData,
    totalCostUsd,
    monthlyCostUsd: currentMonthCost,
    servicesCount: services.rows.length,
    servicesCosts,
    monthlyTrend,
  };
}

/**
 * Upsert cost record idempotently.
 */
export async function upsertCostRecord(input: RecordCostInput) {
  const result = await query<CostRecordRow>(
    `INSERT INTO cost_records (service_id, period_start, period_end, amount_usd, currency, aws_resource_ids, aws_service_costs, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())
     ON CONFLICT (service_id, period_start, period_end)
     DO UPDATE SET
       amount_usd = EXCLUDED.amount_usd,
       currency = EXCLUDED.currency,
       aws_resource_ids = EXCLUDED.aws_resource_ids,
       aws_service_costs = EXCLUDED.aws_service_costs,
       synced_at = NOW()
     RETURNING *`,
    [
      input.serviceId,
      input.periodStart,
      input.periodEnd,
      input.amountUsd,
      input.currency || 'USD',
      JSON.stringify(input.awsServices || []),
      JSON.stringify(input.awsServiceCosts || []),
    ],
  );

  return formatCostRecord(result.rows[0]);
}

/**
 * Worker: sync daily costs from AWS Cost Explorer.
 */
export async function syncDailyCosts() {
  const client = new AwsCostExplorerClient();
  const today = new Date();
  const lookbackStart = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const startDate = lookbackStart.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const items = await client.fetchCostsByService(startDate, endDate);

  if (items.length > 0) {
    const dailyServiceCosts = new Map<string, {
      serviceId: string;
      periodStart: string;
      periodEnd: string;
      amountUsd: number;
      awsServices: Set<string>;
      awsServiceCosts: Map<string, number>;
    }>();
    for (const item of items) {
      const key = `${item.serviceId}:${item.periodStart}:${item.periodEnd}`;
      const current = dailyServiceCosts.get(key) ?? {
        serviceId: item.serviceId,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        amountUsd: 0,
        awsServices: new Set<string>(),
        awsServiceCosts: new Map<string, number>(),
      };
      current.amountUsd += item.amountUsd;
      if (item.awsService) {
        current.awsServices.add(item.awsService);
        current.awsServiceCosts.set(
          item.awsService,
          (current.awsServiceCosts.get(item.awsService) ?? 0) + item.amountUsd,
        );
      }
      dailyServiceCosts.set(key, current);
    }

    for (const dailyCost of dailyServiceCosts.values()) {
      await upsertCostRecord({
        serviceId: dailyCost.serviceId,
        periodStart: dailyCost.periodStart,
        periodEnd: dailyCost.periodEnd,
        amountUsd: dailyCost.amountUsd,
        currency: 'USD',
        awsServices: [...dailyCost.awsServices],
        awsServiceCosts: [...dailyCost.awsServiceCosts].map(([serviceName, amountUsd]) => ({
          serviceName,
          amountUsd,
        })),
      });
    }
    logger.info({ count: dailyServiceCosts.size }, 'Synced AWS Cost Explorer records');
    return dailyServiceCosts.size;
  }

  return 0;
}
