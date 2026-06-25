export const config = {
  stage1Url: import.meta.env.VITE_STAGE1_URL ?? "http://localhost:8000",
  complianceUrl: import.meta.env.VITE_COMPLIANCE_URL ?? "http://localhost:8001",
  appTitle: import.meta.env.VITE_APP_TITLE ?? "Compliance Admin",
  authRequired: (import.meta.env.VITE_AUTH_REQUIRED ?? "true").toLowerCase() === "true",
  allowedRoles: (import.meta.env.VITE_ALLOWED_ROLES ?? "super_admin")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean),
};

export const AUTH_STORAGE_KEY = "admin_access_token";
export const AUTH_USER_KEY = "admin_user";

export interface StoredUser {
  user_id: string;
  tenant_id: string;
  role: string;
  email: string;
}

export function isAllowedRole(role: string): boolean {
  return config.allowedRoles.includes(role);
}
