export interface OpsQueueDepth {
  name: string;
  key: string;
  depth: number;
}

export interface OpsJobStatusCount {
  status: string;
  count: number;
}

export interface OpsBatchStatusCount {
  status: string;
  count: number;
}

export interface OpsPlatformCounts {
  tenants: number;
  active_tenants: number;
  cloud_accounts: number;
  schedules: number;
  batches_running: number;
  account_session_locks: number;
}

export interface OpsJobsWindow {
  last_24h_total: number;
  last_24h_success: number;
  last_24h_failed: number;
  in_flight: number;
}

export interface OpsRecentBatch {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  status: string;
  trigger_type: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  created_at: string;
  finished_at: string | null;
  progress_pct: number;
}

export interface StuckBatch {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  status: string;
  trigger_type: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  created_at: string;
  finished_at: string | null;
  age_minutes: number;
}

export interface OpsFailedJob {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  account_id: string;
  query_id: string;
  batch_id: string | null;
  status: string;
  retry_count: number;
  finished_at: string | null;
  error_message: string | null;
}

export interface Stage1OpsSummary {
  checked_at: string;
  redis_ok: boolean;
  queues: OpsQueueDepth[];
  platform: OpsPlatformCounts;
  jobs: OpsJobsWindow;
  jobs_by_status: OpsJobStatusCount[];
  batches_by_status: OpsBatchStatusCount[];
  recent_batches: OpsRecentBatch[];
  stuck_batches: StuckBatch[];
  recent_failed_jobs: OpsFailedJob[];
}

export interface OpsComplianceCounts {
  scan_runs: number;
  snapshots: number;
  evaluations: number;
  control_results: number;
  scans_last_24h: number;
  evaluations_last_24h: number;
}

export interface OpsComplianceLag {
  job_completed_depth: number;
  running_scans: number;
  backlog_per_running_scan: number | null;
}

export interface OpsRecentScanRun {
  id: string;
  tenant_id: string;
  account_id: string;
  batch_id: string;
  framework_id: string;
  status: string;
  total_controls: number;
  evaluated_controls: number;
  pass_count: number;
  fail_count: number;
  unknown_count: number;
  score_pct: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

export interface StuckScanRun {
  id: string;
  tenant_id: string;
  account_id: string;
  batch_id: string;
  framework_id: string;
  status: string;
  total_controls: number;
  evaluated_controls: number;
  pass_count: number;
  fail_count: number;
  score_pct: number | null;
  started_at: string | null;
  age_minutes: number;
}

export interface ComplianceOpsStatus {
  checked_at: string;
  redis_ok: boolean;
  queues: OpsQueueDepth[];
  platform: OpsComplianceCounts;
  lag: OpsComplianceLag;
  scan_runs_by_status: OpsJobStatusCount[];
  evaluations_by_status: OpsJobStatusCount[];
  recent_scan_runs: OpsRecentScanRun[];
  stuck_scan_runs: StuckScanRun[];
}

// Legacy aliases (older endpoints)
export interface Stage1OpsQueues {
  redis_ok: boolean;
  queues: OpsQueueDepth[];
}

export interface Stage1JobsSummary {
  by_status: OpsJobStatusCount[];
}
