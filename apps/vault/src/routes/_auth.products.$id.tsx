import { createFileRoute } from '@tanstack/react-router';
import { ProductDetail } from '../components/product-detail';
import { ToastViewport } from '../components/toast-viewport';

export const Route = createFileRoute('/_auth/products/$id')({
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
