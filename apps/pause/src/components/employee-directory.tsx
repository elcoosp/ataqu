import {
	useBulkDeactivateEmployees,
	useListEmployees,
	useSearchEmployees,
} from "@ataqu/api-client";
import { useDebounce } from "@ataqu/shared-hooks";
import {
	Bone,
	Button,
	Card,
	ExpandingSearch,
	HoldToConfirm,
	Input,
	SkeletonSwap,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "./empty-state";

export function EmployeeDirectory({
	onAddEmployee,
}: {
	onAddEmployee: () => void;
}) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const bulkDeactivate = useBulkDeactivateEmployees({
		onSuccess: () => {
			setSelectedIds([]);
			queryClient.invalidateQueries({ queryKey: ["pause", "employees"] });
			toast.success(t`Employees deactivated.`);
		},
		onError: () => toast.error(t`Failed to deactivate employees.`),
	});

	const isSearching = debouncedSearch.trim().length > 0;

	const { data: employees, isLoading } = useListEmployees(
		{ limit: 100, offset: 0 },
		{
			queryKey: ["pause", "employees", "list", { limit: 100, offset: 0 }],
			enabled: !isSearching,
		},
	);
	const { data: searchResults, isLoading: isSearchLoading } =
		useSearchEmployees(
			{ q: debouncedSearch },
			{
				queryKey: ["pause", "employees", "search", debouncedSearch],
				enabled: isSearching,
			},
		);

	const list = isSearching ? searchResults : employees;

	if (isLoading || isSearchLoading) {
		return (
			<SkeletonSwap ready={false} lines={6}>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="h-32 w-full" />
					<div className="h-32 w-full" />
					<div className="h-32 w-full" />
				</div>
			</SkeletonSwap>
		);
	}

	if (!list || list.length === 0) {
		return (
			<EmptyState
				icon={Users}
				title={t`No employees`}
				description={t`Add your first employee to get started.`}
				ctaLabel={t`Add Employee`}
				onCtaClick={onAddEmployee}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<ExpandingSearch
						value={search}
						onChange={setSearch}
						placeholder={t`Search employees...`}
						className="bg-deep-night/50"
					/>
				</div>
				<Button onClick={onAddEmployee}>
					<UserPlus className="h-4 w-4 mr-2" />
					<Trans>Add Employee</Trans>
				</Button>
			</div>

			{selectedIds.length > 0 && (
				<div className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
					<span className="text-sm text-muted-foreground">
						{selectedIds.length} selected
					</span>
					<HoldToConfirm
						onConfirm={() => bulkDeactivate.mutate({ ids: selectedIds })}
						disabled={bulkDeactivate.isPending}
						className="bg-red-600 text-white hover:bg-red-500"
					>
						<Trans>Deactivate selected</Trans>
					</HoldToConfirm>
					<Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
						<Trans>Clear</Trans>
					</Button>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{list.map((emp) => (
					<Card
						key={emp.id}
						className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
						onClick={() =>
							navigate({ to: "/employees/$id", params: { id: emp.id } })
						}
					>
						<div className="flex items-center space-x-4">
							<input
								type="checkbox"
								aria-label={`Select ${emp.full_name}`}
								className="h-4 w-4"
								checked={selectedIds.includes(emp.id)}
								onClick={(e) => e.stopPropagation()}
								onChange={(e) =>
									setSelectedIds((prev) =>
										e.target.checked
											? [...prev, emp.id]
											: prev.filter((id) => id !== emp.id),
									)
								}
							/>
							<div className="h-12 w-12 rounded-full bg-amber/20 flex items-center justify-center text-amber font-bold">
								{emp.full_name.charAt(0)}
							</div>
							<div>
								<h3 className="font-semibold text-white">{emp.full_name}</h3>
								<p className="text-sm text-gray-400">{emp.job_title}</p>
								<p className="text-xs text-gray-500">{emp.email}</p>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
