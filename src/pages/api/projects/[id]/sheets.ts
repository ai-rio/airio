// /api/projects/[id]/sheets — S2 Documentos backend.
//
//   POST  multipart/form-data, files[] field "files":
//         For each file: PUT to R2 at `pdf/{project_id}/{sheet_id}.pdf` +
//         INSERT into sheets table + audit_log row. Returns 201 with the
//         list of newly created sheet rows.
//
//   GET   List all sheets for the project, ordered by createdAt asc.
//
// Per docs/spec/backend-persistence-plan.md scope cut (S1-S3 wire). Each
// uploaded PDF becomes ONE sheets row with page_index=0 placeholder. The
// container will later expand multi-page PDFs into per-page rows during
// extract phases (S4 scale / S6 layers / S7 quadro / S9 count).

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { asc, eq } from 'drizzle-orm';
import { sheets } from '../../../../../db/schema';
import { getDb } from '../../../../lib/db';
import { newId } from '../../../../lib/ids';
import { writeAudit, getSessionId } from '../../../../lib/audit';
import { loadProject, jsonError, jsonOk } from '../../../../lib/projects';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB safety cap (CF free-tier body limit)
const ACCEPTED_MIME = new Set(['application/pdf']);

export const POST: APIRoute = async ({ params, request }) => {
	const projectId = String(params.id ?? '');
	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch (err) {
		return jsonError(400, 'invalid_multipart', 'Request body must be multipart/form-data');
	}

	// Accept either field name `files` (multi) or `file` (single) for flexibility.
	const fileEntries: File[] = [];
	for (const [key, value] of formData.entries()) {
		if ((key === 'files' || key === 'file') && value instanceof File) {
			fileEntries.push(value);
		}
	}
	if (fileEntries.length === 0) {
		return jsonError(400, 'no_files', 'No files in request (expected field name "files")');
	}

	const bucket = (env as { PDFS?: R2Bucket }).PDFS;
	if (!bucket) {
		return jsonError(500, 'r2_unavailable', 'R2 binding "PDFS" not available');
	}

	const db = getDb();
	const sessionId = getSessionId(request);
	const created: (typeof sheets.$inferSelect)[] = [];
	const errors: { filename: string; code: string; message: string }[] = [];

	for (const file of fileEntries) {
		const filename = file.name || 'unnamed.pdf';

		if (!ACCEPTED_MIME.has(file.type) && !filename.toLowerCase().endsWith('.pdf')) {
			errors.push({ filename, code: 'invalid_type', message: 'Only PDF files are accepted' });
			continue;
		}
		if (file.size === 0) {
			errors.push({ filename, code: 'empty_file', message: 'File is empty' });
			continue;
		}
		if (file.size > MAX_FILE_BYTES) {
			errors.push({ filename, code: 'too_large', message: `File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB` });
			continue;
		}

		const sheetId = newId();
		const r2Key = `pdf/${projectId}/${sheetId}.pdf`;

		await bucket.put(r2Key, file.stream(), {
			httpMetadata: { contentType: 'application/pdf' },
			customMetadata: {
				projectId,
				sheetId,
				originalName: filename,
				uploadedAt: String(Date.now()),
			},
		});

		const row = {
			id: sheetId,
			projectId,
			filename,
			pageIndex: 0, // placeholder — container splits multi-page later
			kind: null,
			scaleDenom: null,
			scaleSet: 0,
			layerMappingComplete: 0,
			qualityScore: null,
			qualityRedFlagsJson: null,
			createdAt: Date.now(),
		};
		await db.insert(sheets).values(row);

		await writeAudit(db, {
			sessionId,
			projectId,
			action: 'upload_sheet',
			targetTable: 'sheets',
			targetId: sheetId,
			before: null,
			after: { ...row, r2Key, sizeBytes: file.size },
		});

		created.push(row as typeof sheets.$inferSelect);
	}

	const body = { project_id: projectId, created, errors };
	const status = created.length > 0 ? 201 : 400;
	return jsonOk(body, status, { 'x-airio-session': sessionId });
};

export const GET: APIRoute = async ({ params }) => {
	const projectId = String(params.id ?? '');
	const project = await loadProject(projectId);
	if (!project) return jsonError(404, 'not_found', 'Project not found');

	const db = getDb();
	const rows = await db
		.select()
		.from(sheets)
		.where(eq(sheets.projectId, projectId))
		.orderBy(asc(sheets.createdAt));

	return jsonOk({ project_id: projectId, sheets: rows });
};
