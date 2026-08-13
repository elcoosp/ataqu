import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

let db: any;

// Use local SQLite file if TURSO_DATABASE_URL is not set
if (process.env.TURSO_DATABASE_URL) {
	const client = createClient({
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});
	db = drizzle(client);
} else {
	// Use absolute path to data.db in the current working directory
	const dbPath = path.join(process.cwd(), "data.db");
	console.warn(
		`⚠️ TURSO_DATABASE_URL not set – using local SQLite at ${dbPath}`,
	);
	const client = createClient({
		url: `file:${dbPath}`,
	});
	db = drizzle(client);
}

export { db };
