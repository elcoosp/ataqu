import { useSelectionStore } from "@ataqu/shared-stores";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

interface SelectionCheckboxProps {
	/** Selection scope key, e.g. "cinq:contacts" */
	scope: string;
	/** Entity id this checkbox toggles */
	id: string;
	/** Accessible label */
	label?: string;
	className?: string;
}

/**
 * Checkbox bound to the shared selection store (spec 2.2 / 2.7). Place one in
 * each table row and a header variant with `allIds` to toggle the whole page.
 */
export function SelectionCheckbox({
	scope,
	id,
	label = "Select row",
	className,
}: SelectionCheckboxProps) {
	const checked = useSelectionStore((s) => !!s.selections[scope]?.has(id));
	const toggle = useSelectionStore((s) => s.toggle);

	return (
		<Checkbox.Root
			checked={checked}
			onCheckedChange={() => toggle(scope, id)}
			aria-label={label}
			className={cn(
				"h-4 w-4 shrink-0 rounded border border-gray-600 bg-transparent",
				"data-[state=checked]:bg-amber data-[state=checked]:border-amber",
				"focus:outline-none focus-visible:ring-1 focus-visible:ring-amber",
				className,
			)}
		>
			<Checkbox.Indicator>
				<Check className="h-3.5 w-3.5 text-black" />
			</Checkbox.Indicator>
		</Checkbox.Root>
	);
}

interface SelectAllCheckboxProps {
	scope: string;
	ids: string[];
	label?: string;
}

/** Header checkbox: selects/deselects every row currently visible. */
export function SelectAllCheckbox({
	scope,
	ids,
	label = "Select all",
}: SelectAllCheckboxProps) {
	const selected = useSelectionStore((s) => s.selections[scope]);
	const selectAllFor = useSelectionStore((s) => s.selectAllFor);
	const allSelected = ids.length > 0 && ids.every((i) => selected?.has(i));

	return (
		<Checkbox.Root
			checked={allSelected}
			onCheckedChange={(v) => selectAllFor(scope, ids, v === true)}
			aria-label={label}
			className={cn(
				"h-4 w-4 shrink-0 rounded border border-gray-600 bg-transparent",
				"data-[state=checked]:bg-amber data-[state=checked]:border-amber",
				"focus:outline-none focus-visible:ring-1 focus-visible:ring-amber",
			)}
		>
			<Checkbox.Indicator>
				<Check className="h-3.5 w-3.5 text-black" />
			</Checkbox.Indicator>
		</Checkbox.Root>
	);
}
