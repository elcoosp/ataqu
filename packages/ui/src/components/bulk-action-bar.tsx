import { useSelectionStore } from "@ataqu/shared-stores";
import { Trans } from "@lingui/react/macro";
import { X } from "lucide-react";
import { Button } from "./button";

export interface BulkAction {
	/** Unique action id */
	id: string;
	/** Visible label */
	label: React.ReactNode;
	/** Optional icon node */
	icon?: React.ReactNode;
	/** Click handler; receives the selected ids */
	onClick: (selectedIds: string[]) => void;
	/** Visual variant passed to Button */
	variant?: "default" | "outline" | "ghost" | "destructive";
}

interface BulkActionBarProps {
	/** Selection scope key, e.g. "cinq:contacts" */
	scope: string;
	/** Actions shown when >=1 row is selected */
	actions: BulkAction[];
}

/**
 * Persistent bulk-action toolbar (spec 2.2 / 2.7). Reads the shared selection
 * store, so the bar stays visible across navigation until the user clears.
 */
export function BulkActionBar({ scope, actions }: BulkActionBarProps) {
	const selected = useSelectionStore((s) => s.selections[scope]);
	const clear = useSelectionStore((s) => s.clear);
	const ids = Array.from(selected ?? []);

	if (ids.length === 0) return null;

	return (
		<div className="flex items-center gap-3 rounded-lg border border-amber/40 bg-deep-night/80 px-4 py-2 backdrop-blur ataqu-glass">
			<span className="text-sm font-medium text-white">
				<Trans>{ids.length} selected</Trans>
			</span>
			<div className="flex items-center gap-2">
				{actions.map((a) => (
					<Button
						key={a.id}
						variant={a.variant ?? "outline"}
						size="sm"
						onClick={() => a.onClick(ids)}
						className="border-gray-700/40 text-gray-200 hover:text-white"
					>
						{a.icon}
						{a.label}
					</Button>
				))}
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => clear(scope)}
				className="ml-auto text-gray-400 hover:text-white"
				aria-label="Clear selection"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
}
