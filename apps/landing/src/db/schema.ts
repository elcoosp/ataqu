import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  apps: text("apps").notNull(), // comma-separated list
  name: text("name"),
  role: text("role"),
  companySize: text("company_size"),
  createdAt: text("created_at").notNull(),
});
