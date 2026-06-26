import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthSessionEffects } from "./components/auth/AuthSessionEffects";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { TenantDetailPage } from "./pages/TenantDetailPage";
import { TenantsPage } from "./pages/TenantsPage";
import { config } from "./lib/config";
import { useAuth } from "./contexts/AuthContext";

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const goLogin = config.authRequired && !isAuthenticated;
  return <Navigate to={goLogin ? "/login" : "/"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthSessionEffects />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
