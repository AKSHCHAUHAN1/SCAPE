import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  RotateCw,
  Terminal,
} from 'lucide-react';
import type { JobStatus } from '../../types/index.js';
import { StatusBadge } from '../ui/StatusBadge.js';

interface ProvisioningProgressProps {
  status: JobStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  logs?: string | null;
  onRetry?: () => void;
  serviceName?: string;
  isRetrying?: boolean;
}

const STEPS = [
  { id: 1, label: 'Request accepted', description: 'The service request is in the provisioning queue.' },
  { id: 2, label: 'Terraform provisioning', description: 'Infrastructure is being applied in the selected AWS region.' },
  { id: 3, label: 'Service ready', description: 'The provisioning job completed successfully.' },
];

export const ProvisioningProgress: React.FC<ProvisioningProgressProps> = ({
  status,
  startedAt,
  completedAt,
  errorMessage,
  logs,
  onRetry,
  serviceName = 'service',
  isRetrying = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(Boolean(logs));
  const logsEndRef = useRef<HTMLDivElement>(null);
  const failed = status === 'failed' || status === 'rolled_back' || status === 'manual_intervention_required';
  const activeStep = status === 'succeeded' ? 3 : status === 'running' || failed ? 2 : 1;
  const logLines = logs?.trim() ? logs.trim().split('\n') : [];

  const handleCopyLogs = async () => {
    if (!logs) return;
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label={`Provisioning status for ${serviceName}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold text-text">Provisioning status</h3>
            <StatusBadge status={status} size="sm" />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {startedAt
              ? `Started ${new Date(startedAt).toLocaleString()}`
              : 'Your request has been received.'}
            {completedAt ? ` · Finished ${new Date(completedAt).toLocaleString()}` : ''}
          </p>
        </div>
        {failed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry provisioning
          </button>
        )}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5" aria-live="polite">
        {STEPS.map((step) => {
          const isCompleted = status === 'succeeded' || step.id < activeStep;
          const isCurrent = !failed && status !== 'succeeded' && step.id === activeStep;
          const isFailed = failed && step.id === activeStep;

          return (
            <div
              key={step.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                isCompleted
                  ? 'border-success/20 bg-success/5'
                  : isCurrent
                    ? 'border-primary/20 bg-primary/5'
                    : isFailed
                      ? 'border-danger/20 bg-danger/5'
                      : 'border-border bg-bg/70'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isCompleted ? 'bg-success text-white' : isCurrent ? 'bg-primary text-white' : isFailed ? 'bg-danger text-white' : 'border border-border bg-white text-text-muted'
                }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : isFailed ? <AlertCircle className="h-3.5 w-3.5" /> : isCurrent && status === 'running' ? <Clock3 className="h-3.5 w-3.5 animate-pulse" /> : <span className="text-[10px] font-semibold">{step.id}</span>}
                </span>
                <h4 className="text-xs font-semibold text-text">{step.label}</h4>
              </div>
              <p className="mt-2 pl-[34px] text-[11px] leading-relaxed text-text-secondary">{step.description}</p>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border border-danger/15 bg-danger/5 px-3.5 py-3 text-xs text-danger sm:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="border-t border-border bg-[#111827]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-slate-300">
            <Terminal className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-medium">Terraform output</span>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400 sm:inline">
              {logLines.length ? `${logLines.length} lines` : 'Waiting for output'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleCopyLogs}
              disabled={!logs}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => setIsLogsExpanded((expanded) => !expanded)}
              className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10"
              aria-label={isLogsExpanded ? 'Collapse Terraform output' : 'Expand Terraform output'}
              aria-expanded={isLogsExpanded}
            >
              {isLogsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isLogsExpanded && (
          <div className="max-h-64 overflow-auto border-t border-white/5 px-4 py-3 font-mono text-[11px] leading-5 text-slate-300 sm:px-5" role="log" aria-label="Terraform output">
            {logLines.length ? (
              logLines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
            ) : (
              <p className="text-slate-400">Detailed output will appear here when the provisioning job reports it.</p>
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </section>
  );
};
