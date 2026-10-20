import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';

describe('Client Portal - App Smoke Tests', () => {
  it('redirects root "/" to login page when unauthenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    // After redirect to /login, the login form should be visible
    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('developer@company.com')).toBeInTheDocument();
  });

  it('renders login page with email and password inputs when at /login', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('developer@company.com')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('••••••••')).toBeInTheDocument();
  });
});
