import { Link } from "@tanstack/react-router";
import type React from "react";
import { Fragment } from "react";

export interface Breadcrumb {
	/** Visible label. */
	label: string;
	/** Optional router target; plain text when omitted. */
	to?: string;
}

/**
 * Page header primitive (brainstorm P2-7): consistent title / breadcrumbs /
 * actions row for every page. `actions` is a slot — render your buttons
 * there so they align with every other page instead of hand-rolled
 * `flex justify-between` rows.
 */
export function PageHeader({
	title,
	breadcrumbs,
	actions,
}: {
	title: React.ReactNode;
	breadcrumbs?: Breadcrumb[];
	actions?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0">
				{breadcrumbs && breadcrumbs.length > 0 && (
					<nav
						aria-label="Breadcrumb"
						className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"
					>
						{breadcrumbs.map((crumb, i) => (
							<Fragment key={`${crumb.label}-${i}`}>
								{i > 0 && <span aria-hidden="true">/</span>}
								{crumb.to ? (
									<Link
										to={crumb.to as never}
										className="hover:text-foreground transition-colors"
									>
										{crumb.label}
									</Link>
								) : (
									<span aria-current="page">{crumb.label}</span>
								)}
							</Fragment>
						))}
					</nav>
				)}
				<h1 className="truncate text-2xl font-heading">{title}</h1>
			</div>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	);
}
