/**
 * VAULT (inventory) handlers — products, variants, stock movements,
 * reservations, warehouses, low-stock alerts, Shopify + Amazon integrations.
 * Mirrors handlers/vault.rs.
 */
import { http, type HttpHandler } from "msw";
import { audit, bump, db, hoursAgo, nextId } from "../db";
import {
	apiError,
	bare,
	callerId,
	checkVersion,
	created,
	jsonBody,
	listParams,
	noContent,
	notFound,
	ok,
	page,
	validationError,
} from "../util";

export const vaultHandlers: HttpHandler[] = [
	// --------------------------------------------------------------- products
	http.get("/api/vault/products", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const url = new URL(request.url);
		const qs = url.searchParams.get("q");
		let rows = [...db.products].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		if (qs) {
			rows = rows.filter(
				(p) =>
					p.name.toLowerCase().includes(qs.toLowerCase()) ||
					p.sku.toLowerCase().includes(qs.toLowerCase()) ||
					p.description.toLowerCase().includes(qs.toLowerCase()),
			);
		}
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/vault/products", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; description?: string; sku: string }>(request);
		if (!body.name?.trim() || !body.sku?.trim()) {
			return validationError("Name and SKU are required");
		}
		if (db.products.some((p) => p.sku.toLowerCase() === body.sku.toLowerCase())) {
			return apiError("CONFLICT", "A product with this SKU already exists");
		}
		const now = new Date().toISOString();
		const product = {
			id: nextId("prd"),
			name: body.name.trim(),
			description: body.description ?? "",
			sku: body.sku.trim(),
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.products.push(product);
		audit(actor, "product.create", "vault", "product", product.id, { sku: product.sku });
		return created(product);
	}),

	http.get("/api/vault/products/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const product = db.products.find((p) => p.id === params.id);
		return product ? ok(product) : notFound("Product");
	}),

	http.put("/api/vault/products/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const product = db.products.find((p) => p.id === params.id);
		if (!product) return notFound("Product");
		const conflictResp = checkVersion(request, product.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ name?: string; description?: string; sku?: string }>(request);
		if (body.name != null) product.name = body.name;
		if (body.description != null) product.description = body.description;
		if (body.sku != null) product.sku = body.sku;
		product.updated_at = new Date().toISOString();
		const v = bump(product);
		audit(actor, "product.update", "vault", "product", product.id, body);
		return ok({ ...product, version: v });
	}),

	http.delete("/api/vault/products/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.products.findIndex((p) => p.id === params.id);
		if (idx === -1) return notFound("Product");
		db.products.splice(idx, 1);
		db.variants = db.variants.filter((v) => v.product_id !== params.id);
		audit(actor, "product.delete", "vault", "product", params.id as string);
		return noContent();
	}),

	http.post("/api/vault/products/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.products = db.products.filter((p) => !ids?.includes(p.id));
		db.variants = db.variants.filter((v) => !ids?.includes(v.product_id));
		audit(actor, "product.bulk_delete", "vault", "product", undefined, { count: ids?.length ?? 0 });
		return noContent();
	}),

	// --------------------------------------------------------------- variants
	http.get("/api/vault/variants", ({ request, params: _p }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const productId = new URL(request.url).searchParams.get("product_id");
		const rows = productId
			? db.variants.filter((v) => v.product_id === productId)
			: db.variants;
		return page(rows, listParams(request, 100));
	}),

	http.post("/api/vault/variants", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ product_id: string; sku: string; initial_stock: number; price: number }>(request);
		if (!body.product_id || !body.sku?.trim()) {
			return validationError("product_id and SKU are required");
		}
		if (db.variants.some((v) => v.sku.toLowerCase() === body.sku.toLowerCase())) {
			return apiError("CONFLICT", "A variant with this SKU already exists");
		}
		const now = new Date().toISOString();
		const variant = {
			id: nextId("var"),
			product_id: body.product_id,
			sku: body.sku.trim(),
			price: body.price ?? 0,
			stock_quantity: body.initial_stock ?? 0,
			reserved_quantity: 0,
			created_at: now,
			updated_at: now,
			version: 1,
		};
		db.variants.push(variant);
		if (variant.stock_quantity > 0) {
			db.movements.push({
				id: nextId("mov"),
				variant_id: variant.id,
				quantity: variant.stock_quantity,
				reason: "Initial stock",
				timestamp: now,
			});
		}
		audit(actor, "variant.create", "vault", "variant", variant.id, { sku: variant.sku });
		return created(variant);
	}),

	http.get("/api/vault/variants/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const variant = db.variants.find((v) => v.id === params.id);
		return variant ? ok(variant) : notFound("Variant");
	}),

	http.put("/api/vault/variants/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const variant = db.variants.find((v) => v.id === params.id);
		if (!variant) return notFound("Variant");
		const conflictResp = checkVersion(request, variant.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ price?: number; sku?: string }>(request);
		if (body.price != null) variant.price = body.price;
		if (body.sku != null) variant.sku = body.sku;
		variant.updated_at = new Date().toISOString();
		const v = bump(variant);
		return ok({ ...variant, version: v });
	}),

	http.delete("/api/vault/variants/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.variants.findIndex((v) => v.id === params.id);
		if (idx === -1) return notFound("Variant");
		db.variants.splice(idx, 1);
		audit(actor, "variant.delete", "vault", "variant", params.id as string);
		return noContent();
	}),

	http.post("/api/vault/variants/bulk-delete", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { ids } = await jsonBody<{ ids: string[] }>(request);
		db.variants = db.variants.filter((v) => !ids?.includes(v.id));
		return noContent();
	}),

	// ------------------------------------------------------------------ stock
	http.put("/api/vault/variants/:variantId/stock", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const variant = db.variants.find((v) => v.id === params.variantId);
		if (!variant) return notFound("Variant");
		const conflictResp = checkVersion(request, variant.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ delta: number; reason: string; reference?: string }>(request);
		if (typeof body.delta !== "number" || !body.reason) {
			return validationError("delta (number) and reason are required");
		}
		variant.stock_quantity = Math.max(0, variant.stock_quantity + body.delta);
		variant.updated_at = new Date().toISOString();
		const v = bump(variant);
		db.movements.push({
			id: nextId("mov"),
			variant_id: variant.id,
			quantity: body.delta,
			reason: body.reason,
			reference: body.reference,
			timestamp: new Date().toISOString(),
		});
		audit(actor, "stock.adjust", "vault", "variant", variant.id, body);
		return ok({ ...variant, version: v });
	}),

	http.post("/api/vault/variants/:variantId/reserve", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const variant = db.variants.find((v) => v.id === params.variantId);
		if (!variant) return notFound("Variant");
		const conflictResp = checkVersion(request, variant.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ quantity: number }>(request);
		if (typeof body.quantity !== "number" || body.quantity <= 0) {
			return validationError("quantity must be a positive number");
		}
		const available = variant.stock_quantity - variant.reserved_quantity;
		if (body.quantity > available) {
			return apiError("CONFLICT", `Only ${available} unit(s) available to reserve`);
		}
		variant.reserved_quantity += body.quantity;
		const v = bump(variant);
		audit(actor, "stock.reserve", "vault", "variant", variant.id, { quantity: body.quantity });
		return created({ variant: { ...variant, version: v }, reservation_id: nextId("rsv") });
	}),

	http.post("/api/vault/variants/bulk-stock-adjust", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{
			adjustments: Array<{ variant_id: string; delta: number; expected_version: number }>;
			reason: string;
		}>(request);
		if (!Array.isArray(body.adjustments) || !body.reason) {
			return validationError("adjustments and reason are required");
		}
		const updated = [];
		for (const adj of body.adjustments) {
			const variant = db.variants.find((v) => v.id === adj.variant_id);
			if (!variant) return notFound("Variant");
			if (adj.expected_version !== variant.version) {
				return apiError("CONFLICT", `Version conflict on ${variant.sku}`);
			}
			variant.stock_quantity = Math.max(0, variant.stock_quantity + adj.delta);
			variant.updated_at = new Date().toISOString();
			const v = bump(variant);
			db.movements.push({
				id: nextId("mov"),
				variant_id: variant.id,
				quantity: adj.delta,
				reason: body.reason,
				timestamp: new Date().toISOString(),
			});
			updated.push({ ...variant, version: v });
		}
		audit(actor, "stock.bulk_adjust", "vault", "variant", undefined, { count: updated.length });
		return ok(updated);
	}),

	http.get("/api/vault/variants/:variantId/movements", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const rows = db.movements
			.filter((m) => m.variant_id === params.variantId)
			.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
		return bare(rows);
	}),

	http.get("/api/vault/alerts/low-stock", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const threshold = Number(new URL(request.url).searchParams.get("threshold") ?? 5);
		return bare(db.variants.filter((v) => v.stock_quantity <= threshold));
	}),

	// -------------------------------------------------------------- warehouses
	http.get("/api/vault/warehouses", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.warehouses);
	}),

	http.post("/api/vault/warehouses", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; location?: string }>(request);
		if (!body.name?.trim()) return validationError("Warehouse name is required");
		const warehouse = {
			id: nextId("whs"),
			name: body.name.trim(),
			location: body.location,
			created_at: new Date().toISOString(),
			version: 1,
		};
		db.warehouses.push(warehouse);
		audit(actor, "warehouse.create", "vault", "warehouse", warehouse.id, { name: warehouse.name });
		return created(warehouse);
	}),

	http.get("/api/vault/warehouses/:id", ({ request, params }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const warehouse = db.warehouses.find((w) => w.id === params.id);
		return warehouse ? ok(warehouse) : notFound("Warehouse");
	}),

	http.put("/api/vault/warehouses/:id", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const warehouse = db.warehouses.find((w) => w.id === params.id);
		if (!warehouse) return notFound("Warehouse");
		const conflictResp = checkVersion(request, warehouse.version);
		if (conflictResp) return conflictResp;
		const body = await jsonBody<{ name?: string; location?: string }>(request);
		if (body.name != null) warehouse.name = body.name;
		if (body.location !== undefined) warehouse.location = body.location ?? undefined;
		const v = bump(warehouse);
		return ok({ ...warehouse, version: v });
	}),

	http.delete("/api/vault/warehouses/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.warehouses.findIndex((w) => w.id === params.id);
		if (idx === -1) return notFound("Warehouse");
		db.warehouses.splice(idx, 1);
		audit(actor, "warehouse.delete", "vault", "warehouse", params.id as string);
		return noContent();
	}),

	// ----------------------------------------------------------------- shopify
	http.get("/api/vault/shopify/auth", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({ url: "/vault/dashboard?shopify=mock-oauth" });
	}),

	http.post("/api/vault/shopify/sync", ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const integration = db.shopify[0];
		if (integration) {
			integration.last_synced_at = new Date().toISOString();
			integration.product_count = db.products.length;
			db.shopifyLogs.unshift({
				id: nextId("slog"),
				sync_type: "manual_sync",
				status: "success",
				shopify_id: 7_000_000_000 + Math.floor(Math.random() * 99_999_999),
				created_at: new Date().toISOString(),
			});
		}
		audit(actor, "shopify.sync", "vault", "integration", "shopify");
		return noContent();
	}),

	http.get("/api/vault/shopify/integrations", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return bare(db.shopify);
	}),

	http.delete("/api/vault/shopify/disconnect", ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		for (const integration of db.shopify) integration.status = "disconnected";
		audit(actor, "shopify.disconnect", "vault", "integration", "shopify");
		return noContent();
	}),

	http.get("/api/vault/shopify/sync-logs", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return page(
			[...db.shopifyLogs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
			listParams(request, 25),
		);
	}),

	// ------------------------------------------------------------------ amazon
	http.get("/api/vault/amazon/status", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({ ...db.amazon });
	}),

	http.post("/api/vault/amazon/connect", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ marketplace_id: string; seller_id: string }>(request);
		if (!body.marketplace_id || !body.seller_id) {
			return validationError("marketplace_id and seller_id are required");
		}
		db.amazon = { connected: true, marketplace_id: body.marketplace_id, seller_id: body.seller_id, last_synced_at: hoursAgo(0) };
		audit(actor, "amazon.connect", "vault", "integration", "amazon");
		return noContent();
	}),

	http.post("/api/vault/amazon/disconnect", ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		db.amazon = { connected: false };
		audit(actor, "amazon.disconnect", "vault", "integration", "amazon");
		return noContent();
	}),

	http.post("/api/vault/amazon/sync", ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		db.amazon.last_synced_at = new Date().toISOString();
		audit(actor, "amazon.sync", "vault", "integration", "amazon");
		return noContent();
	}),
];
