import { config } from "./config";
import { getStoredToken, notifyUnauthorized } from "./auth";
import type {
  CloudAccount,
  CloudAccountCreate,
  ScanTriggerBody,
  ScanTriggerResult,
  Schedule,
  Tenant,
  TenantCreate,
  TenantUser,
  TenantUserCreate,
  TenantUserUpdate,
} from "../types/stage1";
import type { ComplianceOpsStatus, Stage1OpsSummary } from "../types/ops";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function stage1Request<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(path, config.stage1Url);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: authHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401 && config.authRequired) {
      notifyUnauthorized();
    }
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function complianceRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(path, config.complianceUrl);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: authHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401 && config.authRequired) {
      notifyUnauthorized();
    }
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listTenants(limit = 50): Promise<Tenant[]> {
  return stage1Request("/api/v1/tenants", { params: { limit } });
}

export function getTenant(tenantId: string): Promise<Tenant> {
  return stage1Request(`/api/v1/tenants/${tenantId}`);
}

export function createTenant(body: TenantCreate): Promise<Tenant> {
  return stage1Request("/api/v1/tenants", { method: "POST", body });
}

export function listAccounts(tenantId: string): Promise<CloudAccount[]> {
  return stage1Request(`/api/v1/tenants/${tenantId}/accounts`, { params: { limit: 100 } });
}

export function createAccount(tenantId: string, body: CloudAccountCreate): Promise<CloudAccount> {
  return stage1Request(`/api/v1/tenants/${tenantId}/accounts`, { method: "POST", body });
}

export function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  return stage1Request(`/api/v1/tenants/${tenantId}/users`, { params: { limit: 100 } });
}

export function createTenantUser(tenantId: string, body: TenantUserCreate): Promise<TenantUser> {
  return stage1Request(`/api/v1/tenants/${tenantId}/users`, { method: "POST", body });
}

export function updateTenantUser(
  tenantId: string,
  userId: string,
  body: TenantUserUpdate,
): Promise<TenantUser> {
  return stage1Request(`/api/v1/tenants/${tenantId}/users/${userId}`, { method: "PATCH", body });
}

export function deactivateTenantUser(tenantId: string, userId: string): Promise<void> {
  return stage1Request(`/api/v1/tenants/${tenantId}/users/${userId}`, { method: "DELETE" });
}

export function triggerScan(body: ScanTriggerBody): Promise<ScanTriggerResult> {
  return stage1Request("/api/v1/executions/scan", {
    method: "POST",
    body: {
      framework_id: "cis_aws_v6",
      category: "compliance",
      triggered_by: "admin_ui",
      ...body,
    },
  });
}

export function listSchedules(tenantId?: string): Promise<Schedule[]> {
  return stage1Request("/api/v1/schedules", {
    params: tenantId ? { tenant_id: tenantId, limit: 100 } : { limit: 100 },
  });
}

export function checkStage1Health(): Promise<{ status: string }> {
  return fetch(`${config.stage1Url.replace(/\/$/, "")}/health`).then((r) => r.json());
}

export function checkComplianceHealth(): Promise<{ status: string }> {
  return fetch(`${config.complianceUrl.replace(/\/$/, "")}/health`).then((r) => r.json());
}

export function getStage1OpsSummary(
  olderThanMinutes = 30,
): Promise<Stage1OpsSummary> {
  return stage1Request("/api/v1/ops/summary", {
    params: { older_than_minutes: olderThanMinutes },
  });
}

export function getComplianceOpsStatus(olderThanMinutes = 30): Promise<ComplianceOpsStatus> {
  return complianceRequest("/v1/ops/status", {
    params: { older_than_minutes: olderThanMinutes },
  });
}
