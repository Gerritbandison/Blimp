import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { AssetList } from './pages/Assets/AssetList';
import { AssetDetail } from './pages/Assets/AssetDetail';
import { AppList } from './pages/Apps/AppList';
import { AppDetail } from './pages/Apps/AppDetail';
import { PeopleList } from './pages/People/PeopleList';
import { PersonDetail } from './pages/People/PersonDetail';
import { Reports } from './pages/Reports';
import { Integrations } from './pages/Integrations';
import { Settings } from './pages/Settings';
import { AuditLog } from './pages/AuditLog';
import { Login } from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes — all wrapped in Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<AssetList />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="apps" element={<AppList />} />
          <Route path="apps/:id" element={<AppDetail />} />
          <Route path="people" element={<PeopleList />} />
          <Route path="people/:id" element={<PersonDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
