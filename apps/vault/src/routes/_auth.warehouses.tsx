import { createFileRoute } from '@tanstack/react-router';
import { WarehouseList } from '../components/warehouse-list';

// @ts-expect-error - routeTree.gen.ts is generated at build time by TanStack Router plugin
export const Route = createFileRoute('/_auth/warehouses')({
  component: WarehousesPage,
});

function WarehousesPage() {
  return <WarehouseList />;
}
