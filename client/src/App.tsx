import { Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/Login/index.js';
import { useAuthStore } from './store/authStore.js';
import { Terminal, Shield, LogOut, ArrowRight } from 'lucide-react';
import { authApi } from './api/auth.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/services" element={<Placeholder page="Service Catalog" />} />
      <Route path="/services/new" element={<Placeholder page="Create Service" />} />
      <Route path="/services/:id" element={<Placeholder page="Service Detail" />} />
      <Route path="/services/:id/costs" element={<Placeholder page="Cost Dashboard" />} />
      <Route path="/admin/audit" element={<Placeholder page="Audit Log" />} />
      <Route path="/profile" element={<Placeholder page="Profile" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomeView() {
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network failure on logout
    }
    logout();
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center z-10 bg-surface/80 backdrop-blur-md border border-border p-8 rounded-2xl shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary shadow-lg shadow-primary/20 mb-4">
          <Terminal className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          SCAPE Platform
        </h1>
        <p className="text-text-secondary text-base mt-2 max-w-md mx-auto">
          Self-service Cloud Automation & Provisioning Engine (Sprint 1 Foundation)
        </p>

        {isAuthenticated && user ? (
          <div className="mt-8 p-4 bg-bg-secondary/60 border border-border rounded-xl text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-text-muted">Authenticated Session</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                <Shield className="w-3 h-3" />
                {user.role}
              </span>
            </div>
            <p className="text-sm font-medium text-text">{user.email}</p>
            <p className="text-xs text-text-muted mt-0.5 font-mono">User ID: {user.id}</p>

            <div className="mt-4 flex gap-3">
              <Link
                to="/services"
                className="flex-1 py-2 px-3 bg-primary text-white text-xs font-medium rounded-lg text-center hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Service Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleLogout}
                className="py-2 px-3 bg-bg-tertiary text-text-secondary hover:text-danger text-xs font-medium rounded-lg border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-primary to-primary-hover text-white font-medium text-sm rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In / Register</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border/50 text-xs text-text-muted flex items-center justify-center gap-4">
          <span>PostgreSQL 15+ Schema</span>
          <span>•</span>
          <span>Express JWT Auth</span>
          <span>•</span>
          <span>Vite + Tailwind v4</span>
        </div>
      </div>
    </div>
  );
}

/** Placeholder for routes scheduled in future sprints */
function Placeholder({ page }: { page: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text mb-2">SCAPE</h1>
        <p className="text-text-secondary text-lg">{page}</p>
        <div className="mt-4">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
        <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-primary to-secondary rounded-full" />
      </div>
    </div>
  );
}

export default App;
