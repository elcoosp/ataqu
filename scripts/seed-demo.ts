#!/usr/bin/env tsx
/**
 * Demo seed — goes through the HTTP API (never raw SQL) so outbox /
 * audit / idempotency paths are exercised. Idempotent: if the demo
 * user exists it logs in; list endpoints are checked before creating.
 *
 *   pnpm tsx scripts/seed-demo.ts
 *
 * Writes `apps/ataqu/e2e/.auth/demo.json` (git-ignored) and
 * `apps/ataqu/e2e/.auth/ids.json` for the screenshot sweep.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.API_BASE ?? "http://localhost:5173/api";
const EMAIL = "demo@ataqu.test";
const PASSWORD = "Demo-pass-123!";
let token = "";

async function call<T>(
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": crypto.randomUUID(),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok)
		throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
	return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

async function list<T>(path: string): Promise<T[]> {
	try {
		const r = await call<any>("GET", path);
		if (Array.isArray(r)) return r as T[];
		if (Array.isArray(r?.items)) return r.items as T[];
		return [];
	} catch {
		return [];
	}
}

async function ensure<T>(
	path: string,
	target: number,
	create: () => Promise<T>,
): Promise<void> {
	const cur = await list(path);
	if (cur.length >= target) {
		console.log(`  skip ${path} (${cur.length} >= ${target})`);
		return;
	}
	for (let i = cur.length; i < target; i++) {
		try {
			await create();
		} catch (e) {
			console.warn(
				`  warn ${path} #${i}: ${(e as Error).message.slice(0, 160)}`,
			);
			break;
		}
	}
}

const ids: Record<string, string> = {};
const first = { n: 0 };
const FRENCH_SMB = [
	["Camille Dupont", "Boulangerie Dupont"],
	["Yassine Benali", "Garage Benali"],
	["Sophie Martin", "Fleuriste Martin"],
	["Karim Haddad", "Boucherie Haddad"],
	["Léa Fontaine", "Librairie Fontaine"],
	["Mehdi Kaci", "Plomberie Kaci"],
	["Nadia Cherif", "Pharmacie Cherif"],
	["Hugo Moreau", "Café Moreau"],
	["Inès Diallo", "Salon Inès"],
	["Louis Petit", "Boulangerie Petit"],
] as const;

// ---------- auth ----------
try {
	await call("POST", "/aegis/signup", {
		email: EMAIL,
		password: PASSWORD,
		name: "Demo",
	});
	console.log("signed up demo user");
} catch (e) {
	console.log(`signup skipped: ${(e as Error).message.slice(0, 120)}`);
}
const login = await call<{ access_token: string }>("POST", "/aegis/login", {
	email: EMAIL,
	password: PASSWORD,
});
token = (login as any).access_token ?? (login as any).token;
if (!token) throw new Error("login did not return a token");
mkdirSync("apps/ataqu/e2e/.auth", { recursive: true });
writeFileSync(
	"apps/ataqu/e2e/.auth/demo.json",
	JSON.stringify({ email: EMAIL, password: PASSWORD }),
);
console.log("logged in as demo");

// ---------- CINQ ----------
const contacts = await list<any>("/cinq/contacts?limit=100");
if (contacts.length < 25) {
	for (let i = contacts.length; i < 25; i++) {
		const [name, company] = FRENCH_SMB[i % FRENCH_SMB.length];
		const n = Math.floor(i / FRENCH_SMB.length);
		try {
			const c = await call<any>("POST", "/cinq/contacts", {
				name: n ? `${name} ${n + 1}` : name,
				company,
				email: `contact${i}@example.test`,
			});
			if (c?.id && !ids.contact) ids.contact = c.id;
		} catch (e) {
			console.warn(
				`  warn contact #${i}: ${(e as Error).message.slice(0, 120)}`,
			);
			break;
		}
	}
}
const stages = await list<any>("/cinq/pipeline/stages");
const stageNames = [
	"Prospection",
	"Qualifié",
	"Proposition",
	"Négociation",
	"Gagné",
	"Perdu",
];
for (const [i, name] of stageNames.entries()) {
	if (!stages.some((s: any) => s.name === name)) {
		try {
			await call("POST", "/cinq/pipeline/stages", { name, order: i });
		} catch (e) {
			console.warn(
				`  warn stage ${name}: ${(e as Error).message.slice(0, 120)}`,
			);
		}
	}
}
const freshStages = await list<any>("/cinq/pipeline/stages");
const allContacts = await list<any>("/cinq/contacts?limit=100");
const deals = await list<any>("/cinq/deals?limit=100");
if (deals.length < 12 && allContacts.length && freshStages.length) {
	for (let i = deals.length; i < 12; i++) {
		const stage = freshStages[i % freshStages.length];
		try {
			const d = await call<any>("POST", "/cinq/deals", {
				title: `Deal ${FRENCH_SMB[i % FRENCH_SMB.length][1]} #${i + 1}`,
				contact_id: allContacts[i % allContacts.length].id,
				pipeline_stage_id: stage.id,
				amount: 1000 * (i + 1),
				status: i >= 10 ? "won" : "open",
			});
			if (d?.id && !ids.deal) ids.deal = d.id;
		} catch (e) {
			console.warn(`  warn deal #${i}: ${(e as Error).message.slice(0, 120)}`);
			break;
		}
	}
}
await ensure("/cinq/tasks?limit=100", 10, async () => {
	await call("POST", "/cinq/tasks", { title: `Tâche de suivi #${++first.n}` });
});
await ensure("/cinq/activities?limit=100", 8, async () => {
	if (!allContacts.length) throw new Error("no contacts");
	await call("POST", "/cinq/activities", {
		contact_id: allContacts[0].id,
		activity_type: "note",
		description: "Appel de découverte",
	});
});

// ---------- DIAL ----------
const channels = await list<any>("/dial/channels?limit=50");
const channelNames = ["général", "ventes", "support", "produit"];
for (const name of channelNames) {
	if (!channels.some((c: any) => c.name === name)) {
		try {
			await call("POST", "/dial/channels", { name, channel_type: "public" });
		} catch (e) {
			console.warn(
				`  warn channel ${name}: ${(e as Error).message.slice(0, 120)}`,
			);
		}
	}
}
const freshChannels = await list<any>("/dial/channels?limit=50");
if (freshChannels.length && !ids.channel) ids.channel = freshChannels[0].id;
for (const ch of freshChannels.slice(0, 4)) {
	const msgs = await list<any>(`/dial/channels/${ch.id}/messages?limit=50`);
	if (msgs.length < 5) {
		for (let i = msgs.length; i < 5; i++) {
			try {
				await call("POST", `/dial/channels/${ch.id}/messages`, {
					content: `Message de démonstration ${i + 1} — bonjour l'équipe !`,
				});
			} catch (e) {
				console.warn(`  warn msg: ${(e as Error).message.slice(0, 120)}`);
				break;
			}
		}
	}
}

// ---------- PIVOT ----------
await ensure("/pivot/documents?limit=50", 3, async () => {
	const d = await call<any>("POST", "/pivot/documents", {
		title: `Guide d'accueil ${++first.n}`,
		content: "# Bienvenue\n\nContenu de démonstration.",
	});
	if (d?.id && !ids.doc) ids.doc = d.id;
});
const dbs = await list<any>("/pivot/databases?limit=20");
if (!dbs.length) {
	try {
		const db = await call<any>("POST", "/pivot/databases", {
			name: "Suivi clients",
		});
		if (db?.id) {
			ids.db = db.id;
			for (let i = 0; i < 8; i++) {
				try {
					await call("POST", `/pivot/databases/${db.id}/rows`, {
						values: { nom: `Client ${i + 1}`, statut: "actif" },
					});
				} catch {
					break;
				}
			}
		}
	} catch (e) {
		console.warn(`  warn pivot db: ${(e as Error).message.slice(0, 120)}`);
	}
} else if (!ids.db) ids.db = dbs[0].id;

// ---------- SPARK ----------
await ensure("/spark/workflows?limit=20", 2, async () => {
	const w = await call<any>("POST", "/spark/workflows", {
		name: `Relance devis ${++first.n}`,
		trigger: { type: "event", event_type: "deal.won" },
		actions: [
			{
				type: "send_email",
				to: "equipe@example.test",
				subject: "Deal gagné",
				body: "Bravo !",
			},
		],
	});
	if (w?.id && !ids.workflow) ids.workflow = w.id;
});

// ---------- TEMPO ----------
const eventTypes = await list<any>("/tempo/event-types?limit=20");
for (const [name, slug] of [
	["Consultation 30 min", "consult-30"],
	["Démo produit", "demo-produit"],
] as const) {
	if (!eventTypes.some((e: any) => e.slug === slug)) {
		try {
			const et = await call<any>("POST", "/tempo/event-types", {
				name,
				slug,
				duration_minutes: 30,
			});
			if (et?.id && !ids.eventType) ids.eventType = et.id;
		} catch (e) {
			console.warn(
				`  warn event-type ${slug}: ${(e as Error).message.slice(0, 120)}`,
			);
		}
	}
}
const freshET = await list<any>("/tempo/event-types?limit=20");
if (freshET.length && !ids.eventType) ids.eventType = freshET[0].id;
await ensure("/tempo/bookings?limit=50", 5, async () => {
	if (!freshET.length) throw new Error("no event types");
	await call("POST", "/tempo/bookings", {
		event_type_id: freshET[0].id,
		starts_at: new Date(Date.now() + 86400000 * (1 + first.n)).toISOString(),
		duration_minutes: 30,
	});
});

// ---------- SOND ----------
const forms = await list<any>("/sond/forms?limit=20");
for (let i = forms.length; i < 2; i++) {
	try {
		const f = await call<any>("POST", "/sond/forms", {
			title: `Enquête satisfaction ${i + 1}`,
			description: "Donnez votre avis",
			questions: [
				{
					label: "Comment évaluez-vous notre service ?",
					type: "rating",
					required: true,
				},
				{ label: "Un commentaire ?", type: "text", required: false },
			],
			mode: "standard",
		});
		if (f?.id) {
			if (!ids.form) ids.form = f.id;
			try {
				await call("PUT", `/sond/forms/${f.id}`, { status: "published" });
			} catch {
				/* version header may be required; try with If-Match below */
			}
			// retry publish with version
			try {
				const full = await call<any>("GET", `/sond/forms/${f.id}`);
				await fetch(`${BASE}/sond/forms/${f.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						"If-Match": String(full.version ?? 1),
					},
					body: JSON.stringify({ status: "published" }),
				});
			} catch {
				/* leave as draft */
			}
		}
	} catch (e) {
		console.warn(`  warn form #${i}: ${(e as Error).message.slice(0, 120)}`);
		break;
	}
}

// ---------- VAULT ----------
const warehouses = await list<any>("/vault/warehouses");
for (const [name, location] of [
	["Entrepôt Paris", "Paris"],
	["Entrepôt Lyon", "Lyon"],
	["Entrepôt Lille", "Lille"],
] as const) {
	if (!warehouses.some((w: any) => w.name === name)) {
		try {
			await call("POST", "/vault/warehouses", { name, location });
		} catch (e) {
			console.warn(`  warn warehouse: ${(e as Error).message.slice(0, 120)}`);
		}
	}
}
const products = await list<any>("/vault/products?limit=50");
if (products.length < 12) {
	for (let i = products.length; i < 12; i++) {
		try {
			const p = await call<any>("POST", "/vault/products", {
				name: `Produit démo ${i + 1}`,
				description: "Article de démonstration",
				sku: `DEMO-${String(i + 1).padStart(3, "0")}`,
			});
			if (p?.id) {
				if (!ids.product) ids.product = p.id;
				try {
					await call("POST", "/vault/variants", {
						product_id: p.id,
						sku: `DEMO-${String(i + 1).padStart(3, "0")}-STD`,
						initial_stock: i === 0 ? 1 : 50,
						price: 1999 + i * 100,
					});
				} catch {
					/* variant endpoint may differ */
				}
			}
		} catch (e) {
			console.warn(
				`  warn product #${i}: ${(e as Error).message.slice(0, 120)}`,
			);
			break;
		}
	}
}

// ---------- PAUSE ----------
const employees = await list<any>("/pause/employees?limit=50");
if (employees.length < 10) {
	const names = [
		"Alice Bernard",
		"Bruno Girard",
		"Chloé Roux",
		"David Lambert",
		"Emma Faure",
		"Farid Mansouri",
		"Gabrielle Perrot",
		"Hassan Traoré",
		"Iris Colin",
		"Julien Aubert",
	];
	for (let i = employees.length; i < 10; i++) {
		try {
			const e = await call<any>("POST", "/pause/employees", {
				full_name: names[i % names.length],
				email: `employe${i}@example.test`,
				job_title: "Commercial",
				hire_date: "2024-01-15",
			});
			if (e?.id && !ids.employee) ids.employee = e.id;
		} catch (err) {
			console.warn(
				`  warn employee #${i}: ${(err as Error).message.slice(0, 120)}`,
			);
			break;
		}
	}
}
const allEmployees = await list<any>("/pause/employees?limit=50");
await ensure("/pause/leave-requests?limit=50", 6, async () => {
	if (!allEmployees.length) throw new Error("no employees");
	await call("POST", "/pause/leave-requests", {
		employee_id: allEmployees[0].id,
		leave_type: "annual",
		start_date: "2026-08-03",
		end_date: "2026-08-07",
	});
});

// ---------- VISTA ----------
await ensure("/vista/dashboards?limit=20", 2, async () => {
	const d = await call<any>("POST", "/vista/dashboards", {
		name: `Tableau commercial ${++first.n}`,
		config: { widgets: [] },
	});
	if (d?.id && !ids.dashboard) ids.dashboard = d.id;
});

writeFileSync("apps/ataqu/e2e/.auth/ids.json", JSON.stringify(ids, null, 2));
console.log("\nSeed summary:");
console.log(JSON.stringify({ ids, counts: "see API" }, null, 2));
console.log("Wrote apps/ataqu/e2e/.auth/ids.json");
