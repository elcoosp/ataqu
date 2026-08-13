import { Trans } from '@lingui/react/macro';
import { Button } from '@ataqu/ui';
import { cn } from '@ataqu/ui';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description: React.ReactNode;
  ctaLabel?: React.ReactNode;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {ctaLabel && onCta && (
        <Button onClick={onCta} className="mt-4">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
