import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
export type PresenceStatus = 'online' | 'away' | 'offline';

interface DialState {
  activeChannelId: string | null;
  connectionState: ConnectionState;
  presenceMap: Record<string, PresenceStatus>;
  focusMode: boolean;
  setActiveChannel: (channelId: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  setPresence: (userId: string, status: PresenceStatus) => void;
  removePresence: (userId: string) => void;
  toggleFocusMode: () => void;
}

export const useDialStore = create<DialState>()(
  persist(
    (set) => ({
      activeChannelId: null,
      connectionState: 'disconnected',
      presenceMap: {},
      focusMode: false,
      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
      setConnectionState: (state) => set({ connectionState: state }),
      setPresence: (userId, status) =>
        set((s) => ({
          presenceMap: { ...s.presenceMap, [userId]: status },
        })),
      removePresence: (userId) =>
        set((s) => {
          const { [userId]: _, ...rest } = s.presenceMap;
          return { presenceMap: rest };
        }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    {
      name: 'dial-storage',
      partialize: (state) => ({
        focusMode: state.focusMode,
        // Do not persist connection state or presence
      }),
    }
  )
);
