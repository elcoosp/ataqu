import { createFileRoute } from "@tanstack/react-router";
import { ProductDetail } from "../../../../apps/vault/components/product-detail";

export const Route = createFileRoute("/_auth/vault/products/$id")({
	component: ProductDetailPage,
});

function ProductDetailPage() {
	const { id } = Route.useParams();

	return (
		<>
			<ProductDetail productId={id} />
		</>
	);
}
