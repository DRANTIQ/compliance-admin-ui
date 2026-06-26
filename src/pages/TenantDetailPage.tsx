import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { createAccount, createTenantUser, deactivateTenantUser, getTenant, listAccounts, listTenantUsers, triggerScan, updateTenantUser } from "../lib/api";
import { formatDate, truncateId } from "../lib/format";
import type { CloudAccount, Tenant, TenantUser } from "../types/stage1";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [provider, setProvider] = useState("aws");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("tenant_admin");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("tenant_admin");
  const [editPassword, setEditPassword] = useState("");
  const [userSubmitting, setUserSubmitting] = useState(false);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [t, accs, usrs] = await Promise.all([
        getTenant(tenantId),
        listAccounts(tenantId),
        listTenantUsers(tenantId),
      ]);
      setTenant(t);
      setAccounts(accs);
      setUsers(usrs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tenantId]);

  async function onScan(account: CloudAccount) {
    if (!tenantId) return;
    setScanningId(account.id);
    setScanResult(null);
    setError(null);
    try {
      const result = await triggerScan({ tenant_id: tenantId, account_id: account.id });
      setScanResult(`Scan started — batch ${truncateId(result.batch_id, 12)} (${result.total_jobs} jobs)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to trigger scan");
    } finally {
      setScanningId(null);
    }
  }

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createAccount(tenantId, {
        provider,
        account_id: accountId,
        name: accountName || undefined,
      });
      setAccountId("");
      setAccountName("");
      setShowAccountForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setUserSubmitting(true);
    setError(null);
    try {
      await createTenantUser(tenantId, {
        email: userEmail,
        password: userPassword,
        role: userRole,
      });
      setUserEmail("");
      setUserPassword("");
      setUserRole("tenant_admin");
      setShowUserForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setUserSubmitting(false);
    }
  }

  async function onSaveUser(userId: string) {
    if (!tenantId) return;
    setUserSubmitting(true);
    setError(null);
    try {
      await updateTenantUser(tenantId, userId, {
        role: editRole,
        ...(editPassword ? { password: editPassword } : {}),
      });
      setEditingUserId(null);
      setEditPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUserSubmitting(false);
    }
  }

  async function onDeactivateUser(user: TenantUser) {
    if (!tenantId) return;
    if (!window.confirm(`Deactivate ${user.email}? They will no longer be able to sign in.`)) return;
    setUserSubmitting(true);
    setError(null);
    try {
      await deactivateTenantUser(tenantId, user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user");
    } finally {
      setUserSubmitting(false);
    }
  }

  async function onReactivateUser(user: TenantUser) {
    if (!tenantId) return;
    setUserSubmitting(true);
    setError(null);
    try {
      await updateTenantUser(tenantId, user.id, { active: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate user");
    } finally {
      setUserSubmitting(false);
    }
  }

  if (!tenantId) return <ErrorAlert message="Missing tenant ID" />;
  if (loading) return <LoadingSpinner label="Loading tenant…" />;
  if (!tenant) return <ErrorAlert message="Tenant not found" onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/tenants" className="text-sm text-violet-700 hover:underline">
          ← Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{tenant.name}</h1>
        <p className="mt-1 font-mono text-xs text-slate-400">{tenant.id}</p>
        {tenant.description && <p className="mt-2 text-sm text-slate-600">{tenant.description}</p>}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => void load()} />}
      {scanResult && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{scanResult}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Plan</p>
          <p className="mt-1 font-semibold">{tenant.plan_type}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Max accounts</p>
          <p className="mt-1 font-semibold">{tenant.max_accounts}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Daily job limit</p>
          <p className="mt-1 font-semibold">{tenant.max_executions_per_day}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Cloud accounts</h2>
        <button
          type="button"
          onClick={() => setShowAccountForm((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          {showAccountForm ? "Cancel" : "Add account"}
        </button>
      </div>

      {showAccountForm && (
        <form onSubmit={onCreateAccount} className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Provider</label>
              <input
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Cloud account ID</label>
              <input
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Display name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Add account"}
          </button>
        </form>
      )}

      {accounts.length === 0 ? (
        <EmptyState title="No accounts" description="Add a cloud account to run scans." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Account ID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.name ?? "—"}</td>
                  <td className="px-4 py-3">{a.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.account_id}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={scanningId === a.id}
                      onClick={() => void onScan(a)}
                      className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                    >
                      {scanningId === a.id ? "Starting…" : "Run CIS scan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>
        <button
          type="button"
          onClick={() => setShowUserForm((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          {showUserForm ? "Cancel" : "Add user"}
        </button>
      </div>

      {showUserForm && (
        <form onSubmit={onCreateUser} className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                required
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                required
                type="password"
                minLength={8}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_user">tenant_user</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={userSubmitting}
            className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {userSubmitting ? "Saving…" : "Create user"}
          </button>
        </form>
      )}

      {users.length === 0 ? (
        <EmptyState title="No users" description="Add a user so they can sign in to the client dashboard." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className={!u.active ? "bg-slate-50/80" : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.email}</p>
                    <p className="font-mono text-xs text-slate-400">{truncateId(u.id, 10)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="tenant_admin">tenant_admin</option>
                        <option value="tenant_user">tenant_user</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.last_login)}</td>
                  <td className="px-4 py-3 text-right">
                    {editingUserId === u.id ? (
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="password"
                          placeholder="New password (optional)"
                          minLength={8}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={userSubmitting}
                            onClick={() => void onSaveUser(u.id)}
                            className="rounded bg-violet-700 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword("");
                            }}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={userSubmitting}
                          onClick={() => {
                            setEditingUserId(u.id);
                            setEditRole(u.role);
                            setEditPassword("");
                          }}
                          className="text-xs font-medium text-violet-700 hover:underline"
                        >
                          Edit
                        </button>
                        {u.active ? (
                          <button
                            type="button"
                            disabled={userSubmitting}
                            onClick={() => void onDeactivateUser(u)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={userSubmitting}
                            onClick={() => void onReactivateUser(u)}
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
