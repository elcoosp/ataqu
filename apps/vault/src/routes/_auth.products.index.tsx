import { createFileRoute } from '@tanstack/react-router';
import { ProductCatalog } from '../components/product-catalog';

// @ts-expect-error - routeTree.gen.ts is generated at build time by TanStack Router plugin
export const Route = createFileRoute('/_auth/products/')({
  component: ProductsIndexPage,
});

function ProductsIndexPage() {
  return <ProductCatalog />;
}
