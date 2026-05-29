// /api/projects/[id]/sheets/[sheet_id]/layer-mappings — S6 Camadas POST.
//
// POST application/json
//   { "mappings": [{ "layer_name": string, "kind": KindEnum, "source": SourceEnum }] }
//
//   Accepts 1 to N elements. Per-row UI dispatches 1-element; bulk dispatches N.
//
//   For each mapping:
//     1. Upsert layer_mappings by (project_id, layer_name): set kind, source,
//        confirmed_at = now(). Create row if not exists.
//     2. Upsert layer_occurrences by (layer_mapping_id, sheet_id): pull observed
//        element_count / color_rgb / has_lines / has_curves from sheets.layers_json
//        cache (already populated by GET /layers before Carlos can confirm).
//     3. Write one audit_log row per accepted mapping (r2_key_after = null per
//        amended audit rule — non-R2 writes omit R2 keys).
//     4. Fire one Queue message per mapping to COUNTERS binding (global_layer_dict
//        counter increment) per Phase 3 pattern.
//
// Response: { confirmed: N, mappings: [...confirmed layer names] }
//
// Per .claude/rules/dev-workflow.md §5: no inline container calls.
// Per .claude/rules/observability.md §4: HITL events in audit_log.

import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { sheets, layerMappings, layerOccurrences, auditLog } from '../../../../../../../db/schema';
import { getDb } from '../../../../../../lib/db';
import { loadProject, jsonError, jsonOk } from '../../../../../../lib/projects';
import { getSessionId } from '../../../../../../lib/audit';
import { newId } from '../../../../../../lib/ids';
import type { LayerInventoryItem } from '../../../../../../lib/estimator';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

const VALID_KINDS = new Set(['eletrocalha', 'perfilado', 'leito', 'barramento', 'eletroduto']);
const VALID_SOURCES = new Set(['cross_project', 'glossary', 'intel']);
type KindEnum = 'eletrocalha' | 'perfilado' | 'leito' | 'barramento' | 'eletroduto';
type SourceEnum = 'cross_project' | 'glossary' | 'intel';

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

interface MappingInput {
	layer_name: string;
	// null = HITL-pending per Carlos's locked decision; DB allows NULL on kind column.
	// Validator below accepts null OR an enum value (NOT all non-strings).
	kind: KindEnum | null;
	source: SourceEnum;
}

function validateBody(raw: unknown): { ok: true; mappings: MappingInput[] } | { ok: false; message: string } {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return { ok: false, message: 'Body must be a JSON object' };
	}
	const obj = raw as Record<string, unknown>;
	if (!Array.isArray(obj.mappings) || obj.mappings.length === 0) {
		return { ok: false, message: 'mappings must be a non-empty array' };
	}
	for (const item of obj.mappings) {
		if (typeof item !== 'object' || item === null) {
			return { ok: false, message: 'Each mapping must be an object' };
		}
		const m = item as Record<string, unknown>;
		if (typeof m.layer_name !== 'string' || !m.layer_name) {
			return { ok: false, message: 'Each mapping must have a string layer_name' };
		}
		if (m.kind !== null && (typeof m.kind !== 'string' || !VALID_KINDS.has(m.kind))) {
			return { ok: false, message: `Invalid kind '${String(m.kind)}' — must be null OR one of: ${[...VALID_KINDS].join(', ')}` };
		}
		if (typeof m.source !== 'string' || !VALID_SOURCES.has(m.source)) {
			return { ok: false, message: `Invalid source '${String(m.source)}' — must be one of: ${[...VALID_SOURCES].join(', ')}` };
		}
	}
	return { ok: true, mappings: obj.mappings as MappingInput[] };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ params, request }) => {
	const projectId = String(params.id ?? '');
	const sheetId = String(params.sheet_id ?? '');

	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	const db = getDb();

	// Load sheet — we need layers_json cache for occurrence data.
	const sheetRows = await db
		.select()
		.from(sheets)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)))
		.limit(1);
	if (sheetRows.length === 0) return jsonError(404, 'not_found', 'Sheet not found in this project');
	const sheet = sheetRows[0];

	// Parse request body.
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return jsonError(400, 'invalid_json', 'Body must be valid JSON');
	}
	const v = validateBody(raw);
	if (!v.ok) return jsonError(400, 'invalid_body', v.message);

	const sessionId = getSessionId(request);
	const correlationId = `${sessionId}-${newId()}`;
	const now = Date.now();

	// Parse layers_json cache for occurrence data.
	let layerCache: LayerInventoryItem[] = [];
	if (sheet.layersJson) {
		try {
			layerCache = JSON.parse(sheet.layersJson) as LayerInventoryItem[];
		} catch {
			// Cache corrupt — occurrence data will use zero defaults.
		}
	}
	const layerCacheMap = new Map<string, LayerInventoryItem>(layerCache.map((l) => [l.name, l]));

	// Queue binding for global_layer_dict counter increments.
	const countersQueue = (env as { COUNTERS?: Queue<unknown> }).COUNTERS;

	const confirmedNames: string[] = [];

	for (const mapping of v.mappings) {
		// 1. Upsert layer_mappings — check for existing row first (SQLite D1 lacks
		//    ON CONFLICT DO UPDATE with Drizzle 0.45 cleanly; manual upsert).
		const existing = await db
			.select({ id: layerMappings.id })
			.from(layerMappings)
			.where(and(eq(layerMappings.projectId, projectId), eq(layerMappings.layerName, mapping.layer_name)))
			.limit(1);

		let mappingId: string;
		if (existing.length > 0) {
			mappingId = existing[0].id;
			await db
				.update(layerMappings)
				.set({
					kind: mapping.kind,
					source: mapping.source,
					confirmedAt: now,
					updatedAt: now,
				})
				.where(eq(layerMappings.id, mappingId));
		} else {
			mappingId = newId();
			await db.insert(layerMappings).values({
				id: mappingId,
				projectId,
				layerName: mapping.layer_name,
				kind: mapping.kind,
				source: mapping.source,
				confirmedAt: now,
				createdAt: now,
				updatedAt: now,
			});
		}

		// 2. Upsert layer_occurrences.
		const cached = layerCacheMap.get(mapping.layer_name);
		const existingOcc = await db
			.select({ id: layerOccurrences.id })
			.from(layerOccurrences)
			.where(and(eq(layerOccurrences.layerMappingId, mappingId), eq(layerOccurrences.sheetId, sheetId)))
			.limit(1);

		if (existingOcc.length > 0) {
			await db
				.update(layerOccurrences)
				.set({
					elementCount: cached?.element_count ?? 0,
					colorRgb: cached?.color_rgb ?? null,
					hasLines: cached?.has_lines ? 1 : 0,
					hasCurves: cached?.has_curves ? 1 : 0,
					observedAt: now,
				})
				.where(eq(layerOccurrences.id, existingOcc[0].id));
		} else {
			await db.insert(layerOccurrences).values({
				id: newId(),
				layerMappingId: mappingId,
				sheetId,
				elementCount: cached?.element_count ?? 0,
				colorRgb: cached?.color_rgb ?? null,
				hasLines: cached?.has_lines ? 1 : 0,
				hasCurves: cached?.has_curves ? 1 : 0,
				observedAt: now,
			});
		}

		// 3. Audit log — r2_key_after intentionally null (non-R2 write per Phase 8 amendment).
		const auditId = newId();
		await db.insert(auditLog).values({
			id: auditId,
			sessionId,
			projectId,
			ts: now,
			user: null,
			action: 'layer_mapping_confirm',
			targetTable: 'layer_mappings',
			targetId: mappingId,
			r2KeyBefore: null,
			r2KeyAfter: null,
			correlationId,
		});

		// 4. Queue message for global_layer_dict counter increment.
		if (countersQueue) {
			await countersQueue.send({
				event: 'layer_confirmed',
				layer_name: mapping.layer_name,
				kind: mapping.kind,
				confirmed_at: now,
			});
		}

		confirmedNames.push(mapping.layer_name);
	}

	return jsonOk(
		{
			confirmed: confirmedNames.length,
			mappings: confirmedNames,
			correlation_id: correlationId,
		},
		200,
		{ 'x-airio-session': sessionId },
	);
};
