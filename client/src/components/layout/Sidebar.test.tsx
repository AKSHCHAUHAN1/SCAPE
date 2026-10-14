import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { useAuthStore } from '../../store/authStore.js';

describe('Sidebar Component', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders standard navigation links for regular developer', () => {
    useAuthStore.getState().login('mock-jwt', {
      id: 'dev-1',
      email: 'dev@company.com',
      role: 'developer',
      teamId: 'team-1',
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
    expect(screen.getByText('Profile & Team')).toBeInTheDocument();
    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
  });

  it('renders Audit Logs link for admin users', () => {
    useAuthStore.getState().login('mock-jwt', {
      id: 'admin-1',
      email: 'admin@company.com',
      role: 'admin',
      teamId: 'team-1',
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });
});
