import type React from "react";
import type { Breadcrumb } from "./page-header";
import { PageHeader } from "./page-header";

/**
 * Page container with an optional built-in header (title / breadcrumbs /
 * actions). Children-only usage stays supported; passing `title` renders
 * the shared PageHeader above the content column.
 */
export const PageLayout = ({
	children,
	title,
	breadcrumbs,
	actions,
}: {
	children: React.ReactNode;
	title?: React.ReactNode;
	breadcrumbs?: Breadcrumb[];
	actions?: React.ReactNode;
}) => (
	<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		{title !== undefined && (
			<div className="py-4">
				<PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} />
			</div>
		)}
		{children}
	</div>
);
