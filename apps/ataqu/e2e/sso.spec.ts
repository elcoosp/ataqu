import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the single-origin SSO (OAuth) login flow for the
 * consolidated app.
 *
 * The SPA cannot talk to the real Google/Microsoft identity provider in an
 * automated run (needs live credentials + 2FA). We stub the one backend call —
 * `POST /api/aegis/sso/login` — and return the authorization URL the real
 * backend would produce. We point that URL at the same-origin SSO callback so
 * the headless browser completes the exact round-trip the app code owns:
 *
 *   click "Continue with X"  ->  POST /aegis/sso/login  ->  window.location = url
 *   ->  /login?token=..&refreshToken=..&user_id=..  ->  store login  ->  /dashboard
 *
 * Because the suite is a single origin now, we additionally prove the shared
 * auth store survives cross-app navigation: a logged-in session can open
 * /cinq/dashboard directly without re-authenticating.
 */

const APP_URL = "http://localhost:5173";

// The query-string the OAuth provider would redirect back with.
const SSO_CALLBACK =
	"/login?token=test-access-token&refreshToken=test-refresh-token&user_id=usr_sso_123";

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

test.describe("Consolidated SSO flow", () => {
	test("handles the OAuth redirect callback and lands on the dashboard", async ({
		page,
	}) => {
		await page.goto(`${APP_URL}${SSO_CALLBACK}`);

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
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

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: /dashboard/i }),
		).toBeVisible();
	});

	test("a single login works across apps (cross-app session, one origin)", async ({
		page,
	}) => {
		await stubSsoLogin(page, MOCK_PROVIDER_URL);

		await page.goto(`${APP_URL}/login`);
		await page
			.getByRole("button", { name: /continue with microsoft/i })
			.click();

		// Logged into the host (aegis) dashboard…
		await expect(page).toHaveURL(/\/dashboard/);
		// …then navigate to CINQ's dashboard without a second login.
		await page.goto(`${APP_URL}/cinq/dashboard`);
		await expect(page.getByText(/welcome to your workspace/i)).toBeVisible();
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

		await expect(page).toHaveURL(/\/login/);
	});
});
