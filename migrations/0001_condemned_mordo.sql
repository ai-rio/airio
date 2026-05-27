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
	`layer_mapping_complete` integer DEFAULT 0,
	`quality_score` integer,
	`quality_red_flags_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sheets_kind_check" CHECK("__new_sheets"."kind" IS NULL OR "__new_sheets"."kind" IN ('planta_forca', 'iluminacao', 'quadro', 'unifilar')),
	CONSTRAINT "sheets_ignored_check" CHECK("__new_sheets"."ignored" IN (0, 1))
);
--> statement-breakpoint
-- Hand-edit: drizzle-kit emitted `"ignored"` in the SELECT against the old `sheets`
-- table, which doesn't have that column yet — would fail at apply time.
-- Drop it from the column list; the new `__new_sheets.ignored` picks up DEFAULT 0
-- for existing rows. Per .claude/rules/dev-workflow.md §2 step 3 (hand-edit
-- destructive codegen).
INSERT INTO `__new_sheets`("id", "project_id", "filename", "page_index", "kind", "scale_denom", "scale_set", "layer_mapping_complete", "quality_score", "quality_red_flags_json", "created_at") SELECT "id", "project_id", "filename", "page_index", "kind", "scale_denom", "scale_set", "layer_mapping_complete", "quality_score", "quality_red_flags_json", "created_at" FROM `sheets`;--> statement-breakpoint
DROP TABLE `sheets`;--> statement-breakpoint
ALTER TABLE `__new_sheets` RENAME TO `sheets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sheets_project_idx` ON `sheets` (`project_id`);