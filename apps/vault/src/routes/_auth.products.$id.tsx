import { createFileRoute } from '@tanstack/react-router';
import { ProductDetail } from '../components/product-detail';

// @ts-expect-error - routeTree.gen.ts is generated at build time by TanStack Router plugin
export const Route = createFileRoute('/_auth/products/$id')({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  return <ProductDetail productId={id} />;
}
