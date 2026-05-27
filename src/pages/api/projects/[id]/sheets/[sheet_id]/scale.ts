// /api/projects/[id]/sheets/[sheet_id]/scale — S4 Escala backend.
//
//   POST application/json
//     - {} or no body → auto-extract via container POST /extract/scale,
//       persist scale_denom + scale_set=1 if found.
//     - { "scale_denom": 50 } → manual override, persist directly (no container call).
//
//   Response: 200 { project_id, sheet, extraction, correlation_id }
//     where extraction = ScaleResult on auto, or { source: "manual" } on override.
//     correlation_id is per-call so callers can paste it into bug reports
//     (see .claude/rules/observability.md §3).
//
// Per docs/spec/backend-persistence-plan.md Phase 7 (S4 wire) +
// .claude/rules/dev-workflow.md §5 (container interactions go through
// src/lib/estimator.ts adapter, NOT inline here).

import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { sheets } from '../../../../../../../db/schema';
import { getDb } from '../../../../../../lib/db';
import { writeAudit, getSessionId } from '../../../../../../lib/audit';
import { loadProject, jsonError, jsonOk } from '../../../../../../lib/projects';
import { extractScale, EstimatorError, type ScaleResult } from '../../../../../../lib/estimator';
import { newId } from '../../../../../../lib/ids';

interface PostBody {
	scale_denom?: number;
}

function validateBody(raw: unknown): { ok: true; body: PostBody } | { ok: false; message: string } {
	if (raw === null || raw === undefined) return { ok: true, body: {} };
	if (typeof raw !== 'object') return { ok: false, message: 'Body must be JSON object' };
	const obj = raw as Record<string, unknown>;
	if (!('scale_denom' in obj)) return { ok: true, body: {} };
	const d = obj.scale_denom;
	if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 5000) {
		return { ok: false, message: 'scale_denom must be integer between 1 and 5000' };
	}
	return { ok: true, body: { scale_denom: d } };
}

export const POST: APIRoute = async ({ params, request }) => {
	const projectId = String(params.id ?? '');
	const sheetId = String(params.sheet_id ?? '');

	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	// Body is optional for the auto-extract path.
	let raw: unknown = null;
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			raw = await request.json();
		} catch {
			return jsonError(400, 'invalid_json', 'Body must be valid JSON');
		}
	}
	const v = validateBody(raw);
	if (!v.ok) return jsonError(400, 'invalid_body', v.message);

	const db = getDb();
	const existing = await db
		.select()
		.from(sheets)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)))
		.limit(1);
	if (existing.length === 0) return jsonError(404, 'not_found', 'Sheet not found in this project');
	const before = existing[0];

	const sessionId = getSessionId(request);
	// #4 — per-call correlationId so two-sided instrumentation (Astro side
	// estimator_fetch_start vs container_request_start) can compute per-call
	// cold-start deltas. Embedding sessionId keeps the audit trail cross-joinable.
	const correlationId = `${sessionId}-${newId()}`;

	let extraction: ScaleResult | { source: 'manual' };
	let scaleDenom: number | null;
	let action: string;

	if (typeof v.body.scale_denom === 'number') {
		scaleDenom = v.body.scale_denom;
		extraction = { source: 'manual' };
		action = 'set_scale_manual';
	} else {
		const r2Key = `pdf/${projectId}/${sheetId}.pdf`;
		const pageIndex = before.pageIndex ?? 0;
		try {
			// #4 — pass per-call correlationId (not the session-level sessionId).
			extraction = await extractScale({ r2Key, pageIndex, correlationId });
		} catch (err) {
			if (err instanceof EstimatorError) {
				// #3 — pass through 4xx verbatim (caller bugs: r2_not_found=404,
				// invalid_json=400, missing_r2_key=400, invalid_page_index=400).
				// Map 5xx / network failures to 502 estimator_failed.
				if (err.status >= 400 && err.status < 500) {
					const d = err.detail;
					const upstreamCode =
						d && typeof d === 'object' && 'error' in d && typeof (d as Record<string, unknown>).error === 'string'
							? (d as Record<string, unknown>).error as string
							: 'upstream_error';
					const upstreamMsg =
						d && typeof d === 'object' && 'message' in d && typeof (d as Record<string, unknown>).message === 'string'
							? (d as Record<string, unknown>).message as string
							: err.message;
					return jsonError(err.status, upstreamCode, upstreamMsg);
				}
				return jsonError(502, 'estimator_failed', err.message);
			}
			throw err;
		}
		scaleDenom = extraction.scale_denom;
		action = scaleDenom != null ? 'extract_scale_auto' : 'extract_scale_not_found';
	}

	// Only flip scale_set=1 when we actually have a denom.
	const patch: Partial<typeof sheets.$inferInsert> = {};
	if (scaleDenom != null) {
		patch.scaleDenom = scaleDenom;
		patch.scaleSet = 1;
	}

	// #BONUS — persist scale_source so the UI can read provenance without a
	// separate roundtrip. Only set when scale is actually being written.
	if (typeof v.body.scale_denom === 'number') {
		// manual override path: scale_denom is already set above; tag source.
		patch.scaleSource = 'manual';
	} else if (scaleDenom != null && 'source' in extraction && extraction.source === 'titleblock_text') {
		// auto-extract success: narrow away 'not_found' — schema only accepts
		// 'titleblock_text' | 'manual' (ScaleResult.source can be 'not_found').
		patch.scaleSource = 'titleblock_text';
	}
	// not_found path: scaleSource stays null (no scale_denom update either).

	if (Object.keys(patch).length > 0) {
		await db
			.update(sheets)
			.set(patch)
			.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)));
	}

	const after = { ...before, ...patch };

	await writeAudit(db, {
		sessionId,
		projectId,
		action,
		targetTable: 'sheets',
		targetId: sheetId,
		before,
		after: { ...after, extraction },
		// #4 — per-call correlationId in audit_log for two-sided delta joins.
		correlationId,
	});

	// #4 — surface correlationId in response body so the browser can paste it
	// into a bug report (per .claude/rules/observability.md §3).
	return jsonOk(
		{ project_id: projectId, sheet: after, extraction, correlation_id: correlationId },
		200,
		{ 'x-airio-session': sessionId },
	);
};
