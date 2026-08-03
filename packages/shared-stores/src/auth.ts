import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TenantId } from '@ataqu/types';

interface AuthState {
  token: string | null;
  user: User | null;
  tenantId: TenantId | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenantId: null,
      login: (token, user) => set({ token, user, tenantId: user.tenantId }),
      logout: () => set({ token: null, user: null, tenantId: null }),
    }),
    { name: 'auth-storage' }
  )
);
