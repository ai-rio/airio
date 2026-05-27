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
		let detail: unknown;
		try {
			detail = await resp.json();
		} catch {
			detail = await resp.text();
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
