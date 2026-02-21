import type { User } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

interface AuthContextValue {
  user: User | null;
  role: string | null;
  loading: boolean;
  setRole: (role: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setRole = useCallback((r: string | null) => setRoleState(r), []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChangedListener((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) setRoleState(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authService.getUserProfile(user.uid).then((profile) => {
      if (!cancelled) setRoleState(profile?.role ?? null);
    });
    return () => { cancelled = true; };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authService.register(email, password);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const value: AuthContextValue = {
    user,
    role,
    loading,
    setRole,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
