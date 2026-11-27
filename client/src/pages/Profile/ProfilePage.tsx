import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout.js';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';
import {
  Fingerprint,
  KeyRound,
  LogOut,
  Mail,
  User,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Local auth state is cleared even if the API is temporarily unavailable.
    }
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <User className="h-3.5 w-3.5" />
            <span>Personal account</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Account</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your services, deployments, and cost history belong to this account and are private to you.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-black/10">
          <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-secondary text-xl font-extrabold text-white shadow-lg shadow-primary/20">
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">{user?.email}</h2>
                <span className="mt-1 block font-mono text-xs text-text-muted">
                  Account ID: {user?.id ?? '—'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger transition-all hover:bg-danger hover:text-white sm:self-auto"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-bg-secondary p-3.5">
              <span className="mb-1 flex items-center gap-1.5 text-text-muted">
                <Mail className="h-3.5 w-3.5 text-secondary" />
                <span>Email address</span>
              </span>
              <p className="font-semibold text-text">{user?.email}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-bg-secondary p-3.5">
              <span className="mb-1 flex items-center gap-1.5 text-text-muted">
                <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                <span>Session security</span>
              </span>
              <p className="font-semibold text-text">JWT RS256 authentication</p>
              <span className="mt-0.5 block text-[10px] font-medium text-emerald-400">
                Short-lived access token · HttpOnly refresh cookie
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-bg-secondary p-3.5 sm:col-span-2">
              <span className="mb-1 flex items-center gap-1.5 text-text-muted">
                <Fingerprint className="h-3.5 w-3.5 text-secondary" />
                <span>Workspace privacy</span>
              </span>
              <p className="font-semibold text-text">
                Only this account can access its services and associated history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
