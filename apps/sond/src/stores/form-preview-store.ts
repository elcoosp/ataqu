import { create } from 'zustand';
import type { FormMode } from '../components/builder/types';

interface FormPreviewState {
  mode: FormMode;
  currentSlide: number;
  answers: Record<string, unknown>;
  setMode: (mode: FormMode) => void;
  setCurrentSlide: (slide: number) => void;
  setAnswer: (questionId: string, value: unknown) => void;
  reset: () => void;
}

export const useFormPreviewStore = create<FormPreviewState>((set) => ({
  mode: 'standard',
  currentSlide: 0,
  answers: {},
  setMode: (mode) => set({ mode }),
  setCurrentSlide: (slide) => set({ currentSlide: slide }),
  setAnswer: (questionId, value) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: value } })),
  reset: () => set({ currentSlide: 0, answers: {} }),
}));
