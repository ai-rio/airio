PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`filename` text,
	`page_index` integer,
	`kind` text,
	`ignored` integer DEFAULT 0,
	`scale_denom` integer,
	`scale_set` integer DEFAULT 0,
	`scale_source` text,
	`layer_mapping_complete` integer DEFAULT 0,
	`quality_score` integer,
	`quality_red_flags_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sheets_kind_check" CHECK("__new_sheets"."kind" IS NULL OR "__new_sheets"."kind" IN ('planta_forca', 'iluminacao', 'quadro', 'unifilar')),
	CONSTRAINT "sheets_ignored_check" CHECK("__new_sheets"."ignored" IN (0, 1)),
	CONSTRAINT "sheets_scale_source_check" CHECK("__new_sheets"."scale_source" IS NULL OR "__new_sheets"."scale_source" IN ('titleblock_text', 'manual'))
);
--> statement-breakpoint
INSERT INTO `__new_sheets`("id", "project_id", "filename", "page_index", "kind", "ignored", "scale_denom", "scale_set", "scale_source", "layer_mapping_complete", "quality_score", "quality_red_flags_json", "created_at") SELECT "id", "project_id", "filename", "page_index", "kind", "ignored", "scale_denom", "scale_set", NULL, "layer_mapping_complete", "quality_score", "quality_red_flags_json", "created_at" FROM `sheets`;--> statement-breakpoint
DROP TABLE `sheets`;--> statement-breakpoint
ALTER TABLE `__new_sheets` RENAME TO `sheets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sheets_project_idx` ON `sheets` (`project_id`);