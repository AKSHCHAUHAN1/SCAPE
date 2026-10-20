import React, { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.js';
import { useAuthStore } from '../../store/authStore.js';

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, requireAuth = true }) => {
  const { isAuthenticated } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen text-text selection:bg-primary/15">
      <Navbar
        onToggleSidebar={() => setMobileNavOpen((open) => !open)}
        isSidebarOpen={mobileNavOpen}
      />
      <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[1680px]">
        <Sidebar mobileNavOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[1440px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
