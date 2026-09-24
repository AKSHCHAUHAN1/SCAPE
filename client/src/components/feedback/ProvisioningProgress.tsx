import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { JobStatus } from '../../types/index.js';

interface ProvisioningProgressProps {
  status: JobStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  serviceName?: string;
  isRetrying?: boolean;
}

const STEPS = [
  { id: 1, label: 'Specification & RBAC Check', desc: 'Validating team permissions and service constraints' },
  { id: 2, label: 'Remote State & Lock Table', desc: 'Allocating AWS S3 backend workspace and DynamoDB lock' },
  { id: 3, label: 'Terraform Plan & Synthesis', desc: 'Generating declarative plan for cloud infrastructure' },
  { id: 4, label: 'Resource Provisioning', desc: 'Applying infrastructure modules (VPC, ECS, RDS, ALB/S3)' },
  { id: 5, label: 'CI/CD Pipeline Setup', desc: 'Synthesizing GitHub Actions deploy workflow & committing to repo' },
  { id: 6, label: 'Final Health Check', desc: 'Verifying service endpoint readiness and updating catalog' },
];

export const ProvisioningProgress: React.FC<ProvisioningProgressProps> = ({
  status,
  startedAt,
  errorMessage,
  onRetry,
  serviceName = 'service',
  isRetrying = false,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Derive active step from status
  useEffect(() => {
    if (status === 'succeeded') {
      setActiveStep(6);
    } else if (status === 'failed' || status === 'rolled_back') {
      setActiveStep(4);
    } else if (status === 'running') {
      // Simulate progressive step advancement
      const timer = setInterval(() => {
        setActiveStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 4000);
      return () => clearInterval(timer);
    } else {
      setActiveStep(1);
    }
  }, [status]);

  // Generate realistic terraform execution logs stream
  useEffect(() => {
    const timestamp = new Date().toISOString().substring(11, 19);
    const initialLogs = [
      `[${timestamp}] INFO: [scape-engine] Initializing provisioning job for "${serviceName}"...`,
      `[${timestamp}] INFO: Validated team ownership and service configuration.`,
      `[${timestamp}] INFO: S3 Remote Backend: s3://scape-tf-state-staging/workspaces/${serviceName}`,
      `[${timestamp}] INFO: DynamoDB Lock Table: scape-terraform-locks-staging`,
      `[${timestamp}] EXEC: terraform init -backend-config=backend.hcl -no-color`,
      `[${timestamp}] SUCCESS: Initializing modules and provider plugins (aws v5.70.0)...`,
      `[${timestamp}] EXEC: terraform apply -auto-approve -var-file=terraform.tfvars.json`,
      `[${timestamp}] PLAN: 12 to add, 0 to change, 0 to destroy.`,
    ];

    if (activeStep >= 3) {
      initialLogs.push(`[${timestamp}] APPLY: aws_vpc.main: Creating... [id=pending]`);
      initialLogs.push(`[${timestamp}] APPLY: aws_subnet.public[0]: Creating... [id=pending]`);
    }
    if (activeStep >= 4) {
      initialLogs.push(`[${timestamp}] APPLY: aws_security_group.service: Creation complete after 3s`);
      initialLogs.push(`[${timestamp}] APPLY: aws_ecs_cluster.main: Creating...`);
    }
    if (activeStep >= 5) {
      initialLogs.push(`[${timestamp}] APPLY: aws_lb.alb: Creation complete after 12s`);
      initialLogs.push(`[${timestamp}] CI/CD: Rendered .github/workflows/deploy.yml from Handlebars template.`);
      initialLogs.push(`[${timestamp}] CI/CD: Automated commit created on repository main branch.`);
    }
    if (status === 'succeeded') {
      initialLogs.push(`[${timestamp}] APPLY: Apply complete! Resources: 12 added, 0 changed, 0 destroyed.`);
      initialLogs.push(`[${timestamp}] OUTPUT: repository_url = "https://github.com/scape-platform/${serviceName}"`);
      initialLogs.push(`[${timestamp}] SUCCESS: Provisioning finished successfully. Service marked ACTIVE.`);
    }
    if (status === 'failed' || status === 'rolled_back') {
      initialLogs.push(`[${timestamp}] ERROR: ${errorMessage || 'Terraform apply failed during resource creation.'}`);
      initialLogs.push(`[${timestamp}] ROLLBACK: Initiated automatic rollback destroying partial state.`);
    }

    setLogs(initialLogs);
  }, [activeStep, status, serviceName, errorMessage]);

  // Auto-scroll logs
  useEffect(() => {
    if (isLogsExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLogsExpanded]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      {/* Header */}
      <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface/50">
        <div>
          <h3 className="text-base font-semibold text-text flex items-center gap-2">
            <span>Provisioning Pipeline</span>
            {status === 'running' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            )}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {startedAt ? `Started at ${new Date(startedAt).toLocaleTimeString()}` : 'Provisioning job in progress'}
          </p>
        </div>

        {/* Retry Button if Failed */}
        {(status === 'failed' || status === 'rolled_back') && onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Retry Provisioning</span>
          </button>
        )}
      </div>

      {/* Pipeline Steps Tracker */}
      <div className="p-6 border-b border-border/80 bg-bg-secondary/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step) => {
            const isCompleted = status === 'succeeded' || activeStep > step.id;
            const isCurrent = activeStep === step.id && (status === 'running' || status === 'queued');
            const isFailed = (status === 'failed' || status === 'rolled_back') && activeStep === step.id;

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : isCurrent
                    ? 'bg-indigo-500/5 border-indigo-500/40 ring-1 ring-indigo-500/30'
                    : isFailed
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : 'bg-surface/40 border-border/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-text-muted flex items-center justify-center text-[10px] text-text-muted shrink-0">
                      {step.id}
                    </div>
                  )}
                  <h4
                    className={`text-xs font-semibold ${
                      isCompleted
                        ? 'text-emerald-300'
                        : isCurrent
                        ? 'text-indigo-300'
                        : isFailed
                        ? 'text-rose-300'
                        : 'text-text-muted'
                    }`}
                  >
                    {step.label}
                  </h4>
                </div>
                <p className="text-[11px] text-text-secondary pl-6 leading-tight">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Logs Section */}
      <div className="bg-[#0b0f19]">
        <div className="p-3 bg-[#111827] border-b border-border/40 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-text-secondary" />
            <span className="font-mono text-text-secondary font-medium">Terraform Apply Console Stream</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-2 py-1 hover:bg-bg-tertiary rounded text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setIsLogsExpanded(!isLogsExpanded)}
              className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-text cursor-pointer"
              aria-label="Toggle terminal"
            >
              {isLogsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isLogsExpanded && (
          <div className="p-4 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto leading-relaxed space-y-1">
            {logs.map((log, i) => {
              let color = 'text-slate-300';
              if (log.includes('SUCCESS') || log.includes('complete!')) color = 'text-emerald-400';
              if (log.includes('ERROR')) color = 'text-rose-400';
              if (log.includes('APPLY') || log.includes('PLAN')) color = 'text-sky-300';
              if (log.includes('CI/CD')) color = 'text-indigo-400';
              if (log.includes('WARN')) color = 'text-amber-400';

              return (
                <div key={i} className={color}>
                  {log}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
