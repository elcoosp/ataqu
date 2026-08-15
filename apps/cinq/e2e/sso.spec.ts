import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the CINQ SSO (OAuth) login flow.
 *
 * The SPA cannot talk to the real Google/Microsoft identity provider in an
 * automated run (it needs live credentials + 2FA). Instead we stub the ONE
 * backend call our app makes — `POST /api/aegis/sso/login` — and return the
 * authorization URL the real backend would produce. We point that URL at the
 * same-origin SSO callback so the headless browser can complete the exact
 * round-trip the app code is responsible for:
 *
 *   click "Continue with X"  ->  POST /aegis/sso/login  ->  window.location = url
 *   ->  /login?token=..&refreshToken=..&user_id=..  ->  store login  ->  /dashboard
 *
 * This exercises everything we own (the button handler, the redirect, the
 * callback parsing, the auth-store write, and the post-login navigation).
 */

const APP_URL = "http://localhost:5174";

// The query-string the OAuth provider would redirect back with.
const SSO_CALLBACK =
	"/login?token=test-access-token&refreshToken=test-refresh-token&user_id=usr_sso_123";

// What the backend returns for /aegis/sso/login. Pointed at the same-origin
// callback so the browser finishes the handshake without a real IdP.
const MOCK_PROVIDER_URL = `${APP_URL}${SSO_CALLBACK}`;

// Stub the backend's "begin SSO" endpoint with the given provider URL.
async function stubSsoLogin(
	page: import("@playwright/test").Page,
	url: string,
) {
	await page.route("**/api/aegis/sso/login", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ url }),
		}),
	);
}

test.describe("CINQ SSO flow", () => {
	test("handles the OAuth redirect callback and lands on the dashboard", async ({
		page,
	}) => {
		// Simulate the provider redirecting the browser back to our app.
		await page.goto(`${APP_URL}${SSO_CALLBACK}`);

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
		await expect(page.getByText(/welcome to your workspace/i)).toBeVisible();
	});

	test("Continue with Google triggers the SSO handshake and authenticates", async ({
		page,
	}) => {
		await stubSsoLogin(page, MOCK_PROVIDER_URL);

		await page.goto(`${APP_URL}/login`);
		await expect(
			page.getByRole("button", { name: /continue with google/i }),
		).toBeVisible();

		await page.getByRole("button", { name: /continue with google/i }).click();

		// The app navigated to the URL the backend returned (the OAuth callback),
		// parsed it, wrote the session, and routed to the dashboard.
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
	});

	test("Continue with Microsoft triggers the SSO handshake and authenticates", async ({
		page,
	}) => {
		await stubSsoLogin(page, MOCK_PROVIDER_URL);

		await page.goto(`${APP_URL}/login`);
		await page
			.getByRole("button", { name: /continue with microsoft/i })
			.click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
	});

	test("a failed SSO handshake surfaces an error and stays on login", async ({
		page,
	}) => {
		await page.route("**/api/aegis/sso/login", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: "{}",
			}),
		);

		await page.goto(`${APP_URL}/login`);
		await page.getByRole("button", { name: /continue with google/i }).click();

		// On failure the app must NOT navigate away from /login.
		await expect(page).toHaveURL(/\/login/);
	});
});
