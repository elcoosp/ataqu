import { createFileRoute } from '@tanstack/react-router';
import { ProductCatalog } from '../components/product-catalog';

export const Route = createFileRoute('/_auth/products/')({
  component: ProductsIndexPage,
});

function ProductsIndexPage() {
  return <ProductCatalog />;
}
