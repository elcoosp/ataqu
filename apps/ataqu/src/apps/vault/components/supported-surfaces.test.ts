import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
	readFileSync(
		`${process.cwd()}/apps/ataqu/src/apps/vault/components/${file}.tsx`,
		"utf8",
	);
describe("Vault supported surfaces", () => {
	it("links both catalog views to the Vault product route", () => {
		expect(source("product-catalog")).not.toContain("href={`/products/");
		expect(source("product-catalog")).toContain("/vault/products/$id");
	});
	it("uses server catalog search instead of filtering a truncated page", () => {
		expect(source("product-catalog")).toContain("searchProducts(");
		expect(source("product-catalog")).not.toContain("products.filter(");
	});
	it("reads low stock rather than promising unsupported notification configuration", () => {
		expect(source("low-stock-alert-form")).toContain("useGetLowStockAlerts(");
		expect(source("low-stock-alert-form")).not.toContain("api.patch");
	});
	it("shows persisted reserved quantities instead of a local reservation ledger", () => {
		expect(source("reservation-list")).not.toContain("LocalReservation");
		expect(source("reservation-list")).toContain("reserved_quantity");
	});
});
