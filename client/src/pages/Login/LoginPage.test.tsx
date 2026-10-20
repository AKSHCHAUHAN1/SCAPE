import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage.js';
import { authApi } from '../../api/auth.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../api/auth.js', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
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

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('renders login form by default with appropriate elements', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Enterprise Internal Developer Platform')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('developer@company.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to SCAPE/i })).toBeInTheDocument();
  });

  it('switches between Sign In and Create Account tabs', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const createAccountTab = screen.getByRole('button', { name: /^Create Account/i });
    fireEvent.click(createAccountTab);

    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByText(/New accounts start with developer access/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/role|team/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Platform Account/i })).toBeInTheDocument();

    const signInTab = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(signInTab);

    expect(screen.getByRole('button', { name: /Sign In to SCAPE/i })).toBeInTheDocument();
  });

  it('displays error when submitting empty fields', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const form = screen.getByRole('button', { name: /Sign In to SCAPE/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Email and password are required.')).toBeInTheDocument();
  });

  it('successfully logs in and updates store on valid credentials', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'mock-access-token',
      user: {
        id: 'user-123',
        email: 'developer@example.com',
        role: 'developer',
        teamId: 'team-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        lastLoginAt: '2026-01-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByPlaceholderText('developer@company.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const form = screen.getByRole('button', { name: /Sign In to SCAPE/i }).closest('form');

    fireEvent.change(emailInput, { target: { value: 'developer@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'developer@example.com',
        password: 'password123',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe('mock-access-token');
      expect(screen.getByText('Authentication successful. Redirecting...')).toBeInTheDocument();
    });
  });

  it('displays API error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid email or password.',
        },
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByPlaceholderText('developer@company.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const form = screen.getByRole('button', { name: /Sign In to SCAPE/i }).closest('form');

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.submit(form!);

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });
});
