import { config } from "./config";
import { getStoredToken } from "./auth";
import type {
  CloudAccount,
  CloudAccountCreate,
  ScanTriggerBody,
  ScanTriggerResult,
  Schedule,
  Tenant,
  TenantCreate,
} from "../types/stage1";

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
