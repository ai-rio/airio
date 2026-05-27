// Audit logging — HITL trust evidence per docs/spec/backend-persistence-plan.md
// and .claude/rules/observability.md.
//
// Every write to per-project state calls `writeAudit()` after the mutation
// commits. Two side effects:
//   1. INSERT into audit_log (D1) — lightweight metadata row
//   2. PUT to R2 bucket "PDFS" at audit/{session_id}/{audit_id}.json — the
//      before/after JSON blob (kept out of D1 to avoid 1MB row limit + JSON
//      column scan cost per database-administrator review).
//
// Session correlation: caller passes session_id from request header
// `X-Airio-Session`. The client (browser) generates one on first visit +
// persists in localStorage. Server-side session table can be added later if
// needed; not required for S1-S3 wire.

import { env } from 'cloudflare:workers';
import { auditLog } from '../../db/schema';
import { newId } from './ids';
import type { AirioDb } from './db';

export interface AuditPayload {
	sessionId: string;
	projectId: string;
	action: string;
	targetTable: string;
	targetId: string;
	before: unknown;
	after: unknown;
	user?: string | null;
	correlationId?: string | null;
}

/**
 * Persist an audit_log row + matching R2 blob. Call AFTER the mutation
 * commits (audit failure must not roll back the user action — log + carry on).
 *
 * Returns the audit row's id so callers can include it in response headers
 * for trace correlation.
 */
export async function writeAudit(db: AirioDb, payload: AuditPayload): Promise<string> {
	const bucket = (env as { PDFS?: R2Bucket }).PDFS;
	if (!bucket) {
		throw new Error(
			'R2 binding "PDFS" not available on cloudflare:workers env. ' +
				'Audit logging requires R2 to persist before/after blobs.',
		);
	}

	const id = newId();
	const ts = Date.now();
	const r2KeyBefore =
		payload.before === null || payload.before === undefined
			? null
			: `audit/${payload.sessionId}/${id}.before.json`;
	const r2KeyAfter = `audit/${payload.sessionId}/${id}.after.json`;

	// 1. Write blobs to R2 first (cheap if it fails — no D1 row yet).
	const writes: Promise<R2Object | null>[] = [
		bucket.put(r2KeyAfter, JSON.stringify(payload.after)),
	];
	if (r2KeyBefore !== null) {
		writes.push(bucket.put(r2KeyBefore, JSON.stringify(payload.before)));
	}
	await Promise.all(writes);

	// 2. Insert audit row in D1.
	await db.insert(auditLog).values({
		id,
		sessionId: payload.sessionId,
		projectId: payload.projectId,
		ts,
		user: payload.user ?? null,
		action: payload.action,
		targetTable: payload.targetTable,
		targetId: payload.targetId,
		r2KeyBefore,
		r2KeyAfter,
		correlationId: payload.correlationId ?? payload.sessionId,
	});

	return id;
}

/**
 * Extract session_id from request headers. Generate a fallback if missing so
 * a one-off curl request still produces an audit trail. Client browsers
 * should persist their own session_id in localStorage and send it on every
 * request via `X-Airio-Session`.
 */
export function getSessionId(request: Request): string {
	return request.headers.get('X-Airio-Session') ?? `anon-${newId()}`;
}
