import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  apps: text("apps").notNull(),
  name: text("name"),
  role: text("role"),
  companySize: text("company_size"),
  createdAt: text("created_at").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
});
