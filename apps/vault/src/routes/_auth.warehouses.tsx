import { createFileRoute } from '@tanstack/react-router';
import { WarehouseList } from '../components/warehouse-list';

export const Route = createFileRoute('/_auth/warehouses')({
  component: WarehousesPage,
});

function WarehousesPage() {
  return <WarehouseList />;
}
