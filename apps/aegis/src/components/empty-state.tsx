// apps/aegis/src/components/empty-state.tsx
import { LucideIcon } from 'lucide-react';
import { Button } from "@ataqu/ui";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <Icon className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-heading mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      <Button onClick={onCta}>{ctaLabel}</Button>
    </div>
  );
}
