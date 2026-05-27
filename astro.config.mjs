// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// The Python estimator Container lives in its own Worker (CF Containers are
// DO-backed; the auxiliary Worker exports the EstimatorContainer DO class).
// Astro's main Worker reaches it via the ESTIMATOR service binding in
// wrangler.jsonc; this entry tells Astro/Wrangler to build & bind it together.
//
// Building the container image locally requires `docker buildx`. Opt in by
// running with WITH_CONTAINER=1 (e.g. `bun run dev:full` / `bun run build:full`).
// The default `bun run dev` script skips it so UI work doesn't require Docker.
const includeContainer = process.env.WITH_CONTAINER === '1';

// https://astro.build/config
export default defineConfig({
  // SSR via the Cloudflare adapter. Dynamic routes like /projects/[id]/* need
  // server rendering; opting in globally avoids per-route `export const prerender = false`.
  output: 'server',
  adapter: cloudflare({
    auxiliaryWorkers: includeContainer
      ? [{ configPath: './workers/estimator-container/wrangler.jsonc' }]
      : [],
  }),
});
