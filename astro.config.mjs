// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    // The Python estimator Container lives in its own Worker (CF Containers are
    // DO-backed; the auxiliary Worker exports the EstimatorContainer DO class).
    // Astro's main Worker reaches it via the ESTIMATOR service binding in
    // wrangler.jsonc; this entry tells Astro/Wrangler to build & bind it together.
    auxiliaryWorkers: [
      { configPath: './workers/estimator-container/wrangler.jsonc' },
    ],
  }),
});
