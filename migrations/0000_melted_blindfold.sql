CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`ts` integer NOT NULL,
	`user` text,
	`action` text NOT NULL,
	`target_table` text,
	`target_id` text,
	`r2_key_before` text,
	`r2_key_after` text,
	`correlation_id` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_log_session_ts_idx` ON `audit_log` (`session_id`,`ts`);--> statement-breakpoint
CREATE INDEX `audit_log_project_idx` ON `audit_log` (`project_id`);--> statement-breakpoint
CREATE TABLE `global_glyph_dict` (
	`glyph_signature` text NOT NULL,
	`kind` text NOT NULL,
	`confirmed_count` integer DEFAULT 0,
	`last_confirmed_at` integer NOT NULL,
	PRIMARY KEY(`glyph_signature`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `global_layer_dict` (
	`layer_name` text NOT NULL,
	`kind` text NOT NULL,
	`confirmed_count` integer DEFAULT 0,
	`last_confirmed_at` integer NOT NULL,
	PRIMARY KEY(`layer_name`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`current_phase` integer,
	`status` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "projects_status_check" CHECK("projects"."status" IS NULL OR "projects"."status" IN ('EFETUANDO', 'LIBERADA'))
);
--> statement-breakpoint
CREATE TABLE `sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`filename` text,
	`page_index` integer,
	`kind` text,
	`scale_denom` integer,
	`scale_set` integer DEFAULT 0,
	`layer_mapping_complete` integer DEFAULT 0,
	`quality_score` integer,
	`quality_red_flags_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sheets_kind_check" CHECK("sheets"."kind" IS NULL OR "sheets"."kind" IN ('planta_forca', 'iluminacao', 'quadro', 'unifilar'))
);
--> statement-breakpoint
CREATE INDEX `sheets_project_idx` ON `sheets` (`project_id`);