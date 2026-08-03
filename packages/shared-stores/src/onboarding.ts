import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  completedTours: Record<string, boolean>;
  markCompleted: (tourId: string) => void;
  isCompleted: (tourId: string) => boolean;
}
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedTours: {},
      markCompleted: (tourId) => set((s) => ({ completedTours: { ...s.completedTours, [tourId]: true } })),
      isCompleted: (tourId) => !!get().completedTours[tourId],
    }),
    { name: 'onboarding-storage' }
  )
);
