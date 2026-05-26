/**
 * /api/takeoff — Astro endpoint that forwards a PDF upload to the Python estimator.
 *
 * Wiring (per the wedge lock + CF Containers docs):
 *   POST /api/takeoff  (Astro)
 *      └─ env.ESTIMATOR (service binding, wrangler.jsonc)
 *           └─ airio-estimator-container Worker (workers/estimator-container/)
 *                └─ EstimatorContainer DO (extends @cloudflare/containers Container)
 *                     └─ Python uvicorn @ :8080 (estimator/Dockerfile → app_ele.py)
 *
 * This is the wire only — no UI yet. The endpoint proxies the incoming request to
 * the container and returns its response. Once Carlos walks his real takeoff
 * workflow, screens replace src/pages/index.astro and drive this endpoint.
 */
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as { runtime?: { env?: { ESTIMATOR?: { fetch: (req: Request) => Promise<Response> } } } }).runtime;
  const estimator = runtime?.env?.ESTIMATOR;
  if (!estimator) {
    return new Response(
      JSON.stringify({
        error: 'ESTIMATOR service binding not available',
        hint: 'Service binding configured in wrangler.jsonc + workers/estimator-container/. Available in `wrangler dev` and prod, not in `astro dev` without the CF Vite plugin runtime.',
      }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }
  return estimator.fetch(request);
};

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      ok: true,
      endpoint: '/api/takeoff',
      hint: 'POST a PDF (multipart/form-data) here. Reaches the Python estimator Container via the ESTIMATOR service binding.',
    }),
    { headers: { 'content-type': 'application/json' } }
  );
