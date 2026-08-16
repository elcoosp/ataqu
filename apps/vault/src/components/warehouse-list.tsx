import {
	useCreateWarehouse,
	useListWarehouses,
	useUpdateWarehouse,
} from "@ataqu/api-client";
import { Button, Input, Label, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { EmptyState } from "./empty-state";
import { WarehouseIcon } from "./icons";
import { showToast } from "./toast-store";

export function WarehouseList() {
	const queryClient = useQueryClient();
	const warehousesQuery = useListWarehouses();
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [name, setName] = useState("");
	const [location, setLocation] = useState("");

	const createWarehouse = useCreateWarehouse({
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["vault", "warehouses"] });
			showToast({
				variant: "success",
				title: <Trans>Warehouse created.</Trans>,
			});
			setName("");
			setLocation("");
			setShowCreateForm(false);
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Warehouse creation failed.</Trans>,
				description: (
					<Trans>A warehouse with this name may already exist.</Trans>
				),
			});
		},
	});

	const updateWarehouse = useUpdateWarehouse({
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["vault", "warehouses"] });
			showToast({
				variant: "success",
				title: <Trans>Warehouse updated.</Trans>,
			});
			setEditingId(null);
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Warehouse update failed.</Trans>,
			});
		},
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editLocation, setEditLocation] = useState("");

	const startEdit = (id: string, wName: string, wLocation?: string) => {
		setEditingId(id);
		setEditName(wName);
		setEditLocation(wLocation ?? "");
	};

	const saveEdit = (id: string) => {
		updateWarehouse.mutate({
			id,
			data: {
				name: editName,
				location: editLocation.trim() === "" ? null : editLocation.trim(),
			},
			version: warehouses.find((w) => w.id === id)?.version ?? 0,
		});
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (name.trim().length === 0 || createWarehouse.isPending) return;

		createWarehouse.mutate({
			name: name.trim(),
			location: location.trim() === "" ? undefined : location.trim(),
		});
	};

	if (warehousesQuery.isLoading) {
		return <Skeleton className="h-64 w-full" />;
	}

	if (warehousesQuery.isError) {
		return (
			<EmptyState
				icon={<WarehouseIcon />}
				title={<Trans>Unable to load warehouses</Trans>}
				description={
					<Trans>Reload the page or try again in a few seconds.</Trans>
				}
			/>
		);
	}

	const warehouses = warehousesQuery.data ?? [];

	if (warehouses.length === 0 && !showCreateForm) {
		return (
			<EmptyState
				icon={<WarehouseIcon />}
				title={<Trans>No warehouses</Trans>}
				description={<Trans>Add your first location.</Trans>}
				ctaLabel={<Trans>Create Warehouse</Trans>}
				onCtaClick={() => setShowCreateForm(true)}
			/>
		);
	}

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-heading text-xl font-semibold text-foreground">
					<Trans>Warehouses</Trans>
				</h2>
				<Button
					type="button"
					onClick={() => setShowCreateForm((current) => !current)}
				>
					{showCreateForm ? (
						<Trans>Close</Trans>
					) : (
						<Trans>Create Warehouse</Trans>
					)}
				</Button>
			</div>

			{showCreateForm ? (
				<form
					onSubmit={handleSubmit}
					className="space-y-4 rounded-lg border border-border bg-card p-4"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="warehouse-name">
								<Trans>Name</Trans>
							</Label>
							<Input
								id="warehouse-name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder={"Main warehouse"}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="warehouse-location">
								<Trans>Location</Trans>
							</Label>
							<Input
								id="warehouse-location"
								value={location}
								onChange={(event) => setLocation(event.target.value)}
								placeholder={"Berlin, DE"}
							/>
						</div>
					</div>
					<Button
						type="submit"
						disabled={name.trim().length === 0 || createWarehouse.isPending}
					>
						{createWarehouse.isPending ? (
							<Trans>Creating...</Trans>
						) : (
							<Trans>Create Warehouse</Trans>
						)}
					</Button>
				</form>
			) : null}

			{warehouses.length === 0 ? null : (
				<div className="overflow-x-auto rounded-lg border border-border">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-4 py-3">
									<Trans>Name</Trans>
								</th>
								<th className="px-4 py-3">
									<Trans>Location</Trans>
								</th>
							</tr>
						</thead>
						<tbody>
							{warehouses.map((warehouse) => (
								<tr
									key={warehouse.id}
									className="border-b border-border last:border-b-0"
								>
									<td className="px-4 py-3 font-medium text-foreground">
										{editingId === warehouse.id ? (
											<Input
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												className="h-8"
											/>
										) : (
											warehouse.name
										)}
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{editingId === warehouse.id ? (
											<Input
												value={editLocation}
												onChange={(e) => setEditLocation(e.target.value)}
												className="h-8"
												placeholder="—"
											/>
										) : (
											(warehouse.location ?? "—")
										)}
									</td>
									<td className="px-4 py-3">
										{editingId === warehouse.id ? (
											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={() => saveEdit(warehouse.id)}
													disabled={updateWarehouse.isPending}
												>
													<Trans>Save</Trans>
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => setEditingId(null)}
												>
													<Trans>Cancel</Trans>
												</Button>
											</div>
										) : (
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													startEdit(
														warehouse.id,
														warehouse.name,
														warehouse.location,
													)
												}
											>
												<Trans>Edit</Trans>
											</Button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
