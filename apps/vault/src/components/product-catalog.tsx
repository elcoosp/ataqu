import { useGetLowStockAlerts, useListProducts } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';
import { Badge, Button, Input, Skeleton } from '@ataqu/ui';
import { useMemo, useState } from 'react';
import { CreateProductForm } from './create-product-form';
import { EmptyState } from './empty-state';
import { PackageIcon } from './icons';

export function ProductCatalog() {
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const productsQuery = useListProducts({ limit: 100, offset: 0 });
  const lowStockQuery = useGetLowStockAlerts({ threshold: 5 });

  const products = productsQuery.data?.items ?? [];
  const lowStockProductIds = useMemo(
    () => new Set((lowStockQuery.data ?? []).map((variant) => variant.product_id)),
    [lowStockQuery.data]
  );

  const filteredProducts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    );
  }, [products, debouncedSearch]);

  if (productsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (productsQuery.isError) {
    return (
      <EmptyState
        title="Unable to load products"
        description="Reload the page or try again in a few seconds."
      />
    );
  }

  if (products.length === 0) {
    if (showCreateForm) {
      return <CreateProductForm onCreated={() => setShowCreateForm(false)} />;
    }
    return (
      <EmptyState
        icon={<PackageIcon />}
        title="No products"
        description="Import your product catalog from CSV, or add your first product."
        ctaLabel="Create Product"
        onCtaClick={() => setShowCreateForm(true)}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          className="max-w-sm"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline">
            Import CSV
          </Button>
          <Button type="button" variant="outline">
            Export CSV
          </Button>
          <Button type="button" onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Close' : 'Create Product'}
          </Button>
        </div>
      </div>

      {showCreateForm ? <CreateProductForm onCreated={() => setShowCreateForm(false)} /> : null}

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<PackageIcon />}
          title="No matching products"
          description="Try another search term or create a new product."
          ctaLabel="Create Product"
          onCtaClick={() => setShowCreateForm(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <a
                      href={`/products/${product.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {product.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {product.description}
                  </td>
                  <td className="px-4 py-3">
                    {lowStockProductIds.has(product.id) ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="secondary">In Stock</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
