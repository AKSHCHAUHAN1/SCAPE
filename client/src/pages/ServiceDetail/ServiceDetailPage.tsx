import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { ProvisioningProgress } from '../../components/feedback/ProvisioningProgress.js';
import { DataTable } from '../../components/data-display/DataTable.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import {
  useService,
  useServiceHealth,
  useServiceJobs,
  useServiceDeployments,
  useCreateDeployment,
  useRetryProvisioningJob,
} from '../../hooks/useServiceDetail.js';
import { useDeleteService } from '../../hooks/useServices.js';
import {
  Server,
  Globe,
  ExternalLink,
  DollarSign,
  Play,
  GitBranch,
  GitCommit,
  Trash2,
  Layers,
  ArrowLeft,
  Terminal,
  Shield,
  Code,
} from 'lucide-react';

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: service, isLoading: serviceLoading, error: serviceError } = useService(id);
  const { data: serviceHealth, isLoading: healthLoading } = useServiceHealth(id);
  const { data: jobs = [] } = useServiceJobs(id);
  const { data: deployments = [] } = useServiceDeployments(id);

  const createDeploymentMutation = useCreateDeployment();
  const retryJobMutation = useRetryProvisioningJob();
  const deleteServiceMutation = useDeleteService();

  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'jobs' | 'config'>('overview');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState(false);

  // Latest job
  const latestJob = jobs[0];

  const handleTriggerDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createDeploymentMutation.mutateAsync({
        serviceId: id,
        branch: 'main',
      });
      setShowDeployModal(false);
      setActiveTab('deployments');
    } catch (err) {
      console.error('Failed to trigger deployment:', err);
    }
  };

  const handleRetryJob = async () => {
    if (latestJob) {
      await retryJobMutation.mutateAsync(latestJob.id);
    }
  };

  const handleDecommission = async () => {
    if (!id) return;
    try {
      await deleteServiceMutation.mutateAsync(id);
      setShowDecommissionModal(false);
      navigate('/services');
    } catch (err) {
      console.error('Failed to decommission:', err);
    }
  };

  if (serviceLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-surface rounded-2xl border border-border" />
          <div className="h-64 bg-surface rounded-2xl border border-border" />
        </div>
      </Layout>
    );
  }

  if (serviceError || !service) {
    return (
      <Layout>
        <div className="p-8 text-center bg-surface border border-border rounded-2xl max-w-lg mx-auto">
          <h2 className="text-lg font-bold text-text mb-2">Service Not Found</h2>
          <p className="text-xs text-text-secondary mb-4">
            Could not retrieve service details. You may not have permission to view it.
          </p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Service Catalog</span>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Back Link */}
        <div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Service Catalog</span>
          </Link>
        </div>

        {/* Service Header Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-text tracking-tight">{service.name}</h1>
              <StatusBadge status={service.status} size="md" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-secondary" />
                <span className="font-mono text-text">{service.region}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-text-muted" />
                <span>{service.templateName || 'Service template'}</span>
              </span>
              <span>•</span>
              <span>Created {new Date(service.createdAt).toLocaleDateString()}</span>
            </div>

            {service.repositoryUrl && (
              <div className="pt-1">
                <a
                  href={service.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{service.repositoryUrl}</span>
                </a>
              </div>
            )}

            {service.serviceEndpoint && (
              <div>
                <a
                  href={service.serviceEndpoint}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-success/5 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open deployed service
                </a>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowDeployModal(true)}
              disabled={service.status !== 'active' || !service.repositoryUrl}
              title={!service.repositoryUrl ? 'A GitHub repository is not connected yet' : undefined}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-primary/30 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Deploy</span>
            </button>

            <Link
              to={`/services/${service.id}/costs`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Costs</span>
            </Link>

            {service.status !== 'decommissioned' && service.status !== 'decommissioning' && (
              <button
                onClick={() => setShowDecommissionModal(true)}
                className="p-2 bg-bg-secondary hover:bg-danger/10 border border-border text-text-muted hover:text-danger rounded-xl transition-colors cursor-pointer"
                title="Decommission Service"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview & Infrastructure', icon: Server },
            { key: 'deployments', label: `Deployments (${deployments.length})`, icon: GitBranch },
            { key: 'jobs', label: `Provisioning Pipeline (${jobs.length})`, icon: Terminal },
            { key: 'config', label: 'Configuration & Policy', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className={`flex flex-col gap-1 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${serviceHealth?.status === 'healthy' ? 'border-success/20 bg-success/5' : serviceHealth?.status === 'unhealthy' ? 'border-danger/20 bg-danger/5' : 'border-border bg-surface'}`}>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${serviceHealth?.status === 'healthy' ? 'bg-success' : serviceHealth?.status === 'unhealthy' ? 'bg-danger' : 'bg-text-muted'}`} />
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {healthLoading ? 'Checking endpoint…' : serviceHealth?.status === 'healthy' ? 'Endpoint responding' : serviceHealth?.status === 'unhealthy' ? 'Endpoint unavailable' : 'Health check unavailable'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {serviceHealth?.status === 'unknown' ? 'Checks run after provisioning when the endpoint is available.' : serviceHealth?.checkedAt ? `Last checked ${new Date(serviceHealth.checkedAt).toLocaleTimeString()}` : 'Waiting for the first check'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {serviceHealth?.statusCode ? `HTTP ${serviceHealth.statusCode}` : ''}{serviceHealth?.latencyMs != null ? ` · ${serviceHealth.latencyMs} ms` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <Server className="w-4 h-4 text-primary" /> Service state
                </div>
                <StatusBadge status={service.status} size="sm" />
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <Layers className="w-4 h-4 text-secondary" /> Template
                </div>
                <p className="text-sm font-semibold text-text truncate">{service.templateName || service.templateId}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <Globe className="w-4 h-4 text-primary" /> Environment
                </div>
                <p className="text-sm font-semibold capitalize text-text">{service.environment}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <Globe className="w-4 h-4 text-primary" /> AWS region
                </div>
                <p className="text-sm font-mono font-semibold text-text">{service.region}</p>
              </div>
              {service.templateName !== 'Static Frontend' && (
                <div className="p-4 rounded-2xl bg-surface border border-border">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                    <Server className="w-4 h-4 text-secondary" /> Compute
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {service.computeMode === 'ec2' ? `EC2 · ${service.ec2InstanceType ?? 'custom'}` : 'AWS Fargate'}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {service.requestedVcpu} vCPU · {service.requestedMemoryGiB} GiB
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-bold text-text">Service endpoint</h3>
              {service.serviceEndpoint ? (
                <a href={service.serviceEndpoint} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-sm font-mono text-primary hover:underline">
                  {service.serviceEndpoint}<ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              ) : (
                <p className="mt-2 text-xs text-text-muted">An endpoint will appear here after infrastructure provisioning completes.</p>
              )}
            </div>

            {/* Provisioning Snapshot */}
            {latestJob && (
              <div>
                <h3 className="text-sm font-bold text-text mb-3">Provisioning Pipeline State</h3>
                <ProvisioningProgress
                  status={latestJob.status}
                  startedAt={latestJob.startedAt}
                  completedAt={latestJob.completedAt}
                  errorMessage={latestJob.errorMessage}
                  onRetry={handleRetryJob}
                  serviceName={service.name}
                  isRetrying={retryJobMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: DEPLOYMENTS TIMELINE ================= */}
        {activeTab === 'deployments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">CI/CD Deployment History</h3>
                <p className="text-xs text-text-secondary">
                  Continuous integration runs synchronized via GitHub Actions webhook receiver
                </p>
              </div>
              <button
                onClick={() => setShowDeployModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Trigger Deployment</span>
              </button>
            </div>

            {deployments.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No Deployments Recorded"
                description="Trigger your first build and deploy run using the button above."
                actionText="Trigger Deployment Now"
                onAction={() => setShowDeployModal(true)}
              />
            ) : (
              <DataTable
                data={deployments}
                keyExtractor={(d) => d.id}
                columns={[
                  {
                    key: 'commitSha',
                    header: 'Commit SHA',
                    render: (d) => (
                      <span className="font-mono text-xs flex items-center gap-1 text-primary">
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>{d.commitSha ? d.commitSha.substring(0, 7) : 'head'}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'branch',
                    header: 'Branch',
                    render: (d) => (
                      <span className="inline-flex items-center gap-1 text-xs text-text font-mono bg-bg-secondary px-2 py-0.5 rounded">
                        <GitBranch className="w-3 h-3 text-secondary" />
                        <span>{d.branch}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (d) => <StatusBadge status={d.status} size="sm" />,
                  },
                  {
                    key: 'startedAt',
                    header: 'Started At',
                    render: (d) =>
                      d.startedAt ? new Date(d.startedAt).toLocaleString() : 'Pending',
                  },
                  {
                    key: 'duration',
                    header: 'Duration',
                    render: (d) => {
                      if (!d.startedAt || !d.completedAt) return '-';
                      const sec = Math.round(
                        (new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime()) / 1000,
                      );
                      return `${sec}s`;
                    },
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* ================= TAB 3: PROVISIONING JOBS ================= */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-text">Terraform Provisioning Jobs</h3>
              <p className="text-xs text-text-secondary">
                Execution records from the asynchronous BullMQ provisioning queue
              </p>
            </div>

            {jobs.length === 0 ? (
              <EmptyState
                icon={Terminal}
                title="No Provisioning Jobs"
                description="No provisioning execution records found for this service."
              />
            ) : (
              <div className="space-y-6">
                {latestJob && (
                  <ProvisioningProgress
                    status={latestJob.status}
                    startedAt={latestJob.startedAt}
                    completedAt={latestJob.completedAt}
                    errorMessage={latestJob.errorMessage}
                    onRetry={handleRetryJob}
                    serviceName={service.name}
                    isRetrying={retryJobMutation.isPending}
                  />
                )}

                <DataTable
                  data={jobs}
                  keyExtractor={(j) => j.id}
                  columns={[
                    {
                      key: 'id',
                      header: 'Job Run ID',
                      render: (j) => <span className="font-mono text-xs">{j.id.substring(0, 8)}...</span>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (j) => <StatusBadge status={j.status} size="sm" />,
                    },
                    {
                      key: 'workspace',
                      header: 'Workspace',
                      render: (j) => <span className="font-mono text-xs">{j.terraformWorkspace}</span>,
                    },
                    {
                      key: 'startedAt',
                      header: 'Started',
                      render: (j) =>
                        j.startedAt ? new Date(j.startedAt).toLocaleTimeString() : 'Queued',
                    },
                    {
                      key: 'completedAt',
                      header: 'Completed',
                      render: (j) =>
                        j.completedAt ? new Date(j.completedAt).toLocaleTimeString() : '-',
                    },
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: CONFIGURATION ================= */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-text">Service Metadata & Policies</h3>
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-bg-secondary rounded-xl">
                  <span className="text-text-muted block text-[11px] mb-1">SERVICE_UUID</span>
                  <span className="text-text font-bold">{service.id}</span>
                </div>
                <div className="p-3 bg-bg-secondary rounded-xl">
                  <span className="text-text-muted block text-[11px] mb-1">TEAM_UUID</span>
                  <span className="text-text font-bold">{service.teamId}</span>
                </div>
                <div className="p-3 bg-bg-secondary rounded-xl">
                  <span className="text-text-muted block text-[11px] mb-1">AWS_REGION</span>
                  <span className="text-secondary font-bold">{service.region}</span>
                </div>
                <div className="p-3 bg-bg-secondary rounded-xl">
                  <span className="text-text-muted block text-[11px] mb-1">TAG_MANAGED_BY</span>
                  <span className="text-emerald-400 font-bold">scape</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/80">
                <h4 className="text-xs font-bold text-text mb-2 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-primary" />
                  <span>Generated CI/CD Workflow Location</span>
                </h4>
                <div className="p-3 bg-bg-secondary rounded-xl font-mono text-xs text-text-secondary">
                  .github/workflows/deploy.yml
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trigger Deployment Modal */}
        {showDeployModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form
              onSubmit={handleTriggerDeploy}
              className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Trigger Deployment</h3>
                  <p className="text-xs text-text-secondary">Execute automated GitHub Actions pipeline</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Deployment branch</label>
                  <div className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-xl text-xs text-text font-mono">main</div>
                  <p className="mt-2 text-[11px] text-text-muted">GitHub Actions will deploy the latest commit on the main branch.</p>
                </div>
                {createDeploymentMutation.isError && (
                  <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
                    Could not start the deployment. Check the GitHub Actions integration and try again.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-bg-secondary text-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDeploymentMutation.isPending}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-hover text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createDeploymentMutation.isPending ? 'Queuing...' : 'Launch Deployment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Decommission Modal */}
        {showDecommissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">Decommission Service?</h3>
                <p className="text-xs text-text-secondary mt-1 leading-normal">
                  Are you sure you want to decommission{' '}
                  <span className="font-semibold text-text">"{service.name}"</span>? Associated cloud
                  infrastructure will be terminated.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDecommissionModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecommission}
                  disabled={deleteServiceMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-danger hover:bg-danger/90 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {deleteServiceMutation.isPending ? 'Decommissioning...' : 'Yes, Decommission'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
