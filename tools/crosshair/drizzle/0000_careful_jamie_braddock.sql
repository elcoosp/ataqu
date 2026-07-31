CREATE TABLE `action_items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text,
	`related_cluster_id` text,
	`target_app` text NOT NULL,
	`author` text,
	`source_url` text,
	`raw_quote` text,
	`personalized_message` text,
	`feature_title` text,
	`feature_description` text,
	`effort_estimate` text,
	`status` text DEFAULT 'pending',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`related_cluster_id`) REFERENCES `clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mapped_app` text NOT NULL,
	`core_pain` text NOT NULL,
	`evidence_count` integer DEFAULT 0,
	`best_quotes` text,
	`common_workarounds` text,
	`competitors_mentioned` text,
	`volume_score` real,
	`severity_score` real,
	`urgency_score` real,
	`workaround_ugliness` real,
	`buyer_intent_score` real,
	`gap_vs_existing` real,
	`monetization_score` real,
	`build_feasibility` real,
	`total_opportunity_score` real,
	`verdict` text DEFAULT 'needs_research',
	`manual_mvp_idea` text,
	`landing_page_angle` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mapped_app` text NOT NULL,
	`last_scraped_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competitors_name_unique` ON `competitors` (`name`);--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_id` text NOT NULL,
	`buyer_segment` text,
	`workflow` text,
	`current_workaround` text,
	`direct_quote` text,
	`root_cause` text,
	`competitor` text,
	`feature_gap` text,
	`pricing_complaint` text,
	`ux_friction` text,
	`urgency` real,
	`buying_intent` real,
	`frequency` real,
	`overall_lead_score` real,
	`feature_impact` real,
	`human_reviewed` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`signal_id`) REFERENCES `raw_signals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text,
	`source_url` text,
	`thread_id` text,
	`thread_context` text,
	`author` text,
	`raw_text` text NOT NULL,
	`competitor_id` text,
	`mapped_app` text,
	`status` text DEFAULT 'new',
	`analyzed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_signals_source_url_unique` ON `raw_signals` (`source_url`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `raw_signals` (`status`);--> statement-breakpoint
CREATE INDEX `competitor_idx` ON `raw_signals` (`competitor_id`);--> statement-breakpoint
CREATE INDEX `thread_idx` ON `raw_signals` (`thread_id`);