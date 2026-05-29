CREATE TABLE `layer_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`layer_name` text NOT NULL,
	`kind` text,
	`source` text NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "layer_mappings_kind_check" CHECK("layer_mappings"."kind" IS NULL OR "layer_mappings"."kind" IN ('eletrocalha', 'perfilado', 'leito', 'barramento', 'eletroduto')),
	CONSTRAINT "layer_mappings_source_check" CHECK("layer_mappings"."source" IN ('cross_project', 'glossary', 'intel'))
);
--> statement-breakpoint
CREATE INDEX `layer_mappings_project_idx` ON `layer_mappings` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `layer_mappings_project_layer_uidx` ON `layer_mappings` (`project_id`,`layer_name`);--> statement-breakpoint
CREATE TABLE `layer_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`layer_mapping_id` text NOT NULL,
	`sheet_id` text NOT NULL,
	`element_count` integer DEFAULT 0 NOT NULL,
	`color_rgb` text,
	`has_lines` integer,
	`has_curves` integer,
	`observed_at` integer NOT NULL,
	FOREIGN KEY (`layer_mapping_id`) REFERENCES `layer_mappings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sheet_id`) REFERENCES `sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "layer_occurrences_has_lines_check" CHECK("layer_occurrences"."has_lines" IS NULL OR "layer_occurrences"."has_lines" IN (0, 1)),
	CONSTRAINT "layer_occurrences_has_curves_check" CHECK("layer_occurrences"."has_curves" IS NULL OR "layer_occurrences"."has_curves" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `layer_occurrences_mapping_sheet_uidx` ON `layer_occurrences` (`layer_mapping_id`,`sheet_id`);--> statement-breakpoint
ALTER TABLE `sheets` ADD `layers_json` text;