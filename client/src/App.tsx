import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
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
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text mb-2">SCAPE</h1>
        <p className="text-text-secondary text-lg">{page}</p>
        <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-primary to-secondary rounded-full" />
      </div>
    </div>
  );
}

export default App;
