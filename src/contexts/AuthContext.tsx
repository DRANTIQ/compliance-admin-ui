import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  login as loginApi,
  storeAuth,
  type LoginResult,
} from "../lib/auth";
import { config, isAllowedRole, type StoredUser } from "../lib/config";

interface AuthContextValue {
  token: string | null;
  user: StoredUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const result: LoginResult = await loginApi(email, password, config.stage1Url);
    if (!isAllowedRole(result.role)) {
      throw new Error(
        `Role "${result.role}" cannot access the admin console. Use the client dashboard instead.`,
      );
    }
    const stored: StoredUser = {
      user_id: result.user_id,
      tenant_id: result.tenant_id,
      role: result.role,
      email: result.email,
    };
    storeAuth(result.access_token, stored);
    setToken(result.access_token);
    setUser(stored);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token && !!user && isAllowedRole(user.role),
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
