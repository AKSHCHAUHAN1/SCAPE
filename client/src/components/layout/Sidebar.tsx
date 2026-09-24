import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import {
  Boxes,
  PlusCircle,
  BarChart3,
  ShieldCheck,
  UserCheck,
  Server,
  Activity,
  CheckCircle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    {
      to: '/services',
      label: 'Service Catalog',
      icon: Boxes,
      end: true,
    },
    {
      to: '/services/new',
      label: 'Create Service',
      icon: PlusCircle,
    },
    {
      to: '/costs',
      label: 'Cost Dashboard',
      icon: BarChart3,
    },
    ...(isAdmin
      ? [
          {
            to: '/admin/audit',
            label: 'Audit Logs',
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      to: '/profile',
      label: 'Profile & Team',
      icon: UserCheck,
    },
  ];

  return (
    <aside className="w-64 border-r border-border/80 bg-surface/50 backdrop-blur-md flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Platform Portal
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm'
                        : 'text-text-secondary hover:text-text hover:bg-bg-secondary/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Quick Capabilities */}
        <div className="p-3.5 rounded-2xl bg-bg-secondary/40 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-semibold text-text">Cloud Engine</span>
          </div>
          <div className="space-y-1 text-[11px] text-text-muted">
            <div className="flex items-center justify-between">
              <span>Terraform AWS</span>
              <span className="text-emerald-400 font-mono">v1.9.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CI/CD Automations</span>
              <span className="text-emerald-400 font-mono">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cost Explorer Sync</span>
              <span className="text-emerald-400 font-mono">Daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Footprint */}
      <div className="p-3 rounded-2xl bg-surface border border-border/80 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-text text-[11px] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Infrastructure Health</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>99.98%</span>
          </span>
        </div>
        <p className="text-[10px] text-text-muted leading-tight">
          All provisioning queues and state locks operational.
        </p>
      </div>
    </aside>
  );
};
