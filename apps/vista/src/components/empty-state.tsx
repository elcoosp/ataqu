import { cn } from "@ataqu/ui";
import type React from "react";

interface EmptyStateProps {
	icon: React.ElementType;
	title: string;
	description: string;
	ctaLabel: string;
	className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon: Icon,
	title,
	description,
	ctaLabel,
	className,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-700/40 rounded-lg",
				className,
			)}
		>
			<Icon className="h-12 w-12 text-muted-foreground mb-4" />
			<h3 className="text-lg font-medium text-white mb-2">{title}</h3>
			<p className="text-sm text-muted-foreground mb-4 max-w-md">
				{description}
			</p>
			<button
				type="button"
				className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
			>
				{ctaLabel}
			</button>
		</div>
	);
};
