export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function isHealthyStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "healthy" || s === "ok" || s === "up";
}

export function truncateId(id: string, len = 8): string {
  if (id.length <= len) return id;
  return `${id.slice(0, len)}…`;
}

export function formatScore(pct: number | null | undefined): string {
  if (pct == null) return "—";
  return `${pct.toFixed(1)}%`;
}

export function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "success" || s === "completed" || s === "healthy") return "text-emerald-700 bg-emerald-50";
  if (s === "failed" || s === "error") return "text-red-700 bg-red-50";
  if (s === "running" || s === "queued" || s === "retrying" || s === "collecting" || s === "evaluating")
    return "text-amber-700 bg-amber-50";
  return "text-slate-700 bg-slate-100";
}
