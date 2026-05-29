// airio D1 schema — Drizzle source of truth.
//
// Tables present per phase:
//   Phase 0-5: projects, sheets, audit_log, global_layer_dict, global_glyph_dict
//   Phase 8 (S6 Camadas): layer_mappings, layer_occurrences + sheets.layers_json
//
// Other tables (glyph_overrides, quadros, quadro_rows, bom_rows,
// omissos, glyph_tags) defer to their wire phase — one migration
// per phase keeps diffs reviewable.
//
// Editing rule: this file is the single source of truth. Direct edits to
// migrations/*.sql (except ALTER fixups for column renames) banned. After editing
// here, run `bunx drizzle-kit generate` and commit the schema change + migration
// together.

import { sqliteTable, text, integer, index, uniqueIndex, primaryKey, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// projects — top-level container for a takeoff. S1 Cadastro creates rows here.
// ---------------------------------------------------------------------------
export const projects = sqliteTable(
	'projects',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		currentPhase: integer('current_phase'),
		status: text('status', { enum: ['EFETUANDO', 'LIBERADA'] }),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull(),
	},
	(t) => [
		// SQLite without CHECK = enum strings unenforced at DB level. Drizzle's TS enum
		// is type-only; CHECK must be declared explicitly. Per database-administrator
		// recommendation in backend-persistence-plan.md "Hardening locked in Phase 1".
		check(
			'projects_status_check',
			sql`${t.status} IS NULL OR ${t.status} IN ('EFETUANDO', 'LIBERADA')`,
		),
	],
);

// ---------------------------------------------------------------------------
// sheets — one row per PDF page Carlos uploads (S2 Documentos) and tags
// (S3 Triagem). `kind` is the Triagem classification.
// ---------------------------------------------------------------------------
export const sheets = sqliteTable(
	'sheets',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').notNull().references(() => projects.id),
		filename: text('filename'),
		pageIndex: integer('page_index'),
		kind: text('kind', {
			enum: ['planta_forca', 'iluminacao', 'quadro', 'unifilar'],
		}),
		// S3 Triagem: soft-ignore. 1 = excluded from all downstream phases
		// (S4 scale, S6 layers, S7 quadro, S9 count). Soft so audit_log + R2 PDF
		// stay recoverable; Carlos can untoggle. Hard-delete would lose the trail.
		ignored: integer('ignored').default(0),
		scaleDenom: integer('scale_denom'),
		scaleSet: integer('scale_set').default(0),
		scaleSource: text('scale_source', { enum: ['titleblock_text', 'manual'] }),
		layerMappingComplete: integer('layer_mapping_complete').default(0),
		qualityScore: integer('quality_score'),
		qualityRedFlagsJson: text('quality_red_flags_json'),
		// S6: cached raw response from container /extract/layers (full 99-layer inventory).
		// Stored as JSON text to avoid 6.3s container cold-start on every S6 page visit.
		// Invalidated when sheet is re-uploaded. Backend-developer adds loadSheetsForPhase()
		// helper in src/lib/projects.ts to project around BLOB on hot reads (Wave 2).
		layersJson: text('layers_json'),
		createdAt: integer('created_at').notNull(),
	},
	(t) => [
		index('sheets_project_idx').on(t.projectId),
		check(
			'sheets_kind_check',
			sql`${t.kind} IS NULL OR ${t.kind} IN ('planta_forca', 'iluminacao', 'quadro', 'unifilar')`,
		),
		check('sheets_ignored_check', sql`${t.ignored} IN (0, 1)`),
		check(
			'sheets_scale_source_check',
			sql`${t.scaleSource} IS NULL OR ${t.scaleSource} IN ('titleblock_text', 'manual')`,
		),
	],
);

// ---------------------------------------------------------------------------
// audit_log — append-only HITL trust evidence. Every write to project state
// emits a row here + an R2 blob carrying the before/after JSON.
// ---------------------------------------------------------------------------
export const auditLog = sqliteTable(
	'audit_log',
	{
		id: text('id').primaryKey(),
		sessionId: text('session_id').notNull(),
		projectId: text('project_id').notNull().references(() => projects.id),
		ts: integer('ts').notNull(),
		user: text('user'),
		action: text('action').notNull(),
		targetTable: text('target_table'),
		targetId: text('target_id'),
		r2KeyBefore: text('r2_key_before'),
		r2KeyAfter: text('r2_key_after'),
		correlationId: text('correlation_id'),
	},
	(t) => [
		// Critical read pattern: WHERE session_id = ? ORDER BY ts — full audit trail
		// for a single takeoff session. Composite index lets it skip the sort.
		index('audit_log_session_ts_idx').on(t.sessionId, t.ts),
		index('audit_log_project_idx').on(t.projectId),
	],
);

// ---------------------------------------------------------------------------
// global_layer_dict — cross-project memory for S6 layer→kind mapping.
// Counter incremented (via CF Queue, async) each time a project confirms
// a layer_name→kind mapping. Read on S6 to propose the strongest signal:
// "EL-Condutos → eletroduto, confirmed in 12 projects, accept?"
//
// PK is composite (layer_name, kind). A single layer name can map to different
// kinds across firms (rare but real) — keep both counters separately.
// ---------------------------------------------------------------------------
export const globalLayerDict = sqliteTable(
	'global_layer_dict',
	{
		layerName: text('layer_name').notNull(),
		kind: text('kind').notNull(),
		confirmedCount: integer('confirmed_count').default(0),
		lastConfirmedAt: integer('last_confirmed_at').notNull(),
	},
	(t) => [primaryKey({ columns: [t.layerName, t.kind] })],
);

// ---------------------------------------------------------------------------
// global_glyph_dict — cross-project memory for S5 glyph→kind dictionary.
// Same shape as global_layer_dict but keyed on glyph_signature instead.
//
// Signature canonicalization strategy is DEFERRED until Phase 9 (S5 wire) —
// it does not affect S1-S3 scope. Default proposal when reached:
// topological-features hash. See docs/spec/backend-persistence-plan.md.
//
// Table created in Phase 1 so the schema shape is locked early, even though
// no writes happen until Phase 9.
// ---------------------------------------------------------------------------
export const globalGlyphDict = sqliteTable(
	'global_glyph_dict',
	{
		glyphSignature: text('glyph_signature').notNull(),
		kind: text('kind').notNull(),
		confirmedCount: integer('confirmed_count').default(0),
		lastConfirmedAt: integer('last_confirmed_at').notNull(),
	},
	(t) => [primaryKey({ columns: [t.glyphSignature, t.kind] })],
);

// ---------------------------------------------------------------------------
// layer_mappings — Phase 8 (S6 Camadas). Per-project CAD layer → infra kind
// mapping. One row per (project_id, layer_name); multi-sheet variance is YAGNI
// (per-project is the right grain — same layer name means the same thing across
// all sheets in a project).
//
// kind enum = INFRA_KINDS keys from estimator/glossary.py. NULL = HITL-pending
// (Carlos has not yet confirmed this layer's classification).
//
// source enum = where the proposal originated:
//   cross_project — global_layer_dict vote (strongest signal, most projects agree)
//   glossary      — glossary.py substring/regex match (deterministic, project-agnostic)
//   intel         — LLM intel.py proposal (weakest, requires confirmation)
//
// confirmed_at is NULL until Carlos accepts the proposal in the S6 UI. Only
// confirmed rows flow downstream into /count (S9).
// ---------------------------------------------------------------------------
export const layerMappings = sqliteTable(
	'layer_mappings',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').notNull().references(() => projects.id),
		layerName: text('layer_name').notNull(),
		// NULL = HITL-pending; non-null = one of the 5 INFRA_KINDS
		kind: text('kind', {
			enum: ['eletrocalha', 'perfilado', 'leito', 'barramento', 'eletroduto'],
		}),
		source: text('source', {
			enum: ['cross_project', 'glossary', 'intel'],
		}).notNull(),
		confirmedAt: integer('confirmed_at'), // epoch ms; NULL until Carlos confirms
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull(),
	},
	(t) => [
		index('layer_mappings_project_idx').on(t.projectId),
		uniqueIndex('layer_mappings_project_layer_uidx').on(t.projectId, t.layerName),
		// Drizzle text({ enum }) is TS-only — enforce at DB level with explicit CHECK.
		// kind IS NULL = HITL-pending (valid); non-null must be an INFRA_KINDS key.
		check(
			'layer_mappings_kind_check',
			sql`${t.kind} IS NULL OR ${t.kind} IN ('eletrocalha', 'perfilado', 'leito', 'barramento', 'eletroduto')`,
		),
		check(
			'layer_mappings_source_check',
			sql`${t.source} IN ('cross_project', 'glossary', 'intel')`,
		),
	],
);

// ---------------------------------------------------------------------------
// layer_occurrences — Phase 8 (S6 Camadas). Per-(mapping, sheet) observation
// row carrying element counts + visual properties extracted by the container
// /extract/layers endpoint. Populated when a sheet's layers_json is first
// written; updated on re-extract. CASCADE on both FKs — deleting a mapping or
// sheet cleans up its occurrence rows automatically.
// ---------------------------------------------------------------------------
export const layerOccurrences = sqliteTable(
	'layer_occurrences',
	{
		id: text('id').primaryKey(),
		layerMappingId: text('layer_mapping_id')
			.notNull()
			.references(() => layerMappings.id, { onDelete: 'cascade' }),
		sheetId: text('sheet_id')
			.notNull()
			.references(() => sheets.id, { onDelete: 'cascade' }),
		elementCount: integer('element_count').notNull().default(0),
		// hex string e.g. '#ff0000'; NULL when layer carries no color info
		colorRgb: text('color_rgb'),
		// SQLite boolean: 0 or 1
		hasLines: integer('has_lines'),
		hasCurves: integer('has_curves'),
		observedAt: integer('observed_at').notNull(),
	},
	(t) => [
		uniqueIndex('layer_occurrences_mapping_sheet_uidx').on(t.layerMappingId, t.sheetId),
		check('layer_occurrences_has_lines_check', sql`${t.hasLines} IS NULL OR ${t.hasLines} IN (0, 1)`),
		check('layer_occurrences_has_curves_check', sql`${t.hasCurves} IS NULL OR ${t.hasCurves} IN (0, 1)`),
	],
);
