import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

const LoginPage = lazy(() => import('./pages/Login/index.js'));
const DashboardPage = lazy(() => import('./pages/Dashboard/index.js').then((module) => ({ default: module.DashboardPage })));
const ServicesPage = lazy(() => import('./pages/Services/index.js'));
const CreateServicePage = lazy(() => import('./pages/CreateService/index.js'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetail/index.js'));
const CostDashboardPage = lazy(() => import('./pages/CostDashboard/index.js'));
const AuditLogPage = lazy(() => import('./pages/AuditLog/index.js'));
const ProfilePage = lazy(() => import('./pages/Profile/index.js'));

function RouteLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <span className="text-sm font-medium text-text-secondary">Loading page…</span>
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/new" element={<CreateServicePage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/services/:id/costs" element={<CostDashboardPage />} />
        <Route path="/costs" element={<CostDashboardPage />} />
        <Route path="/admin/audit" element={<AuditLogPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
