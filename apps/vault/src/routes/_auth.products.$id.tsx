import { createFileRoute } from '@tanstack/react-router';
import { ProductDetail } from '../components/product-detail';

export const Route = createFileRoute('/_auth/products/$id')({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  return <ProductDetail productId={id} />;
}
