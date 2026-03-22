import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginRequest } from "../api/client";
import type { UserRole } from "../types";

type AuthState = {
  token: string | null;
  username: string | null;
  role: UserRole | null;
};

const STORAGE_KEY = "bash_bases_token";
const STORAGE_USER = "bash_bases_user";
const STORAGE_ROLE = "bash_bases_role";

const AuthContext = createContext<{
  auth: AuthState;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
} | null>(null);

function readStored(): AuthState {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    const username = localStorage.getItem(STORAGE_USER);
    const role = localStorage.getItem(STORAGE_ROLE) as UserRole | null;
    if (token && username && (role === "admin" || role === "user")) {
      return { token, username, role };
    }
  } catch {
    /* ignore */
  }
  return { token: null, username: null, role: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => readStored());

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginRequest(username, password);
    const role = res.role as UserRole;
    localStorage.setItem(STORAGE_KEY, res.access_token);
    localStorage.setItem(STORAGE_USER, res.username);
    localStorage.setItem(STORAGE_ROLE, role);
    setAuth({
      token: res.access_token,
      username: res.username,
      role,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_ROLE);
    setAuth({ token: null, username: null, role: null });
  }, []);

  const value = useMemo(
    () => ({
      auth,
      login,
      logout,
      isAdmin: auth.role === "admin",
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
