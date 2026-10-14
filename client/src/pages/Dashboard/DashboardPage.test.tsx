import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage.js';
import * as healthHooks from '../../hooks/useHealth.js';
import * as costHooks from '../../hooks/useCosts.js';
import * as servicesHooks from '../../hooks/useServices.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../hooks/useHealth.js');
vi.mock('../../hooks/useCosts.js');
vi.mock('../../hooks/useServices.js');

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().login('mock-jwt', {
      id: 'usr-1',
      email: 'engineer@scape.dev',
      role: 'developer',
      teamId: 'team-backend',
    });
  });

  it('renders loading skeletons while fetching metrics', () => {
    vi.mocked(healthHooks.usePlatformMetrics).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    vi.mocked(costHooks.useCostSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    vi.mocked(servicesHooks.useServices).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders KPI metrics and recent deployments when data is available', () => {
    vi.mocked(healthHooks.usePlatformMetrics).mockReturnValue({
      data: {
        status: 'healthy',
        uptimeMs: 1053120000,
        uptimeFormatted: '12d 4h 32m',
        timestamp: new Date().toISOString(),
        platform: {
          services: {
            total: 9,
            active: 8,
            pending: 1,
            failed: 0,
          },
          deployments: {
            total: 42,
            activeJobs: 1,
            successRate: 95.2,
            recentDeployments: [
              {
                id: 'dep-101',
                status: 'succeeded',
                branch: 'main',
                commitSha: 'a1b2c3d',
                serviceName: 'payment-gateway',
                startedAt: new Date(Date.now() - 60000).toISOString(),
                completedAt: new Date().toISOString(),
                durationMs: 45000,
              },
            ],
          },
          cost: {
            totalSpendUsd: 1420.5,
          },
          infrastructure: {
            database: 'healthy',
            api: 'healthy',
            provisioningQueue: 'healthy',
            costSync: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    vi.mocked(costHooks.useCostSummary).mockReturnValue({
      data: {
        totalUsd: 1420.5,
        monthlyCostUsd: 350.2,
        currency: 'USD',
        byService: [],
        monthlyTrend: [
          { month: '2026-08', amountUsd: 310.0 },
          { month: '2026-09', amountUsd: 350.2 },
        ],
      },
      isLoading: false,
    } as any);

    vi.mocked(servicesHooks.useServices).mockReturnValue({
      data: [
        {
          id: 'srv-1',
          name: 'payment-gateway',
          status: 'active',
          environment: 'staging',
          templateName: 'Node.js API',
        },
      ],
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Verify Platform status header
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
    expect(screen.getAllByText(/12d 4h 32m/).length).toBeGreaterThan(0);

    // Verify KPI metric values
    expect(screen.getByText('Total Services')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();
    expect(screen.getByText(/95.2% success rate/)).toBeInTheDocument();

    // Verify recent deployment feed
    expect(screen.getAllByText('payment-gateway').length).toBeGreaterThan(0);
    expect(screen.getByText('a1b2c3d')).toBeInTheDocument();
  });
});
