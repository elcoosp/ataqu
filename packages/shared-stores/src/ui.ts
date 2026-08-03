import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  focusMode: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setFocusMode: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      focusMode: false,
      theme: 'dark',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setFocusMode: (enabled) => set({ focusMode: enabled }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-storage' }
  )
);
