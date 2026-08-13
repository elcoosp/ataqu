import { Button } from "@ataqu/ui";
import type React from "react";

interface EmptyStateProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	ctaLabel?: string;
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
			<div className="h-12 w-12 text-muted-foreground mb-4 flex items-center justify-center">
				{icon}
			</div>
			<h3 className="text-lg font-heading font-semibold text-foreground mb-2">
				{title}
			</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-md">
				{description}
			</p>
			{ctaLabel && <Button onClick={onCtaClick}>{ctaLabel}</Button>}
		</div>
	);
};
