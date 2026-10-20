import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { Layout } from '../../components/layout/Layout.js';
import { CostChart } from '../../components/data-display/CostChart.js';
import { DataTable } from '../../components/data-display/DataTable.js';
import { useCostSummary, useTriggerCostSync } from '../../hooks/useCosts.js';
import { useServiceCosts } from '../../hooks/useServiceDetail.js';
import type { CostRecord } from '../../types/index.js';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Filter,
  RotateCw,
  Server,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type CostTableRow = CostRecord | {
  id: string;
  serviceId: string;
  serviceName: string;
  totalUsd: number;
};

export const CostDashboardPage: React.FC = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const isPerService = Boolean(serviceId);
  const { user } = useAuthStore();
  const canSync = user?.role === 'admin' || user?.role === 'devops';
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const {
    data: serviceCost,
    isLoading: serviceLoading,
    error: serviceError,
    refetch: refetchService,
  } = useServiceCosts(serviceId, selectedPeriod || undefined);
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useCostSummary();
  const triggerSync = useTriggerCostSync();

  const records = serviceCost?.records ?? [];
  const serviceTrend = useMemo(() => {
    const monthly = new Map<string, number>();
    records.forEach((record) => {
      const month = record.periodStart.slice(0, 7);
      monthly.set(month, (monthly.get(month) ?? 0) + record.amountUsd);
    });
    return [...monthly.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, amountUsd]) => ({ month, amountUsd }));
  }, [records]);

  const monthlyTrend = isPerService ? serviceTrend : summary?.monthlyTrend ?? [];
  const resourceBreakdown = isPerService ? serviceCost?.resourceBreakdown ?? [] : [];
  const totalCost = isPerService ? serviceCost?.totalUsd : summary?.totalCostUsd;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const currentMonthCost = isPerService
    ? records.filter((record) => record.periodStart.startsWith(currentMonth)).reduce((sum, record) => sum + record.amountUsd, 0)
    : summary?.monthlyCostUsd;
  const previousMonthCost = monthlyTrend.find((item) => item.month === previousMonth)?.amountUsd;
  const costDelta = currentMonthCost !== undefined && previousMonthCost !== undefined
    ? currentMonthCost - previousMonthCost
    : undefined;
  const costDeltaPct = previousMonthCost && costDelta !== undefined
    ? (costDelta / previousMonthCost) * 100
    : undefined;
  const daysElapsed = new Date().getUTCDate();
  const dailyAverage = currentMonthCost !== undefined ? currentMonthCost / Math.max(daysElapsed, 1) : undefined;

  const recordsList: CostTableRow[] = isPerService
    ? records
    : (summary?.servicesCosts ?? []).map((service) => ({
        id: service.serviceId,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        totalUsd: service.totalUsd,
      }));

  const isLoading = isPerService ? serviceLoading : summaryLoading;
  const loadError = isPerService ? serviceError : summaryError;

  const handleSync = async () => {
    setSyncStatus(null);
    try {
      const result = await triggerSync.mutateAsync();
      await Promise.all([refetchService(), refetchSummary()]);
      setSyncStatus({ tone: 'success', message: `Sync complete. ${result.syncedCount} cost records updated from AWS.` });
    } catch (error) {
      setSyncStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Cost sync failed. Check the AWS integration and try again.',
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-7 pb-12">
        {isPerService && (
          <Link
            to={`/services/${serviceId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to service
          </Link>
        )}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="page-eyebrow mb-2">Cost management</p>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-success ring-1 ring-inset ring-emerald-100">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text sm:text-[28px]">
                  {isPerService ? 'Service cost insights' : 'Cloud cost dashboard'}
                </h1>
                <p className="mt-0.5 text-sm text-text-secondary">
                  AWS reported spend, grouped by billing day and service.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isPerService && (
              <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs text-text-secondary shadow-sm">
                <Filter className="h-3.5 w-3.5 text-text-muted" />
                <span className="sr-only">Filter costs by month</span>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="w-36 bg-transparent text-xs text-text outline-none"
                />
                {selectedPeriod && (
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod('')}
                    className="rounded-md px-1 text-text-muted hover:bg-bg-secondary hover:text-text"
                    aria-label="Clear month filter"
                  >
                    ×
                  </button>
                )}
              </label>
            )}
            {canSync && (
              <button
                type="button"
                onClick={handleSync}
                disabled={triggerSync.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-sm shadow-primary/15 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:opacity-60"
              >
                <RotateCw className={`h-3.5 w-3.5 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                {triggerSync.isPending ? 'Syncing costs…' : 'Sync AWS costs'}
              </button>
            )}
          </div>
        </div>

        {syncStatus && (
          <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs ${
            syncStatus.tone === 'success'
              ? 'border-success/20 bg-success/5 text-success'
              : 'border-danger/20 bg-danger/5 text-danger'
          }`} role="status">
            {syncStatus.tone === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{syncStatus.message}</span>
          </div>
        )}

        {loadError && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Cost data could not be loaded. Refresh the page or check your access to this service.
          </div>
        )}

        {selectedPeriod && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
            <Calendar className="h-3.5 w-3.5" />
            Billing period: {selectedPeriod}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cost summary">
          <MetricCard
            label={isPerService ? 'Tracked service spend' : 'Total tracked spend'}
            value={totalCost}
            note="AWS reported · USD"
            icon={<DollarSign className="h-4 w-4" />}
            loading={isLoading}
          />
          <MetricCard
            label="Current month"
            value={currentMonthCost}
            note="Month to date · USD"
            icon={<Calendar className="h-4 w-4" />}
            loading={isLoading}
          />
          <MetricCard
            label="Change vs previous month"
            value={costDelta}
            note={costDeltaPct === undefined ? 'Need two months of cost data' : `${costDeltaPct >= 0 ? '+' : ''}${costDeltaPct.toFixed(1)}% month over month`}
            icon={costDelta !== undefined && costDelta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            loading={isLoading}
            signed
          />
          <MetricCard
            label="Daily average this month"
            value={dailyAverage}
            note="Month-to-date spend ÷ days elapsed"
            icon={<TrendingUp className="h-4 w-4" />}
            loading={isLoading}
          />
        </section>

        <CostChart
          monthlyTrend={monthlyTrend}
          resourceBreakdown={resourceBreakdown}
          currency="USD"
        />

        <section className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">
                {isPerService ? 'Daily cost records' : 'Spend by service'}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {isPerService ? 'Daily billing data returned by AWS Cost Explorer.' : 'Totals are aggregated from available AWS cost records.'}
              </p>
            </div>
            <span className="text-[11px] text-text-muted">AWS data may arrive with a delay.</span>
          </div>

          <DataTable<CostTableRow>
            data={recordsList}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="No cost records yet"
            emptyDescription="Cost data will appear after AWS Cost Explorer returns tagged usage for this billing period."
            searchPlaceholder="Search service or AWS resource…"
            searchFields={isPerService ? ['periodStart', 'periodEnd', 'awsResourceIds'] : ['serviceName', 'serviceId']}
            columns={isPerService ? [
              {
                key: 'periodStart',
                header: 'Billing date',
                sortable: true,
                render: (row) => {
                  const record = row as CostRecord;
                  return <span className="font-mono text-xs text-text-secondary">{record.periodStart} – {record.periodEnd}</span>;
                },
              },
              {
                key: 'amountUsd',
                header: 'Reported spend',
                sortable: true,
                render: (row) => <span className="font-semibold text-text">${(row as CostRecord).amountUsd.toFixed(4)} USD</span>,
              },
              {
                key: 'awsResourceIds',
                header: 'AWS service groups',
                render: (row) => (
                  <span className="text-xs text-text-secondary">
                    {(row as CostRecord).awsResourceIds.length ? (row as CostRecord).awsResourceIds.join(', ') : 'Unclassified'}
                  </span>
                ),
              },
            ] : [
              {
                key: 'serviceName',
                header: 'Service',
                sortable: true,
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="font-medium text-text">{(row as Extract<CostTableRow, { serviceName: string }>).serviceName}</span>
                  </div>
                ),
              },
              {
                key: 'totalUsd',
                header: 'Tracked spend',
                sortable: true,
                render: (row) => <span className="font-semibold text-text">${(row as Extract<CostTableRow, { totalUsd: number }>).totalUsd.toFixed(2)} USD</span>,
              },
            ]}
          />
        </section>
      </div>
    </Layout>
  );
};

function MetricCard({
  label,
  value,
  note,
  icon,
  loading,
  signed = false,
}: {
  label: string;
  value: number | undefined;
  note: string;
  icon: React.ReactNode;
  loading: boolean;
  signed?: boolean;
}) {
  const amount = value === undefined
    ? '—'
    : signed
      ? `${value > 0 ? '+' : value < 0 ? '−' : ''}$${Math.abs(value).toFixed(2)}`
      : `$${value.toFixed(2)}`;
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-secondary text-primary">{icon}</span>
      </div>
      {loading ? (
        <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-bg-tertiary" />
      ) : (
        <p className="mt-3 text-2xl font-bold tracking-tight text-text">{amount}</p>
      )}
      <p className="mt-1.5 text-[11px] text-text-muted">{note}</p>
    </div>
  );
}
