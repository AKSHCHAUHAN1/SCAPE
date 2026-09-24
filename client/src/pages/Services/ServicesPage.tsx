import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { DataTable } from '../../components/data-display/DataTable.js';
import { useServices, useDeleteService } from '../../hooks/useServices.js';
import type { Service } from '../../types/index.js';
import {
  Boxes,
  Plus,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Server,
  Globe,
  Trash2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { data: services = [], isLoading, error, refetch } = useServices();
  const deleteServiceMutation = useDeleteService();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.region.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        selectedStatus === 'ALL' || s.status.toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, selectedStatus]);

  // Metric stats
  const metrics = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.status === 'active').length;
    const provisioning = services.filter(
      (s) => s.status === 'provisioning' || s.status === 'pending',
    ).length;
    const failed = services.filter((s) => s.status === 'failed').length;
    return { total, active, provisioning, failed };
  }, [services]);

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteServiceMutation.mutateAsync(serviceToDelete.id);
      setServiceToDelete(null);
    } catch (err) {
      console.error('Failed to decommission service:', err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Boxes className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text">Service Catalog</h1>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Autonomous self-service cloud infrastructure provisioned via Terraform modules
            </p>
          </div>

          <Link
            to="/services/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/25 text-white font-medium text-sm rounded-xl transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Service</span>
          </Link>
        </div>

        {/* Top Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-md shadow-black/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Total Services</span>
              <Layers className="w-4 h-4 text-text-secondary" />
            </div>
            <p className="text-2xl font-extrabold text-text mt-2">{metrics.total}</p>
            <span className="text-[11px] text-text-muted">Provisioned under team</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-md shadow-black/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Active & Healthy</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 mt-2">{metrics.active}</p>
            <span className="text-[11px] text-emerald-500/80 font-medium">Ready for deployment</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-md shadow-black/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Provisioning Queue</span>
              <Clock className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-400 mt-2">{metrics.provisioning}</p>
            <span className="text-[11px] text-indigo-400/80 font-medium">In Terraform pipeline</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-md shadow-black/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Monthly Estimate</span>
              <TrendingUp className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-2xl font-extrabold text-secondary mt-2">
              ${(metrics.active * 14.5).toFixed(2)}
            </p>
            <span className="text-[11px] text-text-muted font-mono">USD / month</span>
          </div>
        </div>

        {/* Filter Controls & View Switcher */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search service name, region..."
              className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'ACTIVE', 'PROVISIONING', 'PENDING', 'FAILED', 'DECOMMISSIONED'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedStatus === status
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-bg-secondary text-text-muted hover:text-text hover:bg-bg-tertiary'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-bg-secondary shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading & Error States */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-52 rounded-2xl bg-surface border border-border p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 bg-bg-tertiary rounded-md w-1/2" />
                  <div className="h-4 bg-bg-tertiary rounded-md w-3/4" />
                </div>
                <div className="h-8 bg-bg-tertiary rounded-md w-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20 text-center">
            <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">Failed to fetch services</p>
            <p className="text-xs text-text-secondary mt-1">
              Please ensure the backend API server is reachable.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Views */}
        {!isLoading && !error && (
          <>
            {filteredServices.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="No Services Found"
                description={
                  searchTerm || selectedStatus !== 'ALL'
                    ? 'No cloud services matched your filter criteria. Try clearing filters.'
                    : "You haven't provisioned any services yet. Create your first service in minutes!"
                }
                actionText="Create First Service"
                actionHref="/services/new"
              />
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="group bg-surface hover:bg-surface/90 border border-border hover:border-primary/40 rounded-2xl p-5 shadow-lg shadow-black/10 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top glow accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-secondary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <Link
                            to={`/services/${service.id}`}
                            className="font-bold text-base text-text hover:text-primary transition-colors truncate block"
                          >
                            {service.name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                            <Globe className="w-3.5 h-3.5 text-text-secondary" />
                            <span className="font-mono">{service.region}</span>
                          </div>
                        </div>
                        <StatusBadge status={service.status} size="sm" />
                      </div>

                      <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border/60 my-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-text-muted">
                          <span>Template</span>
                          <span className="text-text font-medium">AWS Node.js / Fargate</span>
                        </div>
                        <div className="flex items-center justify-between text-text-muted">
                          <span>Created</span>
                          <span>{new Date(service.createdAt).toLocaleDateString()}</span>
                        </div>
                        {service.repositoryUrl && (
                          <div className="flex items-center justify-between text-text-muted truncate">
                            <span>Repository</span>
                            <a
                              href={service.repositoryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 truncate max-w-[140px]"
                            >
                              <span>GitHub</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2 text-xs">
                      <Link
                        to={`/services/${service.id}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover font-semibold py-1.5 transition-colors"
                      >
                        <span>Details & Logs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/services/${service.id}/costs`}
                          title="View Costs"
                          className="p-1.5 rounded-lg border border-border hover:bg-bg-secondary text-text-secondary hover:text-text transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </Link>
                        {service.status !== 'decommissioned' && (
                          <button
                            onClick={() => setServiceToDelete(service)}
                            title="Decommission Service"
                            className="p-1.5 rounded-lg border border-border hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View */
              <DataTable
                data={filteredServices}
                keyExtractor={(item) => item.id}
                columns={[
                  {
                    key: 'name',
                    header: 'Service Name',
                    sortable: true,
                    render: (s) => (
                      <Link
                        to={`/services/${s.id}`}
                        className="font-semibold text-text hover:text-primary flex items-center gap-2"
                      >
                        <Server className="w-4 h-4 text-text-muted" />
                        <span>{s.name}</span>
                      </Link>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    sortable: true,
                    render: (s) => <StatusBadge status={s.status} size="sm" />,
                  },
                  {
                    key: 'region',
                    header: 'Region',
                    sortable: true,
                    render: (s) => <span className="font-mono text-xs">{s.region}</span>,
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    sortable: true,
                    render: (s) => new Date(s.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'text-right',
                    render: (s) => (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/services/${s.id}`}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text"
                        >
                          Manage
                        </Link>
                        <Link
                          to={`/services/${s.id}/costs`}
                          className="p-1 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text"
                          title="Cost Breakdown"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}

        {/* Decommission Confirmation Modal */}
        {serviceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">Decommission Service?</h3>
                <p className="text-xs text-text-secondary mt-1 leading-normal">
                  Are you sure you want to decommission{' '}
                  <span className="font-semibold text-text">"{serviceToDelete.name}"</span>? This will mark
                  the service as decommissioned and stop associated cloud resources.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setServiceToDelete(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
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
