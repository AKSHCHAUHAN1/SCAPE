import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge.js';

describe('StatusBadge Component', () => {
  it('renders active status with green dot and text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders provisioning status with pulse animation', () => {
    render(<StatusBadge status="provisioning" />);
    expect(screen.getByText('Provisioning')).toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders running status for deployments', () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders custom sizes and classes properly', () => {
    const { container } = render(<StatusBadge status="succeeded" size="lg" className="custom-test-class" />);
    expect(container.firstChild).toHaveClass('custom-test-class');
  });
});
