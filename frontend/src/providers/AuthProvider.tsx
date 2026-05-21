"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const APP_TOKEN_KEY = "app_token";
const DOCS_TOKEN_KEY = "docs_bearer_token";

export interface AuthUser {
  sub?: string;
  spotify_id?: string;
  display_name?: string;
  email?: string;
  exp?: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthContextValue extends AuthState {
  setToken: (token: string) => void;
  setDocsToken: (token: string) => void;
  getDocsToken: () => string | null;
  logout: () => void;
  loginRedirect: (returnTo?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isAuthenticated: false,
    isHydrated: false,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(APP_TOKEN_KEY);
    if (stored && !isTokenExpired(stored)) {
      const user = decodeToken(stored);
      setState({
        token: stored,
        user,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      if (stored) localStorage.removeItem(APP_TOKEN_KEY);
      setState((prev) => ({ ...prev, isHydrated: true }));
    }
  }, []);

  const setToken = useCallback((token: string) => {
    localStorage.setItem(APP_TOKEN_KEY, token);
    const user = decodeToken(token);
    setState({
      token,
      user,
      isAuthenticated: true,
      isHydrated: true,
    });
  }, []);

  const setDocsToken = useCallback((token: string) => {
    if (token) {
      localStorage.setItem(DOCS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(DOCS_TOKEN_KEY);
    }
  }, []);

  const getDocsToken = useCallback((): string | null => {
    return localStorage.getItem(DOCS_TOKEN_KEY);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(APP_TOKEN_KEY);
    setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: true,
    });
    router.replace("/login");
  }, [router]);

  const loginRedirect = useCallback((returnTo?: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const path = returnTo ? `/v1/auth/login?return_to=${encodeURIComponent(returnTo)}` : "/v1/auth/login";
    window.location.href = `${API_URL}${path}`;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setToken,
      setDocsToken,
      getDocsToken,
      logout,
      loginRedirect,
    }),
    [state, setToken, setDocsToken, getDocsToken, logout, loginRedirect],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
export type { AuthContextValue };
