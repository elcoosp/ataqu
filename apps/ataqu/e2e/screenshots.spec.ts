import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Two modes (see apps/ataqu/src/mocks — deterministic seed):
 * - live backend: run `pnpm tsx scripts/seed-demo.ts` first (writes .auth/demo.json + ids.json);
 * - mock mode (default): dev server serves the MSW seed; login is demo@ataqu.com/demo1234
 *   and dynamic-route ids are the deterministic mock ids below.
 */
const auth = existsSync("apps/ataqu/e2e/.auth/demo.json")
	? JSON.parse(readFileSync("apps/ataqu/e2e/.auth/demo.json", "utf8"))
	: { email: "demo@ataqu.com", password: "demo1234" };
const MOCK_IDS: Record<string, string> = {
	contact: "cnt-001",
	deal: "dl-001",
	channel: "chn-001",
	doc: "doc-001",
	db: "pdb-001",
	form: "frm-001",
	workflow: "wf-001",
	product: "prd-001",
	employee: "usr-002",
	dashboard: "dsh-001",
	eventType: "evt-001",
};
const ids: Record<string, string> = existsSync("apps/ataqu/e2e/.auth/ids.json")
	? JSON.parse(readFileSync("apps/ataqu/e2e/.auth/ids.json", "utf8"))
	: MOCK_IDS;

const STATIC_ROUTES = [
	"/dashboard",
	"/inbox",
	"/settings",
	"/users",
	"/roles",
	"/api-keys",
	"/admin/access-matrix",
	"/admin/approvals",
	"/admin/audit",
	"/admin/migration",
	"/admin/team-status",
	"/cinq/dashboard",
	"/cinq/contacts",
	"/cinq/deals",
	"/cinq/tasks",
	"/cinq/establishments",
	"/cinq/import",
	"/dial",
	"/dial/dashboard",
	"/dial/tickets",
	"/pause/dashboard",
	"/pause/directory",
	"/pause/leave",
	"/pause/onboarding",
	"/pause/reports",
	"/pivot",
	"/pivot/dashboard",
	"/pivot/db",
	"/pivot/templates",
	"/sond",
	"/spark",
	"/spark/dashboard",
	"/spark/runs",
	"/spark/dlq",
	"/tempo/dashboard",
	"/tempo/availability",
	"/tempo/calendar-settings",
	"/vault/dashboard",
	"/vault/products",
	"/vault/movements",
	"/vault/reservations",
	"/vault/warehouses",
	"/vista",
	"/vista/dashboard",
	"/vista/explore",
	"/vista/health",
];
const DYNAMIC: Array<[string, string]> = [
	["contact", "/cinq/contacts/{id}"],
	["deal", "/cinq/deals/{id}"],
	["channel", "/dial/channels/{id}"],
	["doc", "/pivot/doc/{id}"],
	["db", "/pivot/db/{id}"],
	["form", "/sond/builder/{id}"],
	["workflow", "/spark/workflows/{id}"],
	["product", "/vault/products/{id}"],
	["employee", "/pause/employees/{id}"],
	["dashboard", "/vista/dashboard/{id}"],
	["eventType", "/tempo/event-types/{id}"],
];
const routes = [
	...STATIC_ROUTES,
	...DYNAMIC.filter(([k]) => ids[k]).map(([k, p]) => p.replace("{id}", ids[k])),
];

test.skip(!auth, "no auth available");

for (const theme of ["dark", "light"] as const) {
	test.describe(`sweep (${theme})`, () => {
		test.use({ viewport: { width: 1440, height: 900 } });

		test.beforeEach(async ({ page }) => {
			await page.addInitScript(
				(t) => localStorage.setItem("ataqu-theme", t),
				theme,
			);
			await page.goto("/login");
			await page.getByLabel(/email/i).fill(auth.email);
			await page.getByLabel(/password/i).fill(auth.password);
			await page.getByRole("button", { name: /sign in|log in|login/i }).click();
			await page.waitForURL(/\/dashboard/);
		});

		for (const route of routes) {
			test(`${route}`, async ({ page }) => {
				const errors: string[] = [];
				page.on("console", (m) => {
					if (m.type() === "error") errors.push(m.text());
				});
				page.on("pageerror", (e) => errors.push(String(e)));
				page.on("response", (r) => {
					if (r.url().includes("/api/") && r.status() >= 400)
						errors.push(
							`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`,
						);
				});

				await page.goto(route);
				await page.waitForLoadState("networkidle");

				await expect(
					page.getByText(
						/something went wrong|error loading|this page does not exist/i,
					),
				).toHaveCount(0);
				expect(errors, errors.join("\n")).toEqual([]);

				const slug = route.replace(/^\//, "").replace(/\//g, "__") || "root";
				mkdirSync(`screenshots/${theme}`, { recursive: true });
				await page.screenshot({ path: `screenshots/${theme}/${slug}.png` });
			});
		}
	});
}
