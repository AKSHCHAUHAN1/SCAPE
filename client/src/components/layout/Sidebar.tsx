import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import {
  Activity,
  BarChart3,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileNavOpen?: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileNavOpen = false, onNavigate }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/services', label: 'Service Catalog', icon: Boxes, end: true },
    { to: '/services/new', label: 'Create Service', icon: Plus },
    { to: '/costs', label: 'Cost Dashboard', icon: BarChart3 },
    ...(isAdmin ? [{ to: '/admin/audit', label: 'Audit Logs', icon: ShieldCheck }] : []),
    { to: '/profile', label: 'Profile & Team', icon: UserRound },
  ];

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
          onClick={onNavigate}
        />
      )}
      <aside
        id="primary-navigation"
        className={`${mobileNavOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden'} w-[min(19rem,85vw)] shrink-0 flex-col border-r border-border bg-white px-4 py-5 md:sticky md:top-[72px] md:flex md:h-[calc(100vh-72px)] md:w-[248px] md:shadow-none`}
        aria-label="Primary navigation"
      >
        <div className="mb-6 flex items-center justify-between px-2 md:hidden">
          <span className="text-sm font-semibold text-text">Workspace</span>
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-lg p-2 text-text-muted hover:bg-bg-secondary hover:text-text"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <p className="page-eyebrow">Workspace</p>
        </div>
        <nav className="space-y-1" aria-label="Workspace">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/8 text-primary ring-1 ring-inset ring-primary/10'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
                  }`
                }
              >
                <Icon className="h-[17px] w-[17px] shrink-0 opacity-80" strokeWidth={1.8} />
                <span className="flex-1">{item.label}</span>
                {item.to === '/services/new' && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    New
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-8">
          <div className="rounded-2xl border border-border bg-bg/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-text">
              <Activity className="h-4 w-4 text-primary" strokeWidth={1.8} />
              <span className="text-xs font-semibold">Platform workflow</span>
            </div>
            <p className="text-[11px] leading-relaxed text-text-secondary">
              Create and track cloud services from one workspace, with Terraform provisioning and deployment history.
            </p>
          </div>
          <a
            href="https://github.com/AKSHCHAUHAN1/SCAPE"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={1.8} />
            <span>Project documentation</span>
          </a>
        </div>
      </aside>
    </>
  );
};
