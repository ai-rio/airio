// /api/projects/[id]/sheets/[sheet_id]/layers — S6 Camadas GET.
//
// GET: Returns the electrical layer proposals for this sheet.
//   Cache hit: sheets.layers_json IS NOT NULL → parse + filter + merge, skip container.
//   Cache miss: call container /extract/layers → persist full inventory to
//               sheets.layers_json → filter + merge.
//   Intel gate: fire /intel/layer-proposals ONLY if residual unknowns > 20%.
//
// Response: {
//   proposals: LayerProposal[],   // filtered + merged (24 for J&J PE03_TER first run)
//   total_layers: number,          // full inventory count (99 for J&J)
//   hidden_count: number,          // non-electrical layers filtered out (75)
//   hidden_layers: string[],       // names of the hidden layers, sorted alphabetically
//   intel_called: boolean,         // whether LLM was invoked this request
//   cache_hit: boolean,            // whether layers_json cache was used
//   correlation_id: string,
// }
//
// Per .claude/rules/dev-workflow.md §5: container calls go through
// src/lib/estimator.ts adapter. Per ai-output-handling.md §1: intel output
// validated server-side before use.

import type { APIRoute } from 'astro';
import { and, eq, isNotNull, isNull, ne } from 'drizzle-orm';
import { sheets, layerMappings as layerMappingsTable } from '../../../../../../../db/schema';
import { getDb } from '../../../../../../lib/db';
import { loadProject, jsonError, jsonOk } from '../../../../../../lib/projects';
import {
	extractLayers,
	proposeLayerKinds,
	EstimatorError,
	type LayerInventoryItem,
	type KindEnum,
} from '../../../../../../lib/estimator';
import {
	filterElectrical,
	mergeProposals,
	shouldFireIntel,
} from '../../../../../../lib/layers';
import { newId } from '../../../../../../lib/ids';
import { getSessionId } from '../../../../../../lib/audit';

export const GET: APIRoute = async ({ params, request }) => {
	const projectId = String(params.id ?? '');
	const sheetId = String(params.sheet_id ?? '');

	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	const db = getDb();
	const existing = await db
		.select()
		.from(sheets)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)))
		.limit(1);
	if (existing.length === 0) return jsonError(404, 'not_found', 'Sheet not found in this project');
	const sheet = existing[0];

	const sessionId = getSessionId(request);
	const correlationId = `${sessionId}-${newId()}`;

	// ---------------------------------------------------------------------------
	// 1. Layer inventory — cache or container
	// ---------------------------------------------------------------------------
	let allLayers: LayerInventoryItem[];
	let cacheHit = false;

	if (sheet.layersJson) {
		try {
			const parsed = JSON.parse(sheet.layersJson) as LayerInventoryItem[];
			if (!Array.isArray(parsed)) throw new Error('layers_json is not an array');
			allLayers = parsed;
			cacheHit = true;
		} catch {
			// Corrupt cache — fall through to container call.
			allLayers = await callContainer(sheetId, projectId, sheet.pageIndex ?? 0, correlationId);
			await persistLayersJsonIfAbsent(db, sheetId, projectId, allLayers);
		}
	} else {
		try {
			allLayers = await callContainer(sheetId, projectId, sheet.pageIndex ?? 0, correlationId);
		} catch (err) {
			if (err instanceof EstimatorError) {
				if (err.status >= 400 && err.status < 500) {
					const d = err.detail as Record<string, unknown> | null;
					return jsonError(
						err.status,
						typeof d?.error === 'string' ? d.error : 'upstream_error',
						typeof d?.message === 'string' ? d.message : err.message,
					);
				}
				return jsonError(502, 'estimator_failed', err.message);
			}
			throw err;
		}
		await persistLayersJsonIfAbsent(db, sheetId, projectId, allLayers);
	}

	// ---------------------------------------------------------------------------
	// 2. Filter to electrical layers only
	// ---------------------------------------------------------------------------
	const electricalLayers = filterElectrical(allLayers);
	const totalLayers = allLayers.length;
	const hiddenCount = totalLayers - electricalLayers.length;

	// Names of the non-electrical layers — sorted alphabetically for stable UI rendering.
	const electricalNameSet = new Set(electricalLayers.map((l) => l.name));
	const hiddenLayers = allLayers
		.filter((l) => !electricalNameSet.has(l.name))
		.map((l) => l.name)
		.sort();

	// ---------------------------------------------------------------------------
	// 3. Intel gate: count covered layers
	// ---------------------------------------------------------------------------
	// We hoist BOTH DB queries (current-project confirmed + cross-project memory)
	// here so the gate has the full picture. This also means mergeProposals can
	// receive the pre-resolved maps and skip the duplicate queries.
	//
	// "Covered" = glossary_kind non-null OR cross_project confirmed OR current
	// confirmed. "Residual" = none of the above → route to intel if >20% residual.

	const glossaryCoveredNames = new Set(
		electricalLayers.filter((l) => l.glossary_kind !== null).map((l) => l.name),
	);

	// Current-project confirmed mappings.
	const currentConfirmedRows = await db
		.select({ layerName: layerMappingsTable.layerName, kind: layerMappingsTable.kind, source: layerMappingsTable.source })
		.from(layerMappingsTable)
		.where(and(eq(layerMappingsTable.projectId, projectId), isNotNull(layerMappingsTable.confirmedAt)));
	const currentConfirmedMap = new Map<string, { kind: KindEnum | null; source: 'cross_project' | 'glossary' | 'intel' }>(
		currentConfirmedRows.map((r) => [r.layerName, { kind: r.kind as KindEnum | null, source: r.source as 'cross_project' | 'glossary' | 'intel' }]),
	);

	// Cross-project confirmed mappings (other projects only).
	const crossRows = await db
		.select({ layerName: layerMappingsTable.layerName, kind: layerMappingsTable.kind })
		.from(layerMappingsTable)
		.where(and(ne(layerMappingsTable.projectId, projectId), isNotNull(layerMappingsTable.confirmedAt)));
	const crossProjectMap = new Map<string, KindEnum | null>();
	for (const row of crossRows) {
		if (!crossProjectMap.has(row.layerName)) {
			crossProjectMap.set(row.layerName, row.kind as KindEnum | null);
		}
	}

	// Compute covered count: a layer is covered if any signal resolves it.
	const coveredCount = electricalLayers.filter((l) =>
		glossaryCoveredNames.has(l.name) ||
		currentConfirmedMap.has(l.name) ||
		crossProjectMap.has(l.name),
	).length;

	const fireIntel = shouldFireIntel(electricalLayers.length, coveredCount);

	// ---------------------------------------------------------------------------
	// 4. Intel call (conditional)
	// ---------------------------------------------------------------------------
	let intelProposals: Record<string, KindEnum | null> | undefined;
	let intelCalled = false;

	if (fireIntel) {
		const residualLayers = electricalLayers
			.filter((l) =>
				!glossaryCoveredNames.has(l.name) &&
				!currentConfirmedMap.has(l.name) &&
				!crossProjectMap.has(l.name),
			)
			.map((l) => l.name);

		if (residualLayers.length > 0) {
			try {
				const intelResult = await proposeLayerKinds({ layerNames: residualLayers, correlationId });
				intelProposals = intelResult.proposals;
				intelCalled = true;
			} catch (err) {
				// Intel failure is non-fatal: fall back to null proposals for residual layers.
				// Per ai-output-handling.md §2: safe fallback, don't crash the GET.
				console.log(JSON.stringify({
					event: 'intel_layer_proposals_error',
					correlation_id: correlationId,
					error: String(err),
					ts_ms: Date.now(),
				}));
				intelProposals = Object.fromEntries(residualLayers.map((n) => [n, null]));
				intelCalled = true;
			}
		}
	}

	// ---------------------------------------------------------------------------
	// 5. 3-source merge — pass pre-resolved maps to avoid double DB queries
	// ---------------------------------------------------------------------------
	const proposals = await mergeProposals({
		db,
		projectId,
		electricalLayers,
		intelProposals,
		preResolvedCurrentConfirmed: currentConfirmedMap,
		preResolvedCrossProject: crossProjectMap,
	});

	return jsonOk(
		{
			proposals,
			total_layers: totalLayers,
			hidden_count: hiddenCount,
			hidden_layers: hiddenLayers,
			intel_called: intelCalled,
			cache_hit: cacheHit,
			correlation_id: correlationId,
		},
		200,
		{ 'x-airio-session': sessionId },
	);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callContainer(
	sheetId: string,
	projectId: string,
	pageIndex: number,
	correlationId: string,
): Promise<LayerInventoryItem[]> {
	const r2Key = `pdf/${projectId}/${sheetId}.pdf`;
	const result = await extractLayers({ r2Key, pageIndex, correlationId });
	return result.layers;
}

// Race-safe write: two concurrent cold GETs will both fetch from container,
// but the second writer's UPDATE here is gated on layers_json still being NULL.
// "First writer wins" — second silently no-ops (its in-memory layers were valid
// too; we discard them and let the cached version be served on the next GET).
// Prevents (a) wasted 2× cold-start cost (already paid, but no point persisting
// twice), and (b) audit-trail correlation_id drift where the persisted JSON
// might be from a different container call than the response that returned to
// the client. Acceptable race window: the in-flight container result for the
// loser is discarded, but the request still returns the loser's result inline.
async function persistLayersJsonIfAbsent(
	db: ReturnType<typeof getDb>,
	sheetId: string,
	projectId: string,
	layers: LayerInventoryItem[],
): Promise<void> {
	await db
		.update(sheets)
		.set({ layersJson: JSON.stringify(layers) })
		.where(
			and(
				eq(sheets.id, sheetId),
				eq(sheets.projectId, projectId),
				isNull(sheets.layersJson),
			),
		);
}
