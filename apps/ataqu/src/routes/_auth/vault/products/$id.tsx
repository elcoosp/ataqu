import { createFileRoute } from "@tanstack/react-router";
import { ProductDetail } from "../../../../apps/vault/components/product-detail";
import { ToastViewport } from "../../../../apps/vault/components/toast-viewport";

export const Route = createFileRoute("/_auth/vault/products/$id")({
	component: ProductDetailPage,
});

function ProductDetailPage() {
	const { id } = Route.useParams();

	return (
		<>
			<ToastViewport />
			<ProductDetail productId={id} />
		</>
	);
}
