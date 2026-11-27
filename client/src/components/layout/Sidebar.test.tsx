import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { useAuthStore } from '../../store/authStore.js';

describe('Sidebar Component', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders personal workspace navigation without role-based links', () => {
    useAuthStore.getState().login('mock-jwt', {
      id: 'dev-1',
      email: 'dev@company.com',
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Service Catalog')).toBeInTheDocument();
    expect(screen.getByText('Create Service')).toBeInTheDocument();
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
  });

  it('does not expose admin-only navigation', () => {
    useAuthStore.getState().login('mock-jwt', {
      id: 'admin-1',
      email: 'admin@company.com',
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
  });
});
