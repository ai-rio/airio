// Shared helpers for project-scoped routes.
// Resolves :id param → projects row, returns 404 if not found.

import { eq } from 'drizzle-orm';
import { projects } from '../../db/schema';
import { getDb, type AirioDb } from './db';

export type Project = typeof projects.$inferSelect;

export async function loadProject(id: string): Promise<Project | null> {
	if (!id) return null;
	const db = getDb();
	const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
	return rows[0] ?? null;
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
