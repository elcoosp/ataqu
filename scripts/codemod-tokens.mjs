#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "apps/ataqu/src";
const ON_COLOURED =
	/\b(bg-primary|bg-destructive|bg-success|bg-warning|bg-info|bg-amber|bg-green|bg-red|bg-blue)\b/;
const skipped = [];

function walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p);
		else if (/\.tsx$/.test(p) && !/\.test\./.test(p)) fix(p);
	}
}

function fix(path) {
	const src = readFileSync(path, "utf8");
	const out = src
		.split("\n")
		.map((line, i) => {
			if (/\btext-white\b/.test(line)) {
				if (ON_COLOURED.test(line)) {
					skipped.push(`${path}:${i + 1}: ${line.trim()}`);
					return line.replace(/\btext-white\b/g, "text-primary-foreground");
				}
				line = line.replace(/\btext-white\b/g, "text-foreground");
			}
			line = line.replace(/\bbg-white\b/g, "bg-card");
			return line;
		})
		.join("\n");
	if (out !== src) writeFileSync(path, out);
}

walk(ROOT);
console.log("Review these lines (text on coloured backgrounds):");
console.log(skipped.join("\n") || "(none)");
