// src/lib/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, type User } from "./api";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, check session
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await auth.me();
        if (!alive) return;
        setUser(me);
        setIsAuthenticated(true);
      } catch {
        if (!alive) return;
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await auth.login(email, password);
    } catch (e: any) {
      // Detect "email not verified" variants from server
      const msg = e?.response?.data?.error || e?.message || '';
      const code = e?.response?.data?.code || '';
      const looksUnverified =
        /not\s*verified/i.test(msg) ||
        /unverified/i.test(msg) ||
        code === 'EMAIL_NOT_VERIFIED';

      if (looksUnverified) {
        const err: any = new Error('UNVERIFIED');
        err.code = 'UNVERIFIED';
        throw err;
      }
      throw e;
    }

    // Optimistically mark as authenticated so ProtectedRoute won't bounce
    setIsAuthenticated(true);

    // Confirm with /me
    try {
      const me = await auth.me();
      setUser(me);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      throw new Error("Login session not established");
    }
  };

  const logout = async () => {
    try { await auth.logout(); } catch {}
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
