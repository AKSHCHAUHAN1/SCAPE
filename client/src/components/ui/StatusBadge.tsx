import React from 'react';
import type { ServiceStatus, JobStatus, DeploymentStatus } from '../../types/index.js';

type AnyStatus = ServiceStatus | JobStatus | DeploymentStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showDot = true,
}) => {
  const normStatus = status?.toLowerCase() || 'pending';

  let config: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    pulse: boolean;
    label: string;
  };

  switch (normStatus) {
    case 'active':
    case 'succeeded':
      config = {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
        pulse: false,
        label: normStatus === 'active' ? 'Active' : 'Succeeded',
      };
      break;

    case 'provisioning':
    case 'running':
      config = {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        dot: 'bg-indigo-400',
        pulse: true,
        label: normStatus === 'provisioning' ? 'Provisioning' : 'Running',
      };
      break;

    case 'pending':
    case 'queued':
      config = {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
        pulse: true,
        label: normStatus === 'pending' ? 'Pending' : 'Queued',
      };
      break;

    case 'failed':
      config = {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
        pulse: false,
        label: 'Failed',
      };
      break;

    case 'rolled_back':
      config = {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        dot: 'bg-orange-400',
        pulse: false,
        label: 'Rolled Back',
      };
      break;

    case 'decommissioned':
      config = {
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        dot: 'bg-slate-400',
        pulse: false,
        label: 'Decommissioned',
      };
      break;

    default:
      config = {
        bg: 'bg-slate-500/10',
        text: 'text-slate-300',
        border: 'border-slate-500/30',
        dot: 'bg-slate-400',
        pulse: false,
        label: status,
      };
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
