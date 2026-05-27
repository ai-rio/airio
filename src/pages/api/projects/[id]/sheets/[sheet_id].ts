// /api/projects/[id]/sheets/[sheet_id] — S3 Triagem backend.
//
//   PATCH application/json { kind?: <enum|null>, ignored?: 0|1 }
//         Updates the matching sheets row + writes audit_log + R2 before/after
//         blob via writeAudit(). Returns 200 with the updated row.
//
// Per docs/spec/backend-persistence-plan.md Phase 6 (S3 wire). Per
// .claude/rules/dev-workflow.md §5 (one endpoint file per resource shape —
// PATCH on a single sheet is a different shape than POST/GET on the collection,
// so it gets its own file rather than folding into sheets.ts).

import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { sheets } from '../../../../../../db/schema';
import { getDb } from '../../../../../lib/db';
import { writeAudit, getSessionId } from '../../../../../lib/audit';
import { loadProject, jsonError, jsonOk } from '../../../../../lib/projects';

const KIND_VALUES = ['planta_forca', 'iluminacao', 'quadro', 'unifilar'] as const;
type Kind = (typeof KIND_VALUES)[number];

interface PatchBody {
	kind?: Kind | null;
	ignored?: 0 | 1;
}

function validateBody(raw: unknown): { ok: true; body: PatchBody } | { ok: false; message: string } {
	if (!raw || typeof raw !== 'object') {
		return { ok: false, message: 'Body must be a JSON object' };
	}
	const obj = raw as Record<string, unknown>;
	const out: PatchBody = {};

	if ('kind' in obj) {
		const k = obj.kind;
		if (k === null) {
			out.kind = null;
		} else if (typeof k === 'string' && (KIND_VALUES as readonly string[]).includes(k)) {
			out.kind = k as Kind;
		} else {
			return {
				ok: false,
				message: `kind must be null or one of: ${KIND_VALUES.join(', ')}`,
			};
		}
	}

	if ('ignored' in obj) {
		const i = obj.ignored;
		if (i !== 0 && i !== 1) {
			return { ok: false, message: 'ignored must be 0 or 1' };
		}
		out.ignored = i;
	}

	if (Object.keys(out).length === 0) {
		return { ok: false, message: 'No mutable fields supplied (expected kind and/or ignored)' };
	}

	return { ok: true, body: out };
}

export const PATCH: APIRoute = async ({ params, request }) => {
	const projectId = String(params.id ?? '');
	const sheetId = String(params.sheet_id ?? '');

	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return jsonError(400, 'invalid_json', 'Body must be JSON');
	}

	const v = validateBody(raw);
	if (!v.ok) return jsonError(400, 'invalid_body', v.message);

	const db = getDb();

	const existing = await db
		.select()
		.from(sheets)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)))
		.limit(1);

	if (existing.length === 0) {
		return jsonError(404, 'not_found', 'Sheet not found in this project');
	}
	const before = existing[0];

	const patch: Partial<typeof sheets.$inferInsert> = {};
	if ('kind' in v.body) patch.kind = v.body.kind ?? null;
	if ('ignored' in v.body) patch.ignored = v.body.ignored;

	await db
		.update(sheets)
		.set(patch)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)));

	const after = { ...before, ...patch };

	const sessionId = getSessionId(request);
	await writeAudit(db, {
		sessionId,
		projectId,
		action: 'triagem_patch_sheet',
		targetTable: 'sheets',
		targetId: sheetId,
		before,
		after,
	});

	return jsonOk(
		{ project_id: projectId, sheet: after },
		200,
		{ 'x-airio-session': sessionId },
	);
};
