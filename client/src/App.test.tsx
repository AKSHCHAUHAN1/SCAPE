import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';

describe('Client Portal - App Smoke Tests', () => {
  it('renders landing page with SCAPE Platform branding', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('SCAPE Platform')).toBeInTheDocument();
    expect(screen.getByText(/Self-service Cloud Automation & Provisioning Engine/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In \/ Register/i })).toBeInTheDocument();
  });

  it('renders login page with email and password inputs when at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('developer@company.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });
});
