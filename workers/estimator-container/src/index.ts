/**
 * EstimatorContainer — auxiliary Worker that owns the Python estimator Container.
 *
 * Wired in as an auxiliary Worker by `astro.config.mjs` (auxiliaryWorkers). The main
 * Astro Worker reaches this one via the `ESTIMATOR` service binding (see the root
 * wrangler.jsonc). Carlos's PDFs come in via the Astro `/api/takeoff` endpoint,
 * which forwards the request here; this Worker proxies to the Container DO, which
 * boots / wakes the Python uvicorn process (estimator/app_ele.py, port 8080) and
 * runs the analyzers (ele, schedule, points, quadro_pontos).
 *
 * Per @cloudflare/containers docs: the Container class wraps the Durable Object
 * interface and exposes a higher-level fetch() that boots+routes automatically.
 */
import { Container, getContainer } from '@cloudflare/containers';

interface Env {
  CONTAINER: DurableObjectNamespace<EstimatorContainer>;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // v1: pin to a single instance keyed by URL pathname so concurrent takeoffs
    // for the same casa/PDF land on the same container. Once the Astro UI lands
    // session IDs, key by session ID for per-takeoff isolation.
    const url = new URL(request.url);
    return getContainer(env.CONTAINER, url.pathname).fetch(request);
  },
};
