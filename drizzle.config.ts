import type { Config } from 'drizzle-kit';

export default {
	schema: './db/schema.ts',
	out: './migrations',
	dialect: 'sqlite',
	driver: 'd1-http',
	// d1-http driver lets `drizzle-kit studio` and `drizzle-kit push` reach D1 directly.
	// For migration generation (the path we use), only `schema` + `out` are required.
	// dbCredentials kept empty here; `wrangler d1 migrations apply` reads its own binding
	// from wrangler.jsonc and is the canonical apply path.
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
		databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? '',
		token: process.env.CLOUDFLARE_API_TOKEN ?? '',
	},
} satisfies Config;
