// GET /api/projects/[id] — fetch one project (used for SSR header + breadcrumb).

import type { APIRoute } from 'astro';
import { loadProject, jsonError, jsonOk } from '../../../../lib/projects';

export const GET: APIRoute = async ({ params }) => {
	const id = String(params.id ?? '');
	const project = await loadProject(id);
	if (!project) return jsonError(404, 'not_found', 'Project not found');
	return jsonOk(project);
};
