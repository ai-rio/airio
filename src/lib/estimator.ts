// estimator.ts — single adapter for container calls.
//
// Per .claude/rules/dev-workflow.md §5: container interactions go through ONE
// adapter, never inline in a page or API handler. Astro endpoints call into
// here; this file owns the env.ESTIMATOR service binding, request shape,
// two-sided instrumentation logging, and result typing.
//
// Two-sided instrumentation per docs/spec/backend-persistence-plan.md:
// log estimator_fetch_start|done around the binding call. Container's own
// container_request_start|done logs are emitted by app_api.py middleware.
// Delta = container cold-start cost.

import { env } from 'cloudflare:workers';

interface EstimatorEnv {
	ESTIMATOR?: { fetch(request: Request): Promise<Response> };
}

function log(event: string, fields: Record<string, unknown>): void {
	console.log(JSON.stringify({ event, ts_ms: Date.now(), ...fields }));
}

function getEstimator(): { fetch(request: Request): Promise<Response> } {
	const bound = (env as EstimatorEnv).ESTIMATOR;
	if (!bound) {
		throw new Error(
			'ESTIMATOR service binding missing. Check wrangler.jsonc `services` + ' +
				'astro.config.mjs auxiliaryWorkers registration.',
		);
	}
	return bound;
}

export interface ExtractScaleArgs {
	r2Key: string;
	pageIndex?: number;
	correlationId?: string;
}

export interface ScaleResult {
	scale_denom: number | null;
	source: 'titleblock_text' | 'not_found';
	evidence_text: string | null;
	evidence_bbox: [number, number, number, number] | null;
	page_size_pt: [number, number];
}

/**
 * Call container POST /extract/scale via the auxiliary Worker service binding.
 * Returns the parsed JSON. Non-2xx responses throw EstimatorError.
 */
export async function extractScale(args: ExtractScaleArgs): Promise<ScaleResult> {
	const estimator = getEstimator();
	const correlationId = args.correlationId ?? `est-${crypto.randomUUID()}`;
	const endpoint = '/extract/scale';

	const payload = JSON.stringify({
		r2_key: args.r2Key,
		page_index: args.pageIndex ?? 0,
		correlation_id: correlationId,
	});

	log('estimator_fetch_start', { endpoint, correlation_id: correlationId });
	const start = Date.now();

	const resp = await estimator.fetch(
		new Request(`https://estimator/extract/scale`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-airio-correlation-id': correlationId,
			},
			body: payload,
		}),
	);

	const durationMs = Date.now() - start;
	log('estimator_fetch_done', {
		endpoint,
		correlation_id: correlationId,
		duration_ms: durationMs,
		status: resp.status,
	});

	if (!resp.ok) {
		const raw = await resp.text();
		let detail: unknown;
		try {
			detail = JSON.parse(raw);
		} catch {
			detail = raw;
		}
		throw new EstimatorError(
			`extractScale failed: ${resp.status}`,
			resp.status,
			correlationId,
			detail,
		);
	}

	const data = (await resp.json()) as ScaleResult;
	return data;
}

// ---------------------------------------------------------------------------
// /extract/layers
// ---------------------------------------------------------------------------

export interface LayerInventoryItem {
	name: string;
	element_count: number;
	color_rgb: string | null;
	has_lines: boolean;
	has_curves: boolean;
	glossary_kind: 'eletrocalha' | 'perfilado' | 'leito' | 'barramento' | 'eletroduto' | null;
}

export interface LayerInventoryResult {
	page_index: number;
	page_count: number;
	layers: LayerInventoryItem[];
}

const VALID_KINDS = new Set(['eletrocalha', 'perfilado', 'leito', 'barramento', 'eletroduto']);

function validateLayerInventory(raw: unknown): LayerInventoryResult {
	if (typeof raw !== 'object' || raw === null) throw new Error('layers response is not an object');
	const obj = raw as Record<string, unknown>;
	if (typeof obj.page_index !== 'number') throw new Error('layers: missing page_index');
	if (typeof obj.page_count !== 'number') throw new Error('layers: missing page_count');
	if (!Array.isArray(obj.layers)) throw new Error('layers: missing layers array');
	for (const item of obj.layers) {
		if (typeof item !== 'object' || item === null) throw new Error('layers: item is not object');
		const it = item as Record<string, unknown>;
		if (typeof it.name !== 'string') throw new Error('layers item: missing name');
		if (typeof it.element_count !== 'number') throw new Error('layers item: missing element_count');
		if (it.glossary_kind !== null && !VALID_KINDS.has(it.glossary_kind as string)) {
			throw new Error(`layers item: invalid glossary_kind ${String(it.glossary_kind)}`);
		}
	}
	return raw as LayerInventoryResult;
}

export async function extractLayers(args: {
	r2Key: string;
	pageIndex?: number;
	correlationId?: string;
}): Promise<LayerInventoryResult> {
	const estimator = getEstimator();
	const correlationId = args.correlationId ?? `est-${crypto.randomUUID()}`;
	const endpoint = '/extract/layers';

	const payload = JSON.stringify({
		r2_key: args.r2Key,
		page_index: args.pageIndex ?? 0,
		correlation_id: correlationId,
	});

	log('estimator_fetch_start', { endpoint, correlation_id: correlationId });
	const start = Date.now();

	const resp = await estimator.fetch(
		new Request(`https://estimator/extract/layers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-airio-correlation-id': correlationId,
			},
			body: payload,
		}),
	);

	const durationMs = Date.now() - start;
	log('estimator_fetch_done', {
		endpoint,
		correlation_id: correlationId,
		duration_ms: durationMs,
		status: resp.status,
	});

	if (!resp.ok) {
		const raw = await resp.text();
		let detail: unknown;
		try { detail = JSON.parse(raw); } catch { detail = raw; }
		throw new EstimatorError(`extractLayers failed: ${resp.status}`, resp.status, correlationId, detail);
	}

	const raw = await resp.json();
	try {
		return validateLayerInventory(raw);
	} catch (err) {
		throw new EstimatorError(
			`extractLayers: invalid response schema: ${String(err)}`,
			502,
			correlationId,
			raw,
		);
	}
}

// ---------------------------------------------------------------------------
// /intel/layer-proposals
// ---------------------------------------------------------------------------

export type KindEnum = 'eletrocalha' | 'perfilado' | 'leito' | 'barramento' | 'eletroduto';

export interface IntelProposalsResult {
	proposals: Record<string, KindEnum | null>;
	// Normalized canonical model string (SDK returns full slug; CLI returns short alias).
	// We normalise to the full slug where known, else pass through verbatim.
	model: string;
	prompt_version: string;
	validation_pass: boolean;
}

function normalizeModel(raw: string | null | undefined): string {
	if (!raw) return 'unknown';
	// CLI subscription returns 'sonnet'; normalise to the current claude-sonnet slug.
	if (raw === 'sonnet') return 'claude-sonnet-4-6';
	return raw;
}

function validateIntelProposals(raw: unknown, layerNames: string[]): IntelProposalsResult {
	if (typeof raw !== 'object' || raw === null) throw new Error('intel response is not an object');
	const obj = raw as Record<string, unknown>;
	if (typeof obj.proposals !== 'object' || obj.proposals === null || Array.isArray(obj.proposals)) {
		throw new Error('intel: proposals must be an object');
	}
	const proposals = obj.proposals as Record<string, unknown>;
	// Verify each requested layer is present and its value is a valid kind or null.
	for (const name of layerNames) {
		if (!(name in proposals)) throw new Error(`intel: missing proposal for layer ${name}`);
		const v = proposals[name];
		if (v !== null && !VALID_KINDS.has(v as string)) {
			throw new Error(`intel: invalid kind '${String(v)}' for layer ${name}`);
		}
	}
	return {
		proposals: proposals as Record<string, KindEnum | null>,
		model: normalizeModel(obj.model as string),
		prompt_version: typeof obj.prompt_version === 'string' ? obj.prompt_version : 'unknown',
		validation_pass: obj.validation_pass === true,
	};
}

export async function proposeLayerKinds(args: {
	layerNames: string[];
	correlationId?: string;
}): Promise<IntelProposalsResult> {
	const estimator = getEstimator();
	const correlationId = args.correlationId ?? `est-${crypto.randomUUID()}`;
	const endpoint = '/intel/layer-proposals';

	const payload = JSON.stringify({
		layer_names: args.layerNames,
		correlation_id: correlationId,
	});

	log('estimator_fetch_start', {
		endpoint,
		correlation_id: correlationId,
		layer_count: args.layerNames.length,
	});
	const start = Date.now();

	const resp = await estimator.fetch(
		new Request(`https://estimator/intel/layer-proposals`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-airio-correlation-id': correlationId,
			},
			body: payload,
		}),
	);

	const durationMs = Date.now() - start;
	log('estimator_fetch_done', {
		endpoint,
		correlation_id: correlationId,
		duration_ms: durationMs,
		status: resp.status,
	});

	if (!resp.ok) {
		const raw = await resp.text();
		let detail: unknown;
		try { detail = JSON.parse(raw); } catch { detail = raw; }
		throw new EstimatorError(`proposeLayerKinds failed: ${resp.status}`, resp.status, correlationId, detail);
	}

	const raw = await resp.json();
	try {
		return validateIntelProposals(raw, args.layerNames);
	} catch (err) {
		// Per ai-output-handling.md §2: on schema failure, return safe fallback (all null).
		log('estimator_intel_validation_fail', {
			endpoint,
			correlation_id: correlationId,
			error: String(err),
		});
		return {
			proposals: Object.fromEntries(args.layerNames.map((n) => [n, null])),
			model: normalizeModel((raw as Record<string, unknown>)?.model as string),
			prompt_version: 'fallback',
			validation_pass: false,
		};
	}
}

export class EstimatorError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly correlationId: string,
		public readonly detail: unknown,
	) {
		super(message);
		this.name = 'EstimatorError';
	}
}
