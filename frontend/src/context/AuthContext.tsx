import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import api, { TOKEN_STORAGE_KEY } from "../api/axios";
import type { ApiEnvelope, User, UserRole } from "../types";

const USER_STORAGE_KEY = "project_hub_user";

interface LoginResponseData {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    adminSecret?: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));

  function persist(nextToken: string, nextUser: User) {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  async function login(email: string, password: string) {
    const res = await api.post<ApiEnvelope<LoginResponseData>>("/auth/login", {
      email,
      password,
    });
    persist(res.data.data.token, res.data.data.user);
  }

  // The register endpoint only creates the account; it doesn't return a
  // token, so we log in right after with the same credentials. adminSecret
  // is only checked server-side when role is ADMIN — the curator (ADMIN)
  // role can't be self-granted without it.
  async function register(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    adminSecret?: string,
  ) {
    await api.post("/auth/register", { email, password, fullName, role, adminSecret });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: token !== null,
      role: user?.role ?? null,
      login,
      register,
      logout,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
