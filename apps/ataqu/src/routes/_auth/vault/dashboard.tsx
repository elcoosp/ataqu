import {
	useGetLowStockAlerts,
	useListProducts,
	useListVariants,
	useListWarehouses,
} from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	Box,
	Package,
	Plus,
	Warehouse,
} from "lucide-react";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/vault/dashboard")({
	component: VaultDashboard,
});

function MetricCard({
	label,
	value,
	sub,
	icon: Icon,
	warn,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ElementType;
	warn?: boolean;
}) {
	const col = warn
		? "bg-destructive/10 text-destructive"
		: "bg-amber/10 text-amber";
	return (
		<Card className="overflow-hidden">
			<div className="p-5">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</p>
						<p className="text-2xl font-bold text-white mt-1">{value}</p>
						{sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
					</div>
					<div className={col}>
						<Icon className="h-4 w-4" />
					</div>
				</div>
			</div>
		</Card>
	);
}

function ProductRow({ p }: { p: { id: string; name: string; sku: string } }) {
	return (
		<Link to="/vault/products/$id" params={{ id: p.id }} className="block">
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-semibold text-white truncate max-w-[200px]">
								{p.name}
							</h4>
							<p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
						</div>
						<ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function WarehouseRow({
	w,
}: {
	w: { id: string; name: string; location?: string };
}) {
	return (
		<Link to="/vault/warehouses" className="block">
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-semibold text-white">{w.name}</h4>
							{w.location && (
								<p className="text-xs text-muted-foreground mt-0.5">
									{w.location}
								</p>
							)}
						</div>
						<ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function EmptyBox({
	title,
	desc,
	icon: Icon,
	action,
	onClick,
}: {
	title: string;
	desc: string;
	icon: React.ElementType;
	action?: string;
	onClick?: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-10 text-center">
			<div className="mb-3 rounded-full bg-muted p-3">
				<Icon className="h-5 w-5 text-muted-foreground" />
			</div>
			<p className="text-sm font-medium text-white">{title}</p>
			<p className="text-xs text-muted-foreground mt-1 max-w-xs">{desc}</p>
			{action && onClick && (
				<Button className="mt-4" size="sm" onClick={onClick}>
					{action}
				</Button>
			)}
		</div>
	);
}

function VaultDashboard() {
	const { data: productsData, isLoading: pL } = useListProducts({ limit: 5 });
	const { data: warehousesData, isLoading: wL } = useListWarehouses();
	const { data: lowStockData } = useGetLowStockAlerts({
		threshold: 10,
	});
	const { data: variantsData } = useListVariants({ limit: 1 });
	const products = productsData?.items ?? [];
	const warehouses = warehousesData ?? [];
	const lowStock = lowStockData ?? [];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>Inventory</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>Products, variants, stock, and warehouses.</Trans>
					</p>
				</div>
				<div className="flex gap-2">
					<Button size="sm" asChild>
						<Link to="/vault/products">
							<Plus className="h-3.5 w-3.5 mr-1.5" />
							<Trans>Add Product</Trans>
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link to="/vault/warehouses">
							<Warehouse className="h-3.5 w-3.5 mr-1.5" />
							<Trans>Warehouses</Trans>
						</Link>
					</Button>
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					label={t`Products`}
					value={productsData?.total ?? products.length}
					sub={
						warehouses.length === 1
							? t`1 warehouse`
							: `${warehouses.length} warehouses`
					}
					icon={Package}
				/>
				<MetricCard
					label={t`Variants`}
					value={variantsData?.total ?? 0}
					sub={t`across all products`}
					icon={Box}
				/>
				<MetricCard
					label={t`Low Stock`}
					value={lowStock.length}
					sub={lowStock.length > 0 ? t`below threshold` : t`all stocked`}
					icon={AlertTriangle}
					warn={lowStock.length > 0}
				/>
				<MetricCard
					label={t`Warehouses`}
					value={warehouses.length}
					sub={t`stock locations`}
					icon={Warehouse}
				/>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Package className="h-4 w-4 text-amber" />
								<Trans>Recent Products</Trans>
							</CardTitle>
							<Link
								to="/vault/products"
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{pL ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Bone
										key={i}
										loading
										name={`vault-prod-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : products.length === 0 ? (
							<EmptyBox
								title={t`No products`}
								desc={t`Import from Shopify or add your first product.`}
								icon={Package}
								action={t`Add Product`}
								onClick={() => {
									navigate("/vault/products");
								}}
							/>
						) : (
							products.slice(0, 5).map((p) => <ProductRow key={p.id} p={p} />)
						)}
					</CardContent>
				</Card>
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Warehouse className="h-4 w-4 text-amber" />
								<Trans>Warehouses</Trans>
							</CardTitle>
							<Link
								to="/vault/warehouses"
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{wL ? (
							<div className="space-y-2">
								{[1, 2].map((i) => (
									<Bone
										key={i}
										loading
										name={`vault-wh-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : warehouses.length === 0 ? (
							<EmptyBox
								title={t`No warehouses`}
								desc={t`Add warehouses to track stock locations.`}
								icon={Warehouse}
								action={t`Add Warehouse`}
								onClick={() => {
									navigate("/vault/warehouses");
								}}
							/>
						) : (
							warehouses.map((w) => <WarehouseRow key={w.id} w={w} />)
						)}
					</CardContent>
				</Card>
			</div>
			{lowStock.length > 0 && (
				<Card className="border-destructive/30">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
							<AlertTriangle className="h-4 w-4" />
							<Trans>Low Stock Alerts</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{lowStock.map((v) => (
								<Link
									key={v.id}
									to="/vault/products/$id"
									params={{ id: v.product_id }}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs hover:bg-destructive/20"
								>
									<Box className="h-3 w-3" />
									{v.sku} — {v.stock_quantity} left
								</Link>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
