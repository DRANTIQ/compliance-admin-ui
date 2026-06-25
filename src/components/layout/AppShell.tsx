import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { config } from "../../lib/config";

export function AppShell() {
  const { user, logout } = useAuth();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? "text-violet-700" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-lg font-bold text-violet-800">
              {config.appTitle}
            </Link>
            <nav className="flex gap-6">
              <NavLink to="/" end className={navCls}>
                Overview
              </NavLink>
              <NavLink to="/tenants" className={navCls}>
                Tenants
              </NavLink>
              <NavLink to="/schedules" className={navCls}>
                Schedules
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
              Internal
            </span>
            {user && (
              <>
                <span className="hidden text-xs text-slate-500 sm:inline">{user.email}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{user.role}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
