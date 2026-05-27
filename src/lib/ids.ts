// ID generation for D1 primary keys.
//
// Using `crypto.randomUUID()` (Web Crypto, built into CF Workers runtime + Node 19+).
// 36 chars (incl. dashes). Not time-sortable, but every row carries `created_at` so
// chronological ordering uses that index. ksuid (sortable) is the upgrade path if
// `ORDER BY id` ever becomes a hot query and joining created_at is too expensive.
//
// Per docs/spec/backend-persistence-plan.md DBA review: TEXT primary keys are
// correct at this scale.

export function newId(): string {
	return crypto.randomUUID();
}
