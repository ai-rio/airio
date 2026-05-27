// Drizzle D1 client factory. Astro v6 + @astrojs/cloudflare exposes the D1
// binding via `import { env } from 'cloudflare:workers'`. Wrap with `drizzle()`
// to enable schema-aware queries against db/schema.ts.
//
// Usage from an Astro API route:
//   import { getDb } from '@/lib/db';
//   const db = getDb();
//   const rows = await db.select().from(projects).all();

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../db/schema';

export type AirioDb = DrizzleD1Database<typeof schema>;

export function getDb(): AirioDb {
	const db = (env as { DB?: D1Database }).DB;
	if (!db) {
		throw new Error(
			'D1 binding "DB" not available on cloudflare:workers env. ' +
				'Check wrangler.jsonc d1_databases binding and that astro.config.mjs uses the @astrojs/cloudflare adapter.',
		);
	}
	return drizzle(db, { schema });
}
