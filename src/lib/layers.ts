// layers.ts — pure helpers for S6 Camadas layer proposal merge.
//
// No Astro / Hono / Worker imports. DB queries use Drizzle only.
// Module boundary per .claude/rules/dev-workflow.md §5.
//
// Design decisions (locked 2026-05-29):
// - Server-side hard filter: only ELE_*/LUZ*/ELETRICA/LUMIN layers reach UI.
//   The other ~75 are stored in sheets.layers_json (full cache) but excluded.
// - 3-source merge priority: cross_project > glossary > intel.
//   Current-project confirmed mappings are returned with source from the DB row
//   (cross_project / glossary / intel) and counted as "covered" for the intel
//   gate — so a re-visit never fires intel again when all layers are confirmed.
// - Intel gate: fire /intel/layer-proposals ONLY IF residual unknowns >20%.
//   "Covered" = has a confirmed row in layer_mappings (any source) OR glossary_kind
//   from container OR cross_project hit. "Residual" = none of the above.
// - LayerProposal.source reflects the *strongest available* signal at GET time.
//   Once confirmed, the persisted layer_mappings.source reflects how the user
//   accepted it (original proposal source), not re-derived on re-read.

import { and, eq, ne, isNotNull } from 'drizzle-orm';
import { layerMappings } from '../../db/schema';
import type { LayerInventoryItem, KindEnum } from './estimator';
import type { AirioDb } from './db';

export type { LayerInventoryItem };

// ---------------------------------------------------------------------------
// Electrical filter
// ---------------------------------------------------------------------------

// Filter rules (QA pass S2 fix, 2026-05-29):
//   Prefix-anchored:  ELE_ ELE-     (BR elétrica convention, e.g. ELE_CALHA)
//                     ELET_ ELET-   (alt elétrica prefix, e.g. ELET-DUTOS)
//                     LUZ_ LUZ- "LUZ " (light/iluminação, all 3 separators)
//                     ILUMIN         (iluminação)
//                     LUMINOT        (luminotécnica — anywhere via case-insensitive)
//   Substring:        MMM-ELETRIC MMM-LUMINOT
//                     (covers LEGENDAS$0$MMM-ELETRICA-TOMADAS xref chains).
//
// Deliberately NOT matched (false-positive guards):
//   LUMINANCE-* (annotation) — LUMINOT anchored at start blocks it
//   ELETRODOMESTICOS (appliance) — ELE_/ELET_ requires separator
//   A_I_ELE_82 (arquitetura w/ ELE infix) — prefix-anchored, not infix
//   bare LUMIN / ELETRICA substrings (prior regex) — too greedy, removed
//
// Known false-negatives (file as task #10, expand on next non-J&J dogfood):
//   SENAC convention   EL-Condutos / EL-Barramento / AL-BANDEJA
//                      (per estimator/tests/test_glossary.py)
//   Bare ELETRICA prefix/infix without ELE_/ELET_ separator
//                      (e.g. ELETRICA-GERAL, *-ELETRICA, ELETROCALHA, ELETRODUTO)
//   Non-MMM xref chain (e.g. LEGENDAS$0$ABC-ELETRICA-TOMADAS)
// QA proposal: add ELECTRICAL_INFIX = /(?:^|[\-_$])(ELETRICA|ELÉTRICA|ELETRO[CD])/i
// alongside PREFIX + SUBSTRING. Defer until a real customer file requires it.
const ELECTRICAL_PREFIX = /^(ELE[_\-]|ELET[_\-]|LUZ[_\-\s]|ILUMIN|LUMINOT)/i;
const ELECTRICAL_SUBSTRING = /MMM-(ELETRIC|LUMINOT)/i;

export function filterElectrical(layers: LayerInventoryItem[]): LayerInventoryItem[] {
	return layers.filter((l) => ELECTRICAL_PREFIX.test(l.name) || ELECTRICAL_SUBSTRING.test(l.name));
}

// ---------------------------------------------------------------------------
// Proposal shape
// ---------------------------------------------------------------------------

export interface LayerProposal {
	layer_name: string;
	kind: KindEnum | null;
	// source reflects the best available signal at GET time.
	// Persisted value in layer_mappings.source may differ if intel was the original
	// proposal but the user accepted it after cross_project memory was populated.
	source: 'cross_project' | 'glossary' | 'intel';
	// confirmed = true if this project already has a confirmed mapping in DB.
	// The UI uses this to pre-check the row; "Mostrar todas" toggle can still show it.
	confirmed: boolean;
	// Observed data — forwarded to layer_occurrences on confirm.
	element_count: number;
	color_rgb: string | null;
	has_lines: boolean;
	has_curves: boolean;
}

// ---------------------------------------------------------------------------
// Intel gate
// ---------------------------------------------------------------------------

/**
 * Returns true if the proportion of residual unknowns (no cross_project, no
 * glossary coverage) among filtered layers exceeds 20%.
 *
 * "Covered" = cross_project hits (from DB) + glossary_kind non-null.
 * Confirmed current-project rows count as covered to suppress intel re-calls.
 */
export function shouldFireIntel(
	filteredCount: number,
	coveredCount: number, // cross_project + glossary + current-project confirmed
): boolean {
	if (filteredCount === 0) return false;
	const residualFraction = (filteredCount - coveredCount) / filteredCount;
	return residualFraction > 0.2; // >20% unknown → fire intel
}

// ---------------------------------------------------------------------------
// 3-source merge
// ---------------------------------------------------------------------------

/**
 * Build LayerProposal[] for the filtered electrical layers.
 *
 * Priority:
 *  1. Current-project confirmed mapping (source from DB row, confirmed=true)
 *  2. Cross-project memory (layer_mappings in other projects)
 *  3. glossary_kind from container response
 *  4. Intel proposals (passed in after the gate check)
 *  5. null / unknown — residual that still needs HITL
 *
 * intelProposals is undefined when the gate was skipped (≥80% covered).
 *
 * preResolvedCurrentConfirmed / preResolvedCrossProject: if the caller already
 * ran the DB queries for the gate computation, pass them here to avoid a second
 * round-trip. If absent, this function runs its own queries.
 */
export async function mergeProposals(args: {
	db: AirioDb;
	projectId: string;
	electricalLayers: LayerInventoryItem[];
	intelProposals?: Record<string, KindEnum | null>;
	preResolvedCurrentConfirmed?: Map<string, { kind: KindEnum | null; source: 'cross_project' | 'glossary' | 'intel' }>;
	preResolvedCrossProject?: Map<string, KindEnum | null>;
}): Promise<LayerProposal[]> {
	const { db, projectId, electricalLayers, intelProposals } = args;

	// --- 1. Current-project confirmed mappings ---
	let currentConfirmed: Map<string, { kind: KindEnum | null; source: 'cross_project' | 'glossary' | 'intel' }>;
	if (args.preResolvedCurrentConfirmed) {
		currentConfirmed = args.preResolvedCurrentConfirmed;
	} else {
		const rows = await db
			.select({ layerName: layerMappings.layerName, kind: layerMappings.kind, source: layerMappings.source })
			.from(layerMappings)
			.where(and(eq(layerMappings.projectId, projectId), isNotNull(layerMappings.confirmedAt)));
		currentConfirmed = new Map(rows.map((r) => [r.layerName, {
			kind: r.kind as KindEnum | null,
			source: r.source as 'cross_project' | 'glossary' | 'intel',
		}]));
	}

	// --- 2. Cross-project confirmed mappings ---
	let crossProject: Map<string, KindEnum | null>;
	if (args.preResolvedCrossProject) {
		crossProject = args.preResolvedCrossProject;
	} else {
		const rows = await db
			.select({ layerName: layerMappings.layerName, kind: layerMappings.kind })
			.from(layerMappings)
			.where(and(ne(layerMappings.projectId, projectId), isNotNull(layerMappings.confirmedAt)));
		crossProject = new Map();
		for (const row of rows) {
			if (!crossProject.has(row.layerName)) {
				crossProject.set(row.layerName, row.kind as KindEnum | null);
			}
		}
	}

	// --- 3. Build proposals ---
	const proposals: LayerProposal[] = [];

	for (const layer of electricalLayers) {
		const base: Omit<LayerProposal, 'kind' | 'source' | 'confirmed'> = {
			layer_name: layer.name,
			element_count: layer.element_count,
			color_rgb: layer.color_rgb,
			has_lines: layer.has_lines,
			has_curves: layer.has_curves,
		};

		// Priority 1: current-project confirmed
		if (currentConfirmed.has(layer.name)) {
			const conf = currentConfirmed.get(layer.name)!;
			proposals.push({ ...base, kind: conf.kind, source: conf.source, confirmed: true });
			continue;
		}

		// Priority 2: cross-project memory (other projects)
		if (crossProject.has(layer.name)) {
			proposals.push({
				...base,
				kind: crossProject.get(layer.name) ?? null,
				source: 'cross_project',
				confirmed: false,
			});
			continue;
		}

		// Priority 3: glossary_kind from container
		if (layer.glossary_kind !== null) {
			proposals.push({ ...base, kind: layer.glossary_kind, source: 'glossary', confirmed: false });
			continue;
		}

		// Priority 4: intel proposal (if gate was triggered and response available)
		const intelKind = intelProposals?.[layer.name] ?? null;
		proposals.push({ ...base, kind: intelKind, source: 'intel', confirmed: false });
	}

	return proposals;
}
