import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface MonthlyTrendItem {
  month: string;
  amountUsd: number;
}

interface ResourceBreakdownItem {
  resource: string;
  amountUsd: number;
}

interface CostChartProps {
  monthlyTrend?: MonthlyTrendItem[];
  resourceBreakdown?: ResourceBreakdownItem[];
  currency?: string;
  className?: string;
}

const RESOURCE_COLORS: Record<string, string> = {
  ECS: '#6366f1',
  'ECS-Fargate': '#6366f1',
  RDS: '#0ea5e9',
  'RDS-Postgres': '#0ea5e9',
  ALB: '#10b981',
  VPC: '#f59e0b',
  S3: '#ec4899',
  CloudFront: '#8b5cf6',
  CloudWatch: '#14b8a6',
  Default: '#64748b',
};

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const CostChart: React.FC<CostChartProps> = ({
  monthlyTrend = [],
  resourceBreakdown = [],
  currency = 'USD',
  className = '',
}) => {
  const formatCurrency = (val: number) => `$${val.toFixed(2)} ${currency}`;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Monthly Trend Area Chart */}
      <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-text">Monthly Spend Trend</h4>
            <p className="text-xs text-text-secondary">Historical infrastructure spend per month</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {monthlyTrend.length} Months Tracked
          </span>
        </div>

        <div className="h-64 w-full">
          {monthlyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              No historical trend data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
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
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resource Breakdown Donut Chart */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-text">Resource Attribution</h4>
          <p className="text-xs text-text-secondary">Cost distribution across provisioned cloud resources</p>
        </div>

        <div className="h-64 w-full flex items-center justify-center">
          {resourceBreakdown.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              No resource breakdown recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceBreakdown}
                  dataKey="amountUsd"
                  nameKey="resource"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {resourceBreakdown.map((entry, index) => {
                    const color =
                      RESOURCE_COLORS[entry.resource] || PALETTE[index % PALETTE.length];
                    return <Cell key={`cell-${index}`} fill={color} stroke="#1e293b" strokeWidth={2} />;
                  })}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as ResourceBreakdownItem;
                      return (
                        <div className="bg-bg-secondary/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl text-xs">
                          <p className="text-text font-medium">{item.resource}</p>
                          <p className="text-xs font-bold text-secondary mt-0.5">
                            {formatCurrency(item.amountUsd)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-[11px] text-text-secondary">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
