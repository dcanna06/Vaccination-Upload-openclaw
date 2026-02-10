import { create } from 'zustand';
import { env } from '@/lib/env';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Login failed' }));
        set({ isLoading: false, error: data.message || data.detail || 'Login failed' });
        return false;
      }

      // Fetch user info
      const meRes = await fetch(`${env.apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (meRes.ok) {
        const user = await meRes.json();
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }

      set({ isLoading: false, error: 'Failed to fetch user info' });
      return false;
    } catch {
      set({ isLoading: false, error: 'Network error' });
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch(`${env.apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors on logout
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (res.ok) {
        const user = await res.json();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
