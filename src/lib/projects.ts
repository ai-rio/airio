// Shared helpers for project-scoped routes.
// Resolves :id param → projects row, returns 404 if not found.

import { eq } from 'drizzle-orm';
import { projects, sheets } from '../../db/schema';
import { getDb, type AirioDb } from './db';

export type Project = typeof projects.$inferSelect;

// Sheet row WITHOUT layers_json — for hot reads in preparacao/index.astro and
// other screens that don't need the ~500kB BLOB. Per dev-workflow.md §5: project
// helpers have no Astro/Hono/Worker imports.
export type SheetForPhase = Omit<typeof sheets.$inferSelect, 'layersJson'>;

export async function loadProject(id: string): Promise<Project | null> {
	if (!id) return null;
	const db = getDb();
	const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
	return rows[0] ?? null;
}

/**
 * Load sheets for a project, explicitly EXCLUDING layers_json.
 * Use this in any screen that doesn't need the layer inventory BLOB — avoids
 * pulling potentially large JSON into memory on every page visit.
 *
 * Optional `kinds` filter: pass a non-empty array to restrict to specific sheet kinds.
 */
export async function loadSheetsForPhase(
	db: AirioDb,
	projectId: string,
	kinds?: Array<'planta_forca' | 'iluminacao' | 'quadro' | 'unifilar'>,
): Promise<SheetForPhase[]> {
	const query = db
		.select({
			id: sheets.id,
			projectId: sheets.projectId,
			filename: sheets.filename,
			pageIndex: sheets.pageIndex,
			kind: sheets.kind,
			ignored: sheets.ignored,
			scaleDenom: sheets.scaleDenom,
			scaleSet: sheets.scaleSet,
			scaleSource: sheets.scaleSource,
			layerMappingComplete: sheets.layerMappingComplete,
			qualityScore: sheets.qualityScore,
			qualityRedFlagsJson: sheets.qualityRedFlagsJson,
			createdAt: sheets.createdAt,
		})
		.from(sheets)
		.where(eq(sheets.projectId, projectId));

	const rows = await query;

	if (kinds && kinds.length > 0) {
		return rows.filter((r) => r.kind !== null && kinds.includes(r.kind as typeof kinds[number]));
	}
	return rows;
}

export function jsonError(status: number, code: string, message: string): Response {
	return new Response(JSON.stringify({ error: code, message }), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export function jsonOk<T>(data: T, status = 200, extraHeaders: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json', ...extraHeaders },
	});
}

export { eq, projects, getDb, type AirioDb };
