import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalog } from "../../../../apps/vault/components/product-catalog";

export const Route = createFileRoute("/_auth/vault/products/")({
	component: ProductsIndexPage,
});

function ProductsIndexPage() {
	return (
		<>
			<ProductCatalog />
		</>
	);
}
