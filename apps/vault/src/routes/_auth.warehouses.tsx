import { createFileRoute } from "@tanstack/react-router";
import { ToastViewport } from "../components/toast-viewport";
import { WarehouseList } from "../components/warehouse-list";

export const Route = createFileRoute("/_auth/warehouses")({
	component: WarehousesPage,
});

function WarehousesPage() {
	return (
		<>
			<ToastViewport />
			<WarehouseList />
		</>
	);
}
