import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { checkComplianceHealth, checkStage1Health, listTenants } from "../lib/api";
import { config } from "../lib/config";
import { isHealthyStatus } from "../lib/format";

interface ServiceHealth {
  name: string;
  url: string;
  status: string | null;
  error: string | null;
}

export function DashboardPage() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: "Stage 1 API", url: config.stage1Url, status: null, error: null },
    { name: "Compliance API", url: config.complianceUrl, status: null, error: null },
  ]);
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s1, comp, tenants] = await Promise.all([
        checkStage1Health().catch((e: Error) => ({ error: e.message })),
        checkComplianceHealth().catch((e: Error) => ({ error: e.message })),
        listTenants().catch(() => []),
      ]);
      setServices([
        {
          name: "Stage 1 API",
          url: config.stage1Url,
          status: "error" in s1 ? null : s1.status,
          error: "error" in s1 ? s1.error : null,
        },
        {
          name: "Compliance API",
          url: config.complianceUrl,
          status: "error" in comp ? null : comp.status,
          error: "error" in comp ? comp.error : null,
        },
      ]);
      setTenantCount(tenants.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingSpinner label="Loading overview…" />;
  if (error) return <ErrorAlert message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-500">Internal health and quick links</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div key={svc.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{svc.name}</p>
            <p className="mt-1 truncate text-sm text-slate-400">{svc.url}</p>
            <p
              className={`mt-3 text-lg font-semibold ${
                isHealthyStatus(svc.status) ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {svc.status ?? "unreachable"}
            </p>
            {svc.error && <p className="mt-1 text-xs text-red-600">{svc.error}</p>}
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tenants</p>
          <p className="mt-3 text-3xl font-bold text-violet-800">{tenantCount ?? "—"}</p>
          <Link to="/tenants" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">
            Manage tenants →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Monitoring</p>
          <p className="mt-3 text-sm text-slate-600">Queues, stuck batches, compliance lag</p>
          <Link to="/monitoring" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">
            Open monitoring →
          </Link>
        </div>
      </div>
    </div>
  );
}
