import { createFileRoute } from "@tanstack/react-router";
import { WarehouseList } from "../../../apps/vault/components/warehouse-list";

export const Route = createFileRoute("/_auth/vault/warehouses")({
	component: WarehousesPage,
});

function WarehousesPage() {
	return (
		<>
			<WarehouseList />
		</>
	);
}
