import React from 'react';
import { Layout } from '../../components/layout/Layout.js';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Users,
  KeyRound,
  CheckCircle,
  LogOut,
  Mail,
  Fingerprint,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors
    }
    logout();
    navigate('/login');
  };

  const getRolePermissions = (role?: string) => {
    switch (role) {
      case 'admin':
        return [
          'Full cross-team visibility across all provisioned services',
          'Read and filter global enterprise immutable audit logs',
          'Trigger manual AWS Cost Explorer daily synchronization',
          'Manage service templates and infrastructure modules',
          'Create, deploy, and decommission cloud services',
        ];
      case 'devops':
        return [
          'Manage Terraform modules and infrastructure parameters',
          'Trigger manual AWS Cost Explorer synchronization',
          'Retry failed provisioning jobs and monitor workers',
          'Create, deploy, and manage team cloud services',
        ];
      case 'team_lead':
        return [
          'Full team service catalog and deployment management',
          'Approve production service provisioning',
          'Monitor team-wide cloud cost attribution',
          'Trigger and monitor CI/CD deployments',
        ];
      default:
        return [
          'Create and provision cloud services from approved templates',
          'Trigger automated and manual CI/CD deployments',
          'View service-level health checks and infrastructure telemetry',
          'Inspect per-service daily cost attribution breakdown',
        ];
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5" />
            <span>Account Profile & Membership</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">User Profile</h1>
          <p className="text-sm text-text-secondary mt-1">
            Review your authentication context, role-based authorization scopes, and team assignment.
          </p>
        </div>

        {/* Identity & Credentials Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-lg shadow-black/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-primary/20">
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">{user?.email}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25 capitalize">
                    <Shield className="w-3 h-3" />
                    <span>{user?.role || 'Developer'}</span>
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    ID: {user?.id ? user.id.substring(0, 13) + '...' : '-'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 text-xs font-semibold rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
              <span className="text-text-muted flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-secondary" />
                <span>Email Address</span>
              </span>
              <p className="font-semibold text-text">{user?.email}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
              <span className="text-text-muted flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Team Assignment</span>
              </span>
              <p className="font-semibold text-text">
                {user?.teamId === 'a1b2c3d4-0001-4000-8000-000000000001'
                  ? 'Platform Engineering'
                  : 'Frontend Team'}
              </p>
              <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                {user?.teamId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
              <span className="text-text-muted flex items-center gap-1.5 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Session Security</span>
              </span>
              <p className="font-semibold text-text">JWT RS256 Bearer Token</p>
              <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                15m access token • HttpOnly refresh cookie
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/60">
              <span className="text-text-muted flex items-center gap-1.5 mb-1">
                <Fingerprint className="w-3.5 h-3.5 text-secondary" />
                <span>Access Scope</span>
              </span>
              <p className="font-semibold text-text capitalize">
                {user?.role === 'admin' ? 'Organization Administrator' : 'Team Scoped Access'}
              </p>
            </div>
          </div>
        </div>

        {/* Role Permissions Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-lg shadow-black/10 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-text">Assigned Role Capabilities</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Permissions granted to your account in accordance with the Forge RBAC specification:
          </p>

          <div className="space-y-2 pt-1">
            {getRolePermissions(user?.role).map((perm, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-secondary/40 border border-border/60 text-xs text-text-secondary"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
