export interface Tenant {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  max_accounts: number;
  max_queries: number;
  max_executions_per_day: number;
  active: boolean;
  created_at: string;
}

export interface CloudAccount {
  id: string;
  tenant_id: string;
  provider: string;
  account_id: string;
  region: string | null;
  name: string | null;
  active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  tenant_id: string;
  query_id: string | null;
  account_id: string | null;
  schedule_kind: string;
  framework_id: string | null;
  category: string | null;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface ScanTriggerResult {
  batch_id: string;
  job_ids: string[];
  total_jobs: number;
  framework_id: string | null;
  category: string;
  status: string;
  created_at: string;
}

export interface TenantCreate {
  name: string;
  description?: string;
  plan_type?: string;
  max_accounts?: number;
  max_queries?: number;
  max_executions_per_day?: number;
}

export interface CloudAccountCreate {
  provider: string;
  account_id: string;
  region?: string;
  name?: string;
}

export interface ScanTriggerBody {
  tenant_id: string;
  account_id: string;
  framework_id?: string;
  category?: string;
  triggered_by?: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  email: string;
  username: string | null;
  role: string;
  active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface TenantUserCreate {
  email: string;
  password: string;
  role?: string;
  username?: string;
}

export interface TenantUserUpdate {
  email?: string;
  password?: string;
  role?: string;
  active?: boolean;
  username?: string;
}
