// /api/projects/[id]/sheets/[sheet_id]/pdf — read-only PDF byte proxy.
//
// GET → application/pdf streamed from R2 bucket PDFS at pdf/{projectId}/{sheetId}.pdf
//
// Headers:
//   Cache-Control: public, max-age=31536000, immutable
//     PDF bytes never mutate — sheetId is content-stable (audit_log captures replacements
//     as new rows). Immutable cache cuts R2 egress on repeated phase navigation.
//   ETag: from R2 object httpEtag
//
// 404 if sheet row missing or R2 object missing.
//
// Required by client-side PDF viewers (pdfjs-dist / mupdf) — visual-first
// principle: every screen renders the source PDF, not just its metadata.

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { and, eq } from 'drizzle-orm';
import { sheets } from '../../../../../../../db/schema';
import { getDb } from '../../../../../../lib/db';
import { loadProject, jsonError } from '../../../../../../lib/projects';

export const GET: APIRoute = async ({ params }) => {
	const projectId = String(params.id ?? '');
	const sheetId = String(params.sheet_id ?? '');

	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	const db = getDb();
	const rows = await db
		.select({ id: sheets.id, filename: sheets.filename })
		.from(sheets)
		.where(and(eq(sheets.id, sheetId), eq(sheets.projectId, projectId)))
		.limit(1);
	if (rows.length === 0) return jsonError(404, 'not_found', 'Sheet not found in this project');

	const bucket = (env as { PDFS?: R2Bucket }).PDFS;
	if (!bucket) return jsonError(500, 'r2_unavailable', 'R2 binding "PDFS" not available');

	const r2Key = `pdf/${projectId}/${sheetId}.pdf`;
	const obj = await bucket.get(r2Key);
	if (!obj) return jsonError(404, 'r2_not_found', `R2 key not found: ${r2Key}`);

	return new Response(obj.body, {
		status: 200,
		headers: {
			'content-type': 'application/pdf',
			'cache-control': 'public, max-age=31536000, immutable',
			'etag': obj.httpEtag,
			'content-disposition': `inline; filename="${rows[0].filename ?? 'sheet.pdf'}"`,
		},
	});
};
