import { expect, test } from "@playwright/test";

test("shell loads with sidebar and header", async ({ page }) => {
	await page.goto("/");
	// Wait for the shell to render
	await expect(page.locator("aside")).toBeVisible();
	await expect(page.locator("header")).toBeVisible();
	// Check for app links
	await expect(page.locator('a[href*="crm.ataqu.com"]')).toBeVisible();
	await expect(page.locator('a[href*="chat.ataqu.com"]')).toBeVisible();
});
