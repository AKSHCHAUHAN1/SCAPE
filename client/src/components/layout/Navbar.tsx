import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';
import {
  Terminal,
  Shield,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on signout
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-surface/80 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link to="/services" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                FORGE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-text-muted hidden sm:block">Cloud Provisioning Portal</p>
          </div>
        </Link>

        <div className="h-4 w-[1px] bg-border mx-2 hidden sm:block" />

        {/* Environment Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Staging (AWS us-east-1)</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Link
          to="/services/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-primary-hover hover:shadow-primary/30 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Deploy Service</span>
        </Link>

        {/* User Dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-border bg-bg-secondary/60 hover:bg-bg-secondary text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-xs">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-text truncate max-w-[120px]">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] text-text-muted capitalize">
                  <Shield className="w-2.5 h-2.5 text-secondary" />
                  <span>{user.role}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-2xl z-50 p-2 text-xs">
                  <div className="px-3 py-2 border-b border-border/80 mb-1">
                    <p className="font-semibold text-text truncate">{user.email}</p>
                    <p className="text-[11px] text-text-muted capitalize mt-0.5">Role: {user.role}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-text hover:bg-bg-secondary hover:text-primary transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-text-muted" />
                    <span>My Profile & Team</span>
                  </Link>

                  <Link
                    to="/services"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-text hover:bg-bg-secondary hover:text-primary transition-colors"
                  >
                    <Layers className="w-4 h-4 text-text-muted" />
                    <span>Service Catalog</span>
                  </Link>

                  <div className="h-[1px] bg-border my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
