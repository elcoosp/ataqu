import type React from "react";
import { Button } from "./button";

export interface EmptyStateProps {
	icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
	title: string | React.ReactNode;
	description: string | React.ReactNode;
	ctaLabel?: string | React.ReactNode;
	onCtaClick?: () => void;
	/** @deprecated legacy alias for onCtaClick */
	onCta?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon,
	title,
	description,
	ctaLabel,
	onCtaClick,
	onCta,
}) => {
	const handleCtaClick = onCtaClick ?? onCta;
	const iconNode =
		typeof icon === "function"
			? (() => {
					const Icon = icon as React.ComponentType<{ className?: string }>;
					return <Icon className="h-10 w-10" />;
				})()
			: icon;
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			{iconNode && <div className="mb-4 text-muted-foreground">{iconNode}</div>}
			<h3 className="text-xl font-heading font-bold text-foreground mb-2">
				{title}
			</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-sm">
				{description}
			</p>
			{ctaLabel && handleCtaClick && (
				<Button onClick={handleCtaClick}>{ctaLabel}</Button>
			)}
		</div>
	);
};
