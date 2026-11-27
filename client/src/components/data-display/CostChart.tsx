import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyTrendItem {
  month: string;
  amountUsd: number;
}

interface ResourceBreakdownItem {
  serviceName: string;
  amountUsd: number;
}

interface CostChartProps {
  monthlyTrend?: MonthlyTrendItem[];
  serviceBreakdown?: ResourceBreakdownItem[];
  currency?: string;
  className?: string;
}

export const CostChart: React.FC<CostChartProps> = ({
  monthlyTrend = [],
  serviceBreakdown = [],
  currency = 'USD',
  className = '',
}) => {
  const formatCurrency = (val: number) => `$${val.toFixed(2)} ${currency}`;
  const maxServiceCost = Math.max(0, ...serviceBreakdown.map((item) => Math.abs(item.amountUsd)));

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Monthly Trend Area Chart */}
      <section className="lg:col-span-2 bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col" aria-label="Monthly cost trend">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-text">Monthly Spend Trend</h4>
            <p className="text-xs text-text-secondary">Historical infrastructure spend per month</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {monthlyTrend.length} Months Tracked
          </span>
        </div>

        <div className="h-64 w-full" role="img" aria-label="Area chart showing AWS cost by month">
          {monthlyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              No historical trend data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#425cf5" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#425cf5" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  stroke="#667085"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e3e8f0' }}
                />
                <YAxis
                  stroke="#667085"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e3e8f0' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyTrendItem;
                      return (
                        <div className="bg-bg-secondary/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs">
                          <p className="text-text-muted font-medium mb-1">{data.month}</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(data.amountUsd)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amountUsd"
                  stroke="#425cf5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Exact AWS service-group amounts */}
      <section className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col" aria-label="Cost by AWS service">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-text">AWS service totals</h4>
          <p className="text-xs text-text-secondary">Exact Cost Explorer service-group amounts</p>
        </div>

        <div className="h-64 w-full overflow-y-auto" aria-label="AWS Cost Explorer amounts grouped by service">
          {serviceBreakdown.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-xs text-text-muted">
              No exact AWS service-group breakdown is available for these records.
            </div>
          ) : (
            <ul className="space-y-4">
              {serviceBreakdown.map((item) => (
                <li key={item.serviceName}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-text-secondary">{item.serviceName}</span>
                    <span className={`shrink-0 font-semibold ${item.amountUsd < 0 ? 'text-danger' : 'text-text'}`}>
                      {item.amountUsd < 0 ? '−' : ''}{formatCurrency(Math.abs(item.amountUsd))}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-secondary">
                    <div
                      className={`h-full rounded-full ${item.amountUsd < 0 ? 'bg-danger/70' : 'bg-primary'}`}
                      style={{ width: `${maxServiceCost ? (Math.abs(item.amountUsd) / maxServiceCost) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};
