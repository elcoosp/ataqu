import { create } from 'zustand';

interface DrillDownState {
  isOpen: boolean;
  widgetId: string | null;
  dimension: string | null;
  value: string | null;
  loading: boolean;
  data: Record<string, unknown>[];
  setOpen: (open: boolean) => void;
  setDrillDown: (data: Partial<Omit<DrillDownState, 'setOpen' | 'setDrillDown'>>) => void;
}

export const useDrillDownStore = create<DrillDownState>((set) => ({
  isOpen: false,
  widgetId: null,
  dimension: null,
  value: null,
  loading: false,
  data: [],
  setOpen: (open) => set({ isOpen: open }),
  setDrillDown: (data) => set((state) => ({ ...state, ...data })),
}));
