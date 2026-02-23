import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageLoader } from './components/common/PageLoader';

import { useAuth } from './auth/useAuth';
import { useStore } from './store/useStore';

/** Syncs the authenticated user into the Zustand store on mount and on auth changes. */
function AuthSync() {
  const { user } = useAuth();
  const setCurrentUserName = useStore((s) => s.setCurrentUserName);
  const setCurrentUserRole = useStore((s) => s.setCurrentUserRole);

  useEffect(() => {
    if (user) {
      setCurrentUserName(user.name);
      setCurrentUserRole(user.role);
    } else {
      setCurrentUserName('Unknown User');
      setCurrentUserRole('Admin');
    }
  }, [user, setCurrentUserName, setCurrentUserRole]);

  return null;
}

// Lazy-loaded page components — each becomes a separate chunk
const Dashboard   = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AssetList   = lazy(() => import('./pages/Assets/AssetList').then((m) => ({ default: m.AssetList })));
const AssetDetail = lazy(() => import('./pages/Assets/AssetDetail').then((m) => ({ default: m.AssetDetail })));
const AppList     = lazy(() => import('./pages/Apps/AppList').then((m) => ({ default: m.AppList })));
const AppDetail   = lazy(() => import('./pages/Apps/AppDetail').then((m) => ({ default: m.AppDetail })));
const PeopleList  = lazy(() => import('./pages/People/PeopleList').then((m) => ({ default: m.PeopleList })));
const PersonDetail = lazy(() => import('./pages/People/PersonDetail').then((m) => ({ default: m.PersonDetail })));
const Spend       = lazy(() => import('./pages/Spend').then((m) => ({ default: m.Spend })));
const Reports     = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Integrations = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.Integrations })));
const Settings    = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const AuditLog    = lazy(() => import('./pages/AuditLog').then((m) => ({ default: m.AuditLog })));
const Login       = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <Suspense fallback={<PageLoader />}>
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
            <Route path="spend" element={<Spend />} />
            <Route path="reports" element={<Reports />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
