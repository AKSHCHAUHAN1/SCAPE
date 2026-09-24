import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/index.js';
import ServicesPage from './pages/Services/index.js';
import CreateServicePage from './pages/CreateService/index.js';
import ServiceDetailPage from './pages/ServiceDetail/index.js';
import CostDashboardPage from './pages/CostDashboard/index.js';
import AuditLogPage from './pages/AuditLog/index.js';
import ProfilePage from './pages/Profile/index.js';
import { useAuthStore } from './store/authStore.js';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/services' : '/login'} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/services/new" element={<CreateServicePage />} />
      <Route path="/services/:id" element={<ServiceDetailPage />} />
      <Route path="/services/:id/costs" element={<CostDashboardPage />} />
      <Route path="/costs" element={<CostDashboardPage />} />
      <Route path="/admin/audit" element={<AuditLogPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/services" replace />} />
    </Routes>
  );
}

export default App;
