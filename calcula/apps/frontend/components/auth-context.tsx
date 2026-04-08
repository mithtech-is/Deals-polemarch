'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthToken } from '@/types/domain';

type AuthState = {
  token: string | null;
  role: string | null;
  username: string | null;
  setAuth: (v: AuthToken) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'calcula_token';
const ROLE_KEY = 'calcula_role';
const USERNAME_KEY = 'calcula_username';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)));
  const [role, setRole] = useState<string | null>(() => (typeof window === 'undefined' ? null : localStorage.getItem(ROLE_KEY)));
  const [username, setUsername] = useState<string | null>(() => (typeof window === 'undefined' ? null : localStorage.getItem(USERNAME_KEY)));

  const value = useMemo<AuthState>(
    () => ({
      token,
      role,
      username,
      setAuth: (v) => {
        setToken(v.accessToken);
        setRole(v.role);
        setUsername(v.username);
        localStorage.setItem(TOKEN_KEY, v.accessToken);
        localStorage.setItem(ROLE_KEY, v.role);
        localStorage.setItem(USERNAME_KEY, v.username);
      },
      logout: () => {
        setToken(null);
        setRole(null);
        setUsername(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USERNAME_KEY);
      }
    }),
    [token, role, username]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USERNAME_KEY);
      } catch {}
      value.logout();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    };
    window.addEventListener('calcula:unauthorized', handler);
    return () => window.removeEventListener('calcula:unauthorized', handler);
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
