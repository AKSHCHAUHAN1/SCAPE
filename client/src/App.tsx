import { Routes, Route, Navigate } from 'react-router-dom';

// Pages — lazy-loaded in later sprints
// import Login from '@/pages/Login';
// import Services from '@/pages/Services';
// import CreateService from '@/pages/CreateService';
// import ServiceDetail from '@/pages/ServiceDetail';
// import CostDashboard from '@/pages/CostDashboard';
// import AuditLog from '@/pages/AuditLog';
// import Profile from '@/pages/Profile';

function App() {
  return (
    <Routes>
      {/* Routes will be wired up as pages are built */}
      <Route path="/" element={<Placeholder page="Home" />} />
      <Route path="/login" element={<Placeholder page="Login" />} />
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

/** Temporary placeholder — will be replaced by actual page components */
function Placeholder({ page }: { page: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>SCAPE — {page}</h1>
    </div>
  );
}

export default App;
