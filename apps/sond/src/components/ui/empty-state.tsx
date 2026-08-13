import { Button } from "@ataqu/ui";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	ctaLabel?: string;
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
			<div className="mb-4 rounded-full bg-muted p-4">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="text-lg font-semibold">{title}</h3>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			{ctaLabel && (
				<Button className="mt-6" onClick={onCtaClick}>
					{ctaLabel}
				</Button>
			)}
		</div>
	);
}
