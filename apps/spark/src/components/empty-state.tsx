import type { LucideIcon } from 'lucide-react';
import { Button } from '@ataqu/ui';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {ctaLabel && (
        <Button onClick={onCtaClick}>{ctaLabel}</Button>
      )}
    </div>
  );
}
