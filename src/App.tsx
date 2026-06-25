import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { TenantDetailPage } from "./pages/TenantDetailPage";
import { TenantsPage } from "./pages/TenantsPage";
import { config, isAllowedRole } from "./lib/config";
import { getStoredToken, getStoredUser } from "./lib/auth";

function isAdminSession(): boolean {
  const user = getStoredUser();
  return !!getStoredToken() && !!user && isAllowedRole(user.role);
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
          </Route>
          <Route
            path="*"
            element={<Navigate to={config.authRequired && !isAdminSession() ? "/login" : "/"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
