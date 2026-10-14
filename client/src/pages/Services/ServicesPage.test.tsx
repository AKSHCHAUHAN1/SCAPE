import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServicesPage } from './ServicesPage.js';
import * as servicesHooks from '../../hooks/useServices.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../hooks/useServices.js');

describe('ServicesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().login('mock-jwt', {
      id: 'usr-1',
      email: 'dev@scape.dev',
      role: 'developer',
      teamId: 'team-1',
    });
  });

  it('renders service catalog and allows filtering by search term', () => {
    vi.mocked(servicesHooks.useServices).mockReturnValue({
      data: [
        {
          id: 'srv-1',
          name: 'auth-service',
          status: 'active',
          environment: 'production',
          region: 'us-east-1',
          cloudProvider: 'aws',
          monthlySpendUsd: 120.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamId: 'team-1',
          templateId: 'tmpl-1',
        },
        {
          id: 'srv-2',
          name: 'analytics-worker',
          status: 'failed',
          environment: 'staging',
          region: 'us-west-2',
          cloudProvider: 'aws',
          monthlySpendUsd: 45.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamId: 'team-1',
          templateId: 'tmpl-2',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(servicesHooks.useDeleteService).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>,
    );

    // Header check
    expect(screen.getByRole('heading', { name: 'Service Catalog', level: 1 })).toBeInTheDocument();

    // Verify services rendered
    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByText('analytics-worker')).toBeInTheDocument();

    // Filter by search
    const searchInput = screen.getByPlaceholderText(/Search service name/i);
    fireEvent.change(searchInput, { target: { value: 'auth' } });

    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.queryByText('analytics-worker')).not.toBeInTheDocument();
  });

  it('renders empty state when no services match filter', () => {
    vi.mocked(servicesHooks.useServices).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(servicesHooks.useDeleteService).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No services found/i)).toBeInTheDocument();
  });
});
