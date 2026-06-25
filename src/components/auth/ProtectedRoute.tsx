import { Navigate, useLocation } from "react-router-dom";
import { config, isAllowedRole } from "../../lib/config";
import { getStoredToken, getStoredUser } from "../../lib/auth";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = getStoredToken();
  const user = getStoredUser();

  if (config.authRequired) {
    if (!token || !user) {
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }
    if (!isAllowedRole(user.role)) {
      return <Navigate to="/login" state={{ from: location.pathname, forbidden: true }} replace />;
    }
  }

  return children;
}
