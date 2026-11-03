import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

export type Session = {
  token: string;
  user: { id: string; name: string; email: string; phone: string; avatarColor: string; globalRole: string };
  membership: { role: string; unitId: string | null; societyId: string; designation: string | null } | null;
  society: { id: string; name: string; city: string; slug: string } | null;
  unit: { id: string; number: string; type: string; areaSqft: number } | null;
  home: string;
};

type AuthValue = {
  token: string | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
  refresh: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthValue | null>(null);
const TOKEN_KEY = "nivaasa_token";
const storage = Platform.OS === "web"
  ? {
      getItemAsync: async (k: string) => (typeof localStorage === "undefined" ? null : localStorage.getItem(k)),
      setItemAsync: async (k: string, v: string) => { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); },
      deleteItemAsync: async (k: string) => { if (typeof localStorage !== "undefined") localStorage.removeItem(k); },
    }
  : SecureStore;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (t: string | null) => {
    if (!t) { setSession(null); return null; }
    try {
      const data = await api<Session>("/api/auth/session", { token: t });
      setSession({ ...data, token: t });
      return { ...data, token: t };
    } catch {
      setSession(null);
      await storage.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItemAsync(TOKEN_KEY);
      if (stored) {
        setToken(stored);
        await loadSession(stored);
      }
      setLoading(false);
    })();
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api<Session & { token: string }>("/api/auth/login", { method: "POST", body: { email, password } });
    await storage.setItemAsync(TOKEN_KEY, data.token);
    setToken(data.token);
    const hydrated = await loadSession(data.token);
    if (!hydrated) throw new Error("Could not load your session.");
    return hydrated;
  }, [loadSession]);

  const signOut = useCallback(async () => {
    if (token) await api("/api/auth/logout", { method: "POST", token }).catch(() => null);
    await storage.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setSession(null);
  }, [token]);

  const refresh = useCallback(async () => loadSession(token), [loadSession, token]);

  const value = useMemo(() => ({ token, session, loading, signIn, signOut, refresh }), [token, session, loading, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
