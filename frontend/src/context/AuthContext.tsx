'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // "Auto login": on first mount, ask the API whether our httpOnly cookie
  // still represents a valid session. If so, restore the user without the
  // person having to log in again after a refresh.
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard "restore session on mount" pattern: refreshUser is async and
    // sets state only after its awaited request resolves, so this does not
    // cause a synchronous render-phase cascade despite how the rule reads it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
    } else {
      disconnectSocket();
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/auth/login', { email, password });
    setUser(data.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.post<{ user: User }>('/auth/signup', { name, email, password });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // even if the server call fails, clear local state so the UI doesn't hang
  }
  setUser(null);
  disconnectSocket();
  router.refresh();      // 👈 add this — invalidates the Router Cache
  router.push('/login');
}, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };


