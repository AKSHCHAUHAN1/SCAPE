import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface/40 backdrop-blur-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-bg-secondary border border-border/80 flex items-center justify-center text-text-muted mb-4 shadow-inner">
        <Icon className="w-7 h-7 text-text-secondary" />
      </div>

      <h3 className="text-lg font-semibold text-text mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-normal">
        {description}
      </p>

      {actionText && (
        <div>
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
