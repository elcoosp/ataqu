import React, { useState } from 'react';
import { TourProvider, TourStep, useTour } from '@reactour/tour';
import { useOnboardingStore } from '@ataqu/shared-stores';
import { Button } from './button';

interface OnboardTourProps {
  tourId: string;
  steps: TourStep[];
  children: React.ReactNode;
}

const TourContent: React.FC<{ tourId: string }> = ({ tourId }) => {
  const { isOpen, setIsOpen, currentStep, steps, setCurrentStep } = useTour();
  const { markCompleted } = useOnboardingStore();

  const handleClose = () => {
    setIsOpen(false);
    markCompleted(tourId);
  };

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      handleClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <div
      className="fixed z-50 max-w-sm p-4 rounded-lg shadow-lg bg-deep-night/90 backdrop-blur-xl border border-gray-700/40 text-white"
      style={{
        top: step.content?.style?.top || '50%',
        left: step.content?.style?.left || '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="text-white">
        <h3 className="font-heading text-lg mb-2">{step.content?.title}</h3>
        <p className="text-sm text-gray-300">{step.content?.text}</p>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
          Skip
        </Button>
        <Button size="sm" onClick={handleNext} className="bg-amber text-black hover:bg-amber/90">
          {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export const OnboardTour: React.FC<OnboardTourProps> = ({ tourId, steps, children }) => {
  const { isCompleted } = useOnboardingStore();
  const completed = isCompleted(tourId);

  if (completed) return <>{children}</>;

  return (
    <TourProvider
      steps={steps}
      onClickMask={() => {}}
      onAfterOpen={() => {}}
      styles={{
        popover: (base) => ({
          ...base,
          background: 'rgba(10, 22, 40, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '400px',
        }),
        mask: (base) => ({
          ...base,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }),
      }}
    >
      {children}
      <TourContent tourId={tourId} />
    </TourProvider>
  );
};
