/**
 * EstimatorContainer — auxiliary Worker that owns the Python estimator Container.
 *
 * Wired in as an auxiliary Worker by `astro.config.mjs` (auxiliaryWorkers). The main
 * Astro Worker reaches this one via the `ESTIMATOR` service binding (see the root
 * wrangler.jsonc). The flow:
 *
 *   Astro Worker (src/lib/estimator.ts adapter)
 *     ──fetch──▶ this Worker
 *                  │  1. read PDF bytes from R2 by r2_key
 *                  │  2. forward bytes as request body to the Container DO
 *                  │  3. capture estimator_fetch_start|done logs on this side
 *                  ▼
 *                Container DO (Python uvicorn @ port 8080 from estimator/Dockerfile)
 *                  │  4. middleware emits container_request_start|done logs
 *                  ▼
 *                returns JSON to Astro
 *
 * Two-sided instrumentation is non-negotiable per
 * docs/spec/backend-persistence-plan.md "Two-sided instrumentation" — the delta
 * between estimator_fetch_start (here) and container_request_start (Python side)
 * is the only way to see container cold-start cost.
 *
 * Per @cloudflare/containers docs: the Container class wraps the Durable Object
 * interface and exposes a higher-level fetch() that boots+routes automatically.
 */
import { Container, getContainer } from '@cloudflare/containers';

interface Env {
  CONTAINER: DurableObjectNamespace<EstimatorContainer>;
  PDFS: R2Bucket;
}

export class EstimatorContainer extends Container<Env> {
  defaultPort = 8080;     // matches estimator/Dockerfile EXPOSE 8080 (uvicorn)
  sleepAfter = '5m';      // hibernate after 5 min idle (takeoffs are bursty)
  // Use Record<string,string> to satisfy the base class's index-signature
  // expectation (literal { PYTHONUNBUFFERED: string } narrows too strictly).
  envVars: Record<string, string> = {
    PYTHONUNBUFFERED: '1',
  };
}

interface ExtractScaleBody {
  r2_key: string;
  page_index?: number;
  correlation_id?: string;
}

interface ExtractLayersBody {
  r2_key: string;
  page_index?: number;
  correlation_id?: string;
}

interface IntelLayerProposalsBody {
  layer_names: string[];
  correlation_id?: string;
}

function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ts_ms: Date.now(), ...fields }));
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function handleExtractScale(request: Request, env: Env): Promise<Response> {
  let body: ExtractScaleBody;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Body must be JSON');
  }
  const { r2_key, page_index = 0 } = body;
  if (typeof r2_key !== 'string' || !r2_key) {
    return jsonError(400, 'missing_r2_key', 'r2_key (string) is required');
  }
  if (!Number.isInteger(page_index) || page_index < 0) {
    return jsonError(400, 'invalid_page_index', 'page_index must be non-negative integer');
  }

  const correlationId = body.correlation_id ?? request.headers.get('x-airio-correlation-id') ?? `aux-${crypto.randomUUID()}`;

  // 1. Fetch PDF bytes from R2.
  log('aux_r2_get_start', { r2_key, correlation_id: correlationId });
  const r2Start = Date.now();
  const obj = await env.PDFS.get(r2_key);
  if (!obj) {
    log('aux_r2_get_miss', { r2_key, correlation_id: correlationId, duration_ms: Date.now() - r2Start });
    return jsonError(404, 'r2_not_found', `R2 key not found: ${r2_key}`);
  }
  const bytes = await obj.arrayBuffer();
  log('aux_r2_get_done', {
    r2_key,
    correlation_id: correlationId,
    duration_ms: Date.now() - r2Start,
    bytes: bytes.byteLength,
  });

  // 2. Forward bytes to container DO. Pin to single instance keyed by endpoint
  //    so concurrent requests share a warm container.
  const containerUrl = new URL(request.url);
  containerUrl.pathname = `/extract/scale`;
  containerUrl.searchParams.set('page_index', String(page_index));

  log('aux_container_fetch_start', {
    endpoint: '/extract/scale',
    correlation_id: correlationId,
  });
  const fetchStart = Date.now();
  const containerResp = await getContainer(env.CONTAINER, '/extract/scale').fetch(
    new Request(containerUrl.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/pdf',
        'x-airio-correlation-id': correlationId,
      },
      body: bytes,
    }),
  );
  log('aux_container_fetch_done', {
    endpoint: '/extract/scale',
    correlation_id: correlationId,
    duration_ms: Date.now() - fetchStart,
    status: containerResp.status,
  });

  // 3. Return container response verbatim, propagating correlation header.
  // `new Headers(containerResp.headers)` is required: the Headers object copied
  // from an upstream Response can be frozen/immutable, causing `.set()` to
  // silently no-op. Always clone into a mutable Headers before mutating.
  const passthrough = new Response(containerResp.body, {
    status: containerResp.status,
    headers: new Headers(containerResp.headers),
  });
  passthrough.headers.set('x-airio-correlation-id', correlationId);
  return passthrough;
}

async function handleExtractLayers(request: Request, env: Env): Promise<Response> {
  let body: ExtractLayersBody;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Body must be JSON');
  }
  const { r2_key, page_index = 0 } = body;
  if (typeof r2_key !== 'string' || !r2_key) {
    return jsonError(400, 'missing_r2_key', 'r2_key (string) is required');
  }
  if (!Number.isInteger(page_index) || page_index < 0) {
    return jsonError(400, 'invalid_page_index', 'page_index must be non-negative integer');
  }

  const correlationId = body.correlation_id ?? request.headers.get('x-airio-correlation-id') ?? `aux-${crypto.randomUUID()}`;

  // 1. Fetch PDF bytes from R2.
  log('aux_r2_get_start', { r2_key, correlation_id: correlationId });
  const r2Start = Date.now();
  const obj = await env.PDFS.get(r2_key);
  if (!obj) {
    log('aux_r2_get_miss', { r2_key, correlation_id: correlationId, duration_ms: Date.now() - r2Start });
    return jsonError(404, 'r2_not_found', `R2 key not found: ${r2_key}`);
  }
  const bytes = await obj.arrayBuffer();
  log('aux_r2_get_done', {
    r2_key,
    correlation_id: correlationId,
    duration_ms: Date.now() - r2Start,
    bytes: bytes.byteLength,
  });

  // 2. Forward bytes to container DO.
  const containerUrl = new URL(request.url);
  containerUrl.pathname = `/extract/layers`;
  containerUrl.searchParams.set('page_index', String(page_index));

  log('aux_container_fetch_start', {
    endpoint: '/extract/layers',
    correlation_id: correlationId,
  });
  const fetchStart = Date.now();
  const containerResp = await getContainer(env.CONTAINER, '/extract/layers').fetch(
    new Request(containerUrl.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/pdf',
        'x-airio-correlation-id': correlationId,
      },
      body: bytes,
    }),
  );
  log('aux_container_fetch_done', {
    endpoint: '/extract/layers',
    correlation_id: correlationId,
    duration_ms: Date.now() - fetchStart,
    status: containerResp.status,
  });

  // 3. Return container response verbatim with correlation header.
  const passthrough = new Response(containerResp.body, {
    status: containerResp.status,
    headers: new Headers(containerResp.headers),
  });
  passthrough.headers.set('x-airio-correlation-id', correlationId);
  return passthrough;
}

async function handleIntelLayerProposals(request: Request, env: Env): Promise<Response> {
  let body: IntelLayerProposalsBody;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Body must be JSON');
  }
  if (!Array.isArray(body.layer_names) || body.layer_names.length === 0) {
    return jsonError(400, 'missing_layer_names', 'layer_names must be a non-empty array');
  }

  const correlationId = body.correlation_id ?? request.headers.get('x-airio-correlation-id') ?? `aux-${crypto.randomUUID()}`;

  // Pure JSON passthrough — no R2 fetch needed.
  const containerUrl = new URL(request.url);
  containerUrl.pathname = `/intel/layer-proposals`;

  log('aux_container_fetch_start', {
    endpoint: '/intel/layer-proposals',
    correlation_id: correlationId,
    layer_count: body.layer_names.length,
  });
  const fetchStart = Date.now();
  const containerResp = await getContainer(env.CONTAINER, '/intel/layer-proposals').fetch(
    new Request(containerUrl.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-airio-correlation-id': correlationId,
      },
      body: JSON.stringify({ layer_names: body.layer_names }),
    }),
  );
  log('aux_container_fetch_done', {
    endpoint: '/intel/layer-proposals',
    correlation_id: correlationId,
    duration_ms: Date.now() - fetchStart,
    status: containerResp.status,
  });

  const passthrough = new Response(containerResp.body, {
    status: containerResp.status,
    headers: new Headers(containerResp.headers),
  });
  passthrough.headers.set('x-airio-correlation-id', correlationId);
  return passthrough;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/extract/scale') {
      return handleExtractScale(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/extract/layers') {
      return handleExtractLayers(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/intel/layer-proposals') {
      return handleIntelLayerProposals(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/healthz') {
      // Bounce to container for a real readiness check, but cheap path is OK here.
      return new Response(JSON.stringify({ ok: true, role: 'aux' }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    return jsonError(404, 'route_not_found', `No handler for ${request.method} ${url.pathname}`);
  },
};
