import { useOnboardingStore } from '@ataqu/shared-stores';
import { useCallback, useState } from 'react';

export interface TourStep {
  target: string;
  content: string;
  title?: string;
}

export const useOnboard = (tourId: string) => {
  const { markCompleted, isCompleted } = useOnboardingStore();
  const [isActive, setIsActive] = useState(!isCompleted(tourId));

  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const complete = useCallback(() => {
    markCompleted(tourId);
    setIsActive(false);
  }, [tourId, markCompleted]);

  const skip = useCallback(() => {
    setIsActive(false);
  }, []);

  return { isActive, start, complete, skip, isCompleted: isCompleted(tourId) };
};
