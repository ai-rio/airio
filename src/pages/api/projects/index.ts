// POST /api/projects — create a new project (S1 Cadastro wire).
//
// Per docs/spec/backend-persistence-plan.md Phase 4. Pure Astro+D1, no
// container call. Side effects: insert projects row + audit_log row +
// R2 blob with the created entity.
//
// Request:  { name: string }
// Response: 201 { id, name, currentPhase, status, createdAt, updatedAt }
//
// GET /api/projects — list projects (admin / debugging; sorted by createdAt desc).

import type { APIRoute } from 'astro';
import { projects } from '../../../../db/schema';
import { desc } from 'drizzle-orm';
import { getDb } from '../../../lib/db';
import { newId } from '../../../lib/ids';
import { writeAudit, getSessionId } from '../../../lib/audit';

interface CreateProjectBody {
	name?: unknown;
}

export const POST: APIRoute = async ({ request }) => {
	let body: CreateProjectBody;
	try {
		body = await request.json();
	} catch {
		return jsonError(400, 'invalid_json', 'Request body must be JSON');
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) {
		return jsonError(400, 'invalid_name', '`name` is required (non-empty string)');
	}
	if (name.length > 200) {
		return jsonError(400, 'invalid_name', '`name` exceeds 200 characters');
	}

	const db = getDb();
	const sessionId = getSessionId(request);
	const id = newId();
	const ts = Date.now();

	const row = {
		id,
		name,
		currentPhase: 1 as const, // S1 Cadastro just completed → next mental phase is still 1 until S2 starts
		status: 'EFETUANDO' as const,
		createdAt: ts,
		updatedAt: ts,
	};

	await db.insert(projects).values(row);

	// Audit trail (per observability.md — record every HITL write).
	await writeAudit(db, {
		sessionId,
		projectId: id,
		action: 'create_project',
		targetTable: 'projects',
		targetId: id,
		before: null,
		after: row,
	});

	return new Response(JSON.stringify(row), {
		status: 201,
		headers: {
			'content-type': 'application/json',
			'x-airio-session': sessionId,
		},
	});
};

export const GET: APIRoute = async () => {
	const db = getDb();
	const rows = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(50);
	return new Response(JSON.stringify({ projects: rows }), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
};

function jsonError(status: number, code: string, message: string): Response {
	return new Response(JSON.stringify({ error: code, message }), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}
