import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalog } from "../../../../apps/vault/components/product-catalog";
import { ToastViewport } from "../../../../apps/vault/components/toast-viewport";

export const Route = createFileRoute("/_auth/vault/products/")({
	component: ProductsIndexPage,
});

function ProductsIndexPage() {
	return (
		<>
			<ToastViewport />
			<ProductCatalog />
		</>
	);
}
