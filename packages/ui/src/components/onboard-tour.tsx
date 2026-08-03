import React from 'react';

export const OnboardTour: React.FC<{ tourId: string; children: React.ReactNode }> = ({ children }) => {
  // Simple pass-through for now
  return <>{children}</>;
};
