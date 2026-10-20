import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';

vi.mock('../../api/auth.js', () => ({
  authApi: {
    logout: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders platform branding without claiming an environment status', () => {
    useAuthStore.getState().logout();
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByText('SCAPE')).toBeInTheDocument();
    expect(screen.getByText('Cloud platform')).toBeInTheDocument();
    expect(screen.queryByText(/Staging/i)).not.toBeInTheDocument();
  });

  it('renders user details when logged in and handles logout flow', async () => {
    useAuthStore.getState().login('mock-jwt', {
      id: 'usr-1',
      email: 'alex@company.com',
      role: 'devops',
      teamId: 'team-infra',
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    // Verify user email and role badge
    expect(screen.getByText('alex@company.com')).toBeInTheDocument();
    expect(screen.getByText('devops')).toBeInTheDocument();

    // Open user dropdown
    const userButton = screen.getByText('alex@company.com').closest('button');
    fireEvent.click(userButton!);

    // Expect dropdown to show Sign Out
    const signOutBtn = await screen.findByText('Sign Out');
    expect(signOutBtn).toBeInTheDocument();

    // Click Sign Out
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
