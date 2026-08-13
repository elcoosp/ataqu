import { Button, cn } from "@ataqu/ui";
import type React from "react";

interface EmptyStateProps {
	icon: React.ElementType;
	title: string;
	description: string;
	ctaLabel?: string;
	onCtaClick?: () => void;
	className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon: Icon,
	title,
	description,
	ctaLabel,
	onCtaClick,
	className,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-16 px-4 text-center",
				className,
			)}
		>
			<div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
				<Icon className="h-6 w-6 text-muted-foreground" />
			</div>
			<h3 className="text-lg font-semibold mb-1">{title}</h3>
			<p className="text-sm text-muted-foreground mb-4 max-w-xs">
				{description}
			</p>
			{ctaLabel && onCtaClick && (
				<Button onClick={onCtaClick}>{ctaLabel}</Button>
			)}
		</div>
	);
};
