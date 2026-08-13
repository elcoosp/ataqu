import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalog } from "../components/product-catalog";
import { ToastViewport } from "../components/toast-viewport";

export const Route = createFileRoute("/_auth/products/")({
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
