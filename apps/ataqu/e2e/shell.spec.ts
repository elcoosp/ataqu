import { expect, test } from "@playwright/test";

test("shell loads with sidebar and header", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("aside")).toBeVisible();
	await expect(page.locator("header")).toBeVisible();
	// Sidebar links are in-app routes in the consolidated single-origin shell.
	await expect(page.locator('a[href="/cinq/contacts"]')).toBeVisible();
	await expect(page.locator('a[href="/dial"]')).toBeVisible();
	await expect(page.locator('a[href="/vista"]')).toBeVisible();
});
