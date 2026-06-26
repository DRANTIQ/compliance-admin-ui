import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import {
  checkComplianceHealth,
  checkStage1Health,
  getComplianceOpsStatus,
  getStage1OpsSummary,
} from "../lib/api";
import { formatDate, formatScore, isHealthyStatus, statusTone, truncateId } from "../lib/format";
import type { ComplianceOpsStatus, Stage1OpsSummary } from "../types/ops";

const AUTO_REFRESH_MS = 30_000;

function depthTone(depth: number, warnAt: number): string {
  if (depth >= warnAt) return "text-red-600";
  if (depth > 0) return "text-amber-600";
  return "text-emerald-600";
}

function ProgressBar({ completed, failed, total }: { completed: number; failed: number; total: number }) {
  if (total <= 0) {
    return <div className="h-2 w-full rounded-full bg-slate-100" />;
  }
  const okPct = (completed / total) * 100;
  const failPct = (failed / total) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="flex h-full">
        <div className="bg-emerald-500 transition-all" style={{ width: `${okPct}%` }} />
        {failPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${failPct}%` }} />}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "text-slate-900",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(status)}`}>
      {status}
    </span>
  );
}

function IdCell({ id, title }: { id: string; title?: string }) {
  return (
    <span className="font-mono text-xs text-slate-700" title={title ?? id}>
      {truncateId(id, 10)}
    </span>
  );
}

function inferAlerts(stage1: Stage1OpsSummary | null, compliance: ComplianceOpsStatus | null): string[] {
  if (!stage1 || !compliance) return [];
  const alerts: string[] = [];
  const execDepth = stage1.queues.find((q) => q.name === "execution_jobs")?.depth ?? 0;
  const failedDepth = stage1.queues.find((q) => q.name === "job_completed_failed")?.depth ?? 0;
  const completedDepth = compliance.lag.job_completed_depth;

  if (!stage1.redis_ok) alerts.push("Stage 1 cannot reach Redis — workers and queue metrics may be stale.");
  if (!compliance.redis_ok) alerts.push("Compliance API cannot reach Redis.");
  if (execDepth > 0 && stage1.jobs.in_flight === 0)
    alerts.push("Execution queue has backlog but no in-flight jobs — execution worker may be stopped.");
  if (completedDepth > 20)
    alerts.push(`Compliance ingest queue depth is ${completedDepth} — worker may be lagging or down.`);
  if (failedDepth > 0)
    alerts.push(`${failedDepth} permanently failed job(s) in steampipe:job_completed:failed — inspect compliance worker logs.`);
  if (stage1.platform.batches_running > 0 && stage1.jobs.in_flight === 0 && execDepth === 0)
    alerts.push(`${stage1.platform.batches_running} batch(es) marked running with no active jobs — possible stale batch state.`);
  if (compliance.stuck_scan_runs.length > 0)
    alerts.push(`${compliance.stuck_scan_runs.length} compliance scan(s) stuck in running state.`);
  if (stage1.stuck_batches.length > 0)
    alerts.push(`${stage1.stuck_batches.length} execution batch(es) stuck beyond the threshold.`);
  return alerts;
}

export function MonitoringPage() {
  const [stage1, setStage1] = useState<Stage1OpsSummary | null>(null);
  const [compliance, setCompliance] = useState<ComplianceOpsStatus | null>(null);
  const [stage1Health, setStage1Health] = useState<string | null>(null);
  const [complianceHealth, setComplianceHealth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleMinutes, setStaleMinutes] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  async function load(minutes = staleMinutes, initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [s1, comp, h1, h2] = await Promise.all([
        getStage1OpsSummary(minutes),
        getComplianceOpsStatus(minutes),
        checkStage1Health().catch(() => ({ status: "unreachable" })),
        checkComplianceHealth().catch(() => ({ status: "unreachable" })),
      ]);
      setStage1(s1);
      setCompliance(comp);
      setStage1Health(h1.status);
      setComplianceHealth(h2.status);
      setLastLoadedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load monitoring data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(staleMinutes, true);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => void load(staleMinutes), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, staleMinutes]);

  const alerts = useMemo(() => inferAlerts(stage1, compliance), [stage1, compliance]);

  if (loading) return <LoadingSpinner label="Loading monitoring…" />;
  if (error && !stage1) return <ErrorAlert message={error} onRetry={() => void load(staleMinutes, true)} />;

  const execDepth = stage1?.queues.find((q) => q.name === "execution_jobs")?.depth ?? 0;
  const failedQueueDepth = stage1?.queues.find((q) => q.name === "job_completed_failed")?.depth ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">
            Queues, workers, batches, and compliance pipeline health
            {lastLoadedAt && (
              <span className="ml-2 text-slate-400">· updated {formatDate(lastLoadedAt.toISOString())}</span>
            )}
            {refreshing && <span className="ml-2 text-violet-600">Refreshing…</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-refresh 30s
          </label>
          <label htmlFor="stale-minutes" className="text-sm text-slate-600">
            Stuck after (min)
          </label>
          <input
            id="stale-minutes"
            type="number"
            min={5}
            max={1440}
            value={staleMinutes}
            onChange={(e) => setStaleMinutes(Number(e.target.value) || 30)}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => void load(staleMinutes)}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => void load(staleMinutes)} />}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((msg) => (
            <div
              key={msg}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">At a glance</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <KpiCard
            label="Execution queue"
            value={execDepth}
            hint="steampipe:execution_jobs"
            tone={depthTone(execDepth, 10)}
          />
          <KpiCard
            label="Compliance ingest"
            value={compliance?.lag.job_completed_depth ?? "—"}
            hint="awaiting evaluation"
            tone={depthTone(compliance?.lag.job_completed_depth ?? 0, 20)}
          />
          <KpiCard
            label="In-flight jobs"
            value={stage1?.jobs.in_flight ?? "—"}
            hint="queued + running + retrying"
            tone={(stage1?.jobs.in_flight ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}
          />
          <KpiCard
            label="Running batches"
            value={stage1?.platform.batches_running ?? "—"}
            hint="Stage 1 execution"
          />
          <KpiCard
            label="Failed (24h)"
            value={stage1?.jobs.last_24h_failed ?? "—"}
            hint={`${stage1?.jobs.last_24h_total ?? 0} jobs total`}
            tone={(stage1?.jobs.last_24h_failed ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}
          />
          <KpiCard
            label="Failed queue"
            value={failedQueueDepth}
            hint="permanent compliance failures"
            tone={depthTone(failedQueueDepth, 1)}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Service health</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Stage 1 API</dt>
              <dd className={isHealthyStatus(stage1Health) ? "text-emerald-600" : "text-red-600"}>
                {stage1Health ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Compliance API</dt>
              <dd className={isHealthyStatus(complianceHealth) ? "text-emerald-600" : "text-red-600"}>
                {complianceHealth ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Stage 1 Redis</dt>
              <dd className={stage1?.redis_ok ? "text-emerald-600" : "text-red-600"}>
                {stage1?.redis_ok ? "connected" : "unreachable"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Compliance Redis</dt>
              <dd className={compliance?.redis_ok ? "text-emerald-600" : "text-red-600"}>
                {compliance?.redis_ok ? "connected" : "unreachable"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Account session locks</dt>
              <dd className="font-medium text-slate-900">{stage1?.platform.account_session_locks ?? 0}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Platform inventory</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Tenants</dt>
              <dd className="text-lg font-semibold">
                {stage1?.platform.active_tenants}/{stage1?.platform.tenants} active
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cloud accounts</dt>
              <dd className="text-lg font-semibold">{stage1?.platform.cloud_accounts}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Schedules</dt>
              <dd className="text-lg font-semibold">{stage1?.platform.schedules}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Scans (24h)</dt>
              <dd className="text-lg font-semibold">{compliance?.platform.scans_last_24h}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total scan runs</dt>
              <dd className="text-lg font-semibold">{compliance?.platform.scan_runs}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Evaluations (24h)</dt>
              <dd className="text-lg font-semibold">{compliance?.platform.evaluations_last_24h}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Snapshots</dt>
              <dd className="text-lg font-semibold">{compliance?.platform.snapshots}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Control results</dt>
              <dd className="text-lg font-semibold">{compliance?.platform.control_results}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Redis queues</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700">Stage 1</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {stage1?.queues.map((q) => (
                <div key={q.name} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase text-slate-500">{q.name}</p>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{q.key}</p>
                  <p className={`mt-2 text-2xl font-bold ${depthTone(q.depth, q.name.includes("failed") ? 1 : 50)}`}>
                    {q.depth}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700">Compliance</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {compliance?.queues.map((q) => (
                <div key={q.name} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase text-slate-500">{q.name}</p>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{q.key}</p>
                  <p className={`mt-2 text-2xl font-bold ${depthTone(q.depth, q.name.includes("failed") ? 1 : 50)}`}>
                    {q.depth}
                  </p>
                </div>
              ))}
            </div>
            {compliance && compliance.lag.running_scans > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Backlog per running scan:{" "}
                {compliance.lag.backlog_per_running_scan != null
                  ? `${compliance.lag.backlog_per_running_scan} messages`
                  : "n/a"}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Execution jobs</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {stage1?.jobs_by_status.map((row) => (
              <div key={row.status} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <StatusBadge status={row.status} />
                <span className="ml-2 font-semibold">{row.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Last 24h: {stage1?.jobs.last_24h_success} succeeded, {stage1?.jobs.last_24h_failed} failed
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Execution batches</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {stage1?.batches_by_status.map((row) => (
              <div key={row.status} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <StatusBadge status={row.status} />
                <span className="ml-2 font-semibold">{row.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {compliance?.scan_runs_by_status.map((row) => (
              <div key={`scan-${row.status}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs text-slate-500">scan</span> <StatusBadge status={row.status} />
                <span className="ml-2 font-semibold">{row.count}</span>
              </div>
            ))}
          </div>
          {compliance && compliance.evaluations_by_status.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {compliance.evaluations_by_status.map((row) => (
                <div key={`eval-${row.status}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs text-slate-500">eval</span> <StatusBadge status={row.status} />
                  <span className="ml-2 font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent execution batches</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stage1?.recent_batches ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <IdCell id={b.id} />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/tenants/${b.tenant_id}`} className="text-violet-700 hover:underline">
                      {b.tenant_name ?? truncateId(b.tenant_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.trigger_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="min-w-[140px] px-4 py-3">
                    <div className="space-y-1">
                      <ProgressBar completed={b.completed_jobs} failed={b.failed_jobs} total={b.total_jobs} />
                      <p className="text-xs text-slate-500">
                        {b.completed_jobs}/{b.total_jobs} ok
                        {b.failed_jobs > 0 && <span className="text-red-600"> · {b.failed_jobs} failed</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(b.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">
          Stuck execution batches ({stage1?.stuck_batches.length ?? 0})
        </h2>
        <p className="mt-1 text-sm text-slate-500">Running/queued longer than {staleMinutes} minutes</p>
        {(stage1?.stuck_batches.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-emerald-700">No stuck batches.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-amber-200 bg-amber-50 text-xs uppercase text-amber-900">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stage1?.stuck_batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <IdCell id={b.id} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/tenants/${b.tenant_id}`} className="text-violet-700 hover:underline">
                        {b.tenant_name ?? truncateId(b.tenant_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      {b.completed_jobs + b.failed_jobs}/{b.total_jobs}
                    </td>
                    <td className="px-4 py-3">{b.age_minutes} min</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent failed jobs</h2>
        <p className="mt-1 text-sm text-slate-500">Latest Stage 1 execution failures with error detail</p>
        {(stage1?.recent_failed_jobs.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-emerald-700">No failed jobs in recent history.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3">Finished</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stage1?.recent_failed_jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-3">
                      <IdCell id={j.id} />
                    </td>
                    <td className="px-4 py-3">{j.tenant_name ?? truncateId(j.tenant_id)}</td>
                    <td className="px-4 py-3">{j.batch_id ? <IdCell id={j.batch_id} /> : "—"}</td>
                    <td className="px-4 py-3">{j.retry_count}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(j.finished_at)}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-red-700">
                      {j.error_message ? (
                        <span title={j.error_message}>
                          {j.error_message.length > 120 ? `${j.error_message.slice(0, 120)}…` : j.error_message}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent compliance scans</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Scan</th>
                <th className="px-4 py-3">Framework</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Controls</th>
                <th className="px-4 py-3">Pass/Fail</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(compliance?.recent_scan_runs ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <IdCell id={s.id} />
                  </td>
                  <td className="px-4 py-3">{s.framework_id}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 font-medium">{formatScore(s.score_pct)}</td>
                  <td className="px-4 py-3">
                    {s.evaluated_controls}/{s.total_controls}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-emerald-700">{s.pass_count} pass</span>
                    {s.fail_count > 0 && <span className="ml-2 text-red-600">{s.fail_count} fail</span>}
                  </td>
                  <td className="px-4 py-3">
                    <IdCell id={s.batch_id} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(compliance?.stuck_scan_runs.length ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Stuck compliance scans ({compliance?.stuck_scan_runs.length})
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-amber-200 bg-amber-50 text-xs uppercase text-amber-900">
                <tr>
                  <th className="px-4 py-3">Scan</th>
                  <th className="px-4 py-3">Framework</th>
                  <th className="px-4 py-3">Controls</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compliance?.stuck_scan_runs.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <IdCell id={s.id} />
                    </td>
                    <td className="px-4 py-3">{s.framework_id}</td>
                    <td className="px-4 py-3">
                      {s.evaluated_controls}/{s.total_controls}
                    </td>
                    <td className="px-4 py-3">{formatScore(s.score_pct)}</td>
                    <td className="px-4 py-3">
                      <IdCell id={s.batch_id} />
                    </td>
                    <td className="px-4 py-3">{s.age_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
