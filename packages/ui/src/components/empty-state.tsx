import React from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  ctaLabel?: string | React.ReactNode;
  onCtaClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-muted-foreground mb-4">{icon}</div>}
      <h3 className="text-xl font-heading font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {ctaLabel && onCtaClick && (
        <Button onClick={onCtaClick}>{ctaLabel}</Button>
      )}
    </div>
  );
};
