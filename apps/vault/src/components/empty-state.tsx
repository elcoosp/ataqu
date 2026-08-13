import { Button } from "@ataqu/ui";
import type { ReactNode } from "react";

export interface EmptyStateProps {
	icon?: ReactNode;
	title: ReactNode;
	description: ReactNode;
	ctaLabel?: ReactNode;
	onCtaClick?: () => void;
}

export function EmptyState({
	icon,
	title,
	description,
	ctaLabel,
	onCtaClick,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-16 text-center">
			{icon}
			<div className="space-y-1">
				<h2 className="font-heading text-lg font-semibold text-foreground">
					{title}
				</h2>
				<p className="max-w-md text-sm text-muted-foreground">{description}</p>
			</div>
			{ctaLabel && onCtaClick ? (
				<Button type="button" onClick={onCtaClick}>
					{ctaLabel}
				</Button>
			) : null}
		</div>
	);
}
