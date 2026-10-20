import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';
import {
  ChevronDown,
  Layers,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Terminal,
  UserRound,
  X,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <header className="sticky top-0 z-30 flex h-[72px] w-full items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        {user && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl border border-border p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text md:hidden"
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isSidebarOpen}
            aria-controls="primary-navigation"
          >
            {isSidebarOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        )}
        <Link to={user ? '/dashboard' : '/login'} className="group flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-[#687bff] text-white shadow-lg shadow-primary/20 transition-transform group-hover:-translate-y-0.5">
            <Terminal className="h-[19px] w-[19px]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold tracking-[-0.035em] text-text">SCAPE</span>
              <span className="hidden rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary sm:inline-flex">
                Cloud platform
              </span>
            </div>
            <p className="hidden text-[11px] leading-4 text-text-muted sm:block">Self-service infrastructure workspace</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <Link
            to="/services/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-white shadow-md shadow-primary/15 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg sm:px-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deploy service</span>
            <span className="sm:hidden">Create</span>
          </Link>
        )}

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-1.5 text-left transition-colors hover:bg-bg-secondary sm:pl-2 sm:pr-3"
              aria-label="Open user menu"
              aria-expanded={dropdownOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                {user.email.substring(0, 2).toUpperCase()}
              </span>
              <span className="hidden max-w-[150px] sm:block">
                <span className="block truncate text-xs font-semibold leading-4 text-text">{user.email}</span>
                <span className="flex items-center gap-1 text-[10px] capitalize leading-3 text-text-muted">
                  <Shield className="h-2.5 w-2.5 text-secondary" />
                  {user.role.replace('_', ' ')}
                </span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-text-muted sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close user menu"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-slate-900/10">
                  <div className="mb-1 border-b border-border px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-text">{user.email}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-text-muted">{user.role.replace('_', ' ')}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text"
                  >
                    <UserRound className="h-4 w-4 text-text-muted" />
                    My Profile & Team
                  </Link>
                  <Link
                    to="/services"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text"
                  >
                    <Layers className="h-4 w-4 text-text-muted" />
                    Service Catalog
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-danger hover:bg-danger/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
};
