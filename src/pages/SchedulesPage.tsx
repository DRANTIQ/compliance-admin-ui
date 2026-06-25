import { useEffect, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { listSchedules } from "../lib/api";
import { formatDate } from "../lib/format";
import type { Schedule } from "../types/stage1";

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSchedules(await listSchedules());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingSpinner label="Loading schedules…" />;
  if (error) return <ErrorAlert message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scan schedules</h1>
        <p className="mt-1 text-sm text-slate-500">Cron jobs registered in Stage 1</p>
      </div>

      {schedules.length === 0 ? (
        <EmptyState
          title="No schedules"
          description="Create schedules via API or scripts/create_scan_schedule.py"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Framework</th>
                <th className="px-4 py-3">Cron</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Next run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.schedule_kind}</td>
                  <td className="px-4 py-3">{s.framework_id ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.cron_expression}</td>
                  <td className="px-4 py-3">{s.enabled ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.next_run_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
