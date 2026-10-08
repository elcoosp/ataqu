#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const H = join(ROOT, "crates/ataqu-api/src/handlers");

const APP_PREFIX = {
	aegis: "/api/aegis",
	cinq: "/api/cinq",
	dial: "/api/dial",
	pause: "/api/pause",
	pivot: "/api/pivot",
	sond: "/api/sond",
	spark: "/api/spark",
	tempo: "/api/tempo",
	vault: "/api/vault",
	vista: "/api/vista",
	migration: "/api/migration",
	gdpr: "/api/gdpr",
};

const norm = (p) =>
	p
		.split("?")[0]
		.replace(/\$\{[^}]*\}/g, "{}")
		.replace(/\{[^/}]*\}/g, "{}")
		.replace(/\{\}$/, "")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "") || "/";

// ---------- backend ----------
const backend = new Set();

function fnBodies(src) {
	const re = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(/g;
	const marks = [...src.matchAll(re)].map((m) => ({ name: m[1], at: m.index }));
	const out = {};
	marks.forEach((m, i) => {
		out[m.name] = src.slice(
			m.at,
			i + 1 < marks.length ? marks[i + 1].at : src.length,
		);
	});
	return out;
}

for (const f of readdirSync(H)) {
	if (!f.endsWith(".rs")) continue;
	const app = basename(f, ".rs");
	const prefix = APP_PREFIX[app];
	if (!prefix) continue;
	const bodies = fnBodies(readFileSync(join(H, f), "utf8"));
	// nested sub-routers: .nest("/x", some_fn())
	const nestedPrefix = {};
	for (const body of Object.values(bodies))
		for (const m of body.matchAll(/\.nest\(\s*"([^"]+)"\s*,\s*(\w+)\s*\(\)/g))
			nestedPrefix[m[2]] = m[1];
	for (const [name, body] of Object.entries(bodies)) {
		const isRoot = name === "routes" || name === "public_routes";
		if (!isRoot && !(name in nestedPrefix)) continue;
		const base = isRoot ? prefix : prefix + nestedPrefix[name];
		for (const m of body.matchAll(/\.route\(\s*"([^"]+)"/g))
			backend.add(norm(base + m[1]));
	}
}
// top-level routes in lib.rs
const lib = readFileSync(join(ROOT, "crates/ataqu-api/src/lib.rs"), "utf8");
for (const m of lib.matchAll(/\.route\(\s*"(\/[^"]+)"/g))
	backend.add(norm(m[1]));
// inbox is nested at /api/v1/inbox
const inbox = join(H, "inbox.rs");
if (existsSync(inbox))
	for (const m of readFileSync(inbox, "utf8").matchAll(
		/\.route\(\s*"([^"]+)"/g,
	))
		backend.add(norm("/api/v1/inbox" + m[1]));
// dial websocket lives under /ws (proxy) — ignore.

// ---------- frontend ----------
const SKIP =
	/node_modules|dist|\.gen\.|__tests__|\.test\.|\.spec\.|locales|\/mocks\//;
const files = [];
(function walk(d) {
	for (const n of readdirSync(d)) {
		const p = join(d, n);
		if (SKIP.test(p)) continue;
		if (statSync(p).isDirectory()) walk(p);
		else if (/\.(ts|tsx)$/.test(p)) files.push(p);
	}
})(join(ROOT, "apps/ataqu/src"));
(function walk(d) {
	for (const n of readdirSync(d)) {
		const p = join(d, n);
		if (SKIP.test(p)) continue;
		if (statSync(p).isDirectory()) walk(p);
		else if (/\.(ts|tsx)$/.test(p)) files.push(p);
	}
})(join(ROOT, "packages"));

const ALLOW = existsSync(join(ROOT, "scripts/api-contract.allow"))
	? new Set(
			readFileSync(join(ROOT, "scripts/api-contract.allow"), "utf8")
				.split("\n")
				.map((s) => s.trim())
				.filter((s) => s && !s.startsWith("#")),
		)
	: new Set();

const problems = [];
const callRe =
	/\bapi\.(get|post|put|patch|delete)\s*(?:<[^()]*?>)?\s*\(\s*([`"'])([^`"']*?)\2/gs;
const rawRe = /([`"'])(\/api\/[^`"'\s]*)\1/g;

for (const f of files) {
	const rel = f.replace(ROOT, "");
	let src = readFileSync(f, "utf8");
	// Resolve `const NAME = "/prefix"` template bases (e.g. `const SPARK = "/spark"`).
	for (const m of src.matchAll(
		/const\s+([A-Z][A-Z0-9_]*)\s*=\s*["'](\/[^"']*)["']/g,
	)) {
		src = src.split("${" + m[1] + "}").join(m[2]);
	}
	for (const m of src.matchAll(callRe)) {
		const p = m[3];
		if (p.startsWith("/api/")) {
			problems.push(`${rel}: double /api prefix -> ${p}`);
			continue;
		}
		const full = norm("/api" + p);
		if (!backend.has(full) && !ALLOW.has(full))
			problems.push(
				`${rel}: no backend route for ${m[1].toUpperCase()} ${full}`,
			);
	}
	if (!/packages\/api-client/.test(rel))
		for (const m of src.matchAll(rawRe)) {
			const full = norm(m[2]);
			if (!backend.has(full) && !ALLOW.has(full))
				problems.push(`${rel}: raw URL has no backend route -> ${full}`);
		}
}

const uniq = [...new Set(problems)].sort();
if (uniq.length) {
	console.error(
		`API contract: ${uniq.length} problem(s)\n` +
			uniq.map((p) => "  " + p).join("\n"),
	);
	process.exit(1);
}
console.log(`API contract OK (${backend.size} backend routes checked)`);
