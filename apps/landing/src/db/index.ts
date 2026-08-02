import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

let db: any;

// Only create client if URL is defined
if (process.env.TURSO_DATABASE_URL) {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  db = drizzle(client);
} else {
  // Return a mock db for build/development without DB
  console.warn("⚠️ TURSO_DATABASE_URL not set – using mock DB (no actual persistence)");
  db = {
    select: () => ({ from: () => ({ limit: () => Promise.resolve([]) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }),
  } as any;
}

export { db };
