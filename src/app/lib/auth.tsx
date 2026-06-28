import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { appApi } from "./api";
import type { User } from "../types/models";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: { identifier: string; password: string }) => Promise<void>;
  register: (input: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const TOKEN_STORAGE_KEY = "allcancode.token";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedToken = readStoredToken();
      if (!storedToken) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await appApi.getMe(storedToken);
        if (!cancelled) {
          startTransition(() => {
            setToken(storedToken);
            setUser(response.user);
          });
        }
      } catch {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (!cancelled) {
          startTransition(() => {
            setToken(null);
            setUser(null);
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(input: { identifier: string; password: string }) {
    const response = await appApi.login(input);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    startTransition(() => {
      setToken(response.token);
      setUser(response.user);
    });
  }

  async function register(input: { username: string; email: string; password: string }) {
    const response = await appApi.register(input);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    startTransition(() => {
      setToken(response.token);
      setUser(response.user);
    });
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    startTransition(() => {
      setToken(null);
      setUser(null);
    });
  }

  async function refreshUser() {
    if (!token) {
      return;
    }
    const response = await appApi.getMe(token);
    startTransition(() => {
      setUser(response.user);
    });
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
