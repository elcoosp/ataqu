import { Button } from "@ataqu/ui";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: React.ReactNode;
	description: React.ReactNode;
	ctaLabel?: React.ReactNode;
	onCtaClick?: () => void;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	ctaLabel,
	onCtaClick,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
				<Icon className="h-8 w-8 text-primary" />
			</div>
			<h3 className="text-xl font-heading font-bold text-foreground mb-2">
				{title}
			</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-sm">
				{description}
			</p>
			{ctaLabel && <Button onClick={onCtaClick}>{ctaLabel}</Button>}
		</div>
	);
}
