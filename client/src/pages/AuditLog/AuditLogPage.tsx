import React, { useState } from 'react';
import { Layout } from '../../components/layout/Layout.js';
import { DataTable } from '../../components/data-display/DataTable.js';
import { useAuditLogs } from '../../hooks/useAuditLogs.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuditLogPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [actionFilter, setActionFilter] = useState('ALL');
  const { data: logs = [], isLoading } = useAuditLogs();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If not admin, render access notification
  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-text">Administrator Role Required</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              The Immutable Audit Log contains privileged enterprise compliance records and is restricted
              to users with the <span className="font-semibold text-text">admin</span> role.
            </p>
            <p className="text-[11px] text-text-muted">
              Current account: <span className="font-mono text-primary">{user?.email}</span> ({user?.role})
            </p>
            <div className="pt-2">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Return to Service Catalog
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredLogs = logs.filter((l) => {
    if (actionFilter === 'ALL') return true;
    return l.action.toLowerCase().includes(actionFilter.toLowerCase());
  });

  const handleCopyPayload = (payload: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActionBadge = (action: string) => {
    let color = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (action.includes('create')) color = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (action.includes('succeeded')) color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (action.includes('delete') || action.includes('failed'))
      color = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (action.includes('trigger')) color = 'bg-sky-500/10 text-sky-400 border-sky-500/30';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${color}`}>
        {action}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text">Enterprise Audit Log</h1>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Tamper-evident system activity and cloud infrastructure provisioning event trail
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Immutable Ledger
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'service.create', 'job.succeeded', 'job.failed', 'deployment', 'service.delete'].map(
            (action) => (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer whitespace-nowrap ${
                  actionFilter === action
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface border border-border text-text-muted hover:text-text'
                }`}
              >
                {action}
              </button>
            ),
          )}
        </div>

        {/* Table */}
        <DataTable
          data={filteredLogs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          searchPlaceholder="Search actor, action, or resource ID..."
          searchFields={['actorId', 'action', 'resourceType', 'resourceId']}
          columns={[
            {
              key: 'createdAt',
              header: 'Timestamp',
              sortable: true,
              render: (l) => (
                <div className="text-xs">
                  <span className="text-text font-medium block">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {new Date(l.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              sortable: true,
              render: (l) => getActionBadge(l.action),
            },
            {
              key: 'resourceType',
              header: 'Target Entity',
              render: (l) => (
                <div className="text-xs">
                  <span className="font-semibold text-text capitalize">{l.resourceType}</span>
                  {l.resourceId && (
                    <span className="block font-mono text-[10px] text-text-muted truncate max-w-[140px]">
                      {l.resourceId}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'actorId',
              header: 'Actor UUID',
              render: (l) => (
                <span className="font-mono text-xs text-text-secondary truncate max-w-[120px] block">
                  {l.actorId ? l.actorId.substring(0, 13) + '...' : 'System'}
                </span>
              ),
            },
            {
              key: 'details',
              header: 'Details',
              className: 'text-right',
              render: (l) => {
                const isExpanded = expandedLogId === l.id;
                return (
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-bg-secondary text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide' : 'Payload'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                );
              },
            },
          ]}
        />

        {/* Expanded Payload Viewer Modal / Drawer */}
        {expandedLogId && (
          <div className="p-4 rounded-2xl bg-surface border border-primary/30 shadow-xl space-y-3">
            {(() => {
              const log = filteredLogs.find((l) => l.id === expandedLogId);
              if (!log) return null;
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-text">
                      Payload Details for Log #{log.id.substring(0, 8)}
                    </span>
                    <button
                      onClick={() => handleCopyPayload(log.payload, log.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-bg-secondary border border-border rounded-lg text-text-secondary hover:text-text cursor-pointer"
                    >
                      {copiedId === log.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === log.id ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#0d1117] rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-border">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
};
