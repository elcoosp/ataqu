// apps/aegis/src/stores/auth-store.ts
// Zustand store with persistence for authentication state.
// Uses @ataqu/api-client for token operations.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@ataqu/types';
import { api } from '@ataqu/api-client';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<boolean>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,

      login: (token, refreshToken, user) => {
        set({
          token,
          refreshToken,
          user,
          tenantId: user.tenantId || null,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          tenantId: null,
          isAuthenticated: false,
        });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const response = await api.post<{ access_token: string; refresh_token: string; user_id: string }>(
            '/aegis/refresh',
            { refresh_token: refreshToken }
          );
          const { access_token, refresh_token } = response;
          set({
            token: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
          });
          return true;
        } catch {
          set({
            token: null,
            refreshToken: null,
            user: null,
            tenantId: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'ataqu-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
