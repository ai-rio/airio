# Codebase Graph Rule — Use graphify Before Wide-Scope Work

A persistent knowledge graph of this codebase lives at `graphify-out/`. Consult it before broad refactors, architecture questions, or audits — it's faster than re-reading files and surfaces non-obvious connections.

## When to consult the graph

Read the graph **before**:
- Cross-cutting refactors (renames, module moves, API changes)
- Audits ("is X still used?", "what calls Y?")
- Architecture questions ("how does feature Z hang together?")
- Pivot/cleanup work (orphan detection, dead code triage)
- Onboarding to an unfamiliar subsystem

Skip the graph for:
- Single-file edits with clear scope
- Bug fixes when you already know the file
- Trivial UI tweaks

## Files

| Path | Purpose |
|---|---|
| `graphify-out/graph.json` | Raw NetworkX graph (nodes, edges, confidence tags) |
| `graphify-out/GRAPH_REPORT.md` | God nodes, surprising connections, suggested questions |
| `graphify-out/graph.html` | Interactive viz — open in browser |
| `graphify-out/manifest.json` | File hashes for incremental updates |
| `graphify-out/cache/` | Per-file extraction cache (do not edit) |

## Commands

```bash
# Full rebuild (after big restructures, branch switches with many file changes)
/graphify

# Incremental update (after a few file changes)
/graphify --update

# Query the graph in plain language
/graphify query "how does the audit credit flow work"

# Find shortest path between two concepts
/graphify path "DodoPayments webhook" "credits table"

# Explain one node and its connections
/graphify explain "runAudit"
```

## Reading the graph (without /graphify commands)

If running `/graphify query` is overkill, read directly:

1. **Need an entry point?** Open `GRAPH_REPORT.md` → "God Nodes" section. Most-connected nodes are the real abstractions.
2. **Wondering what bridges two areas?** Search the report's "Surprising Connections" — INFERRED edges between communities surface non-obvious couplings.
3. **Looking for orphans?** Any source_file appearing only in tiny components (size 1-5) is likely either dead code or graph blind spot — verify before deleting.

## Graph blind spots (false orphans)

Treat as live until grep proves otherwise:

- **Convex API string paths** — AST cannot follow `api.X.Y.Z` or `internal.X.Y` calls. Files in `convex/` may show as orphans but be wired via these strings. Always grep `api\.<name>\|internal\.<name>` before declaring dead.
- **Next.js file-system routing** — Files at `app/**/page.tsx`, `middleware.ts`, `route.ts` are auto-loaded by convention, no import edge.
- **JSX component imports** — Some prop-only or JSX-only usages aren't picked up.
- **MDX content + fumadocs** — `site/content/**/*.mdx` loaded by content-collection, no static import.

When the graph says "orphan", grep before acting.

## Maintenance

- Rebuild after architectural changes (`/graphify` or `/graphify --update`)
- Stale graphs are worse than no graph — if `manifest.json` is older than 1 week or HEAD has moved >50 commits since last build, refresh first
- `graphify-out/` is gitignored intentionally — local artifact, not shared

## Why this rule exists

The graph turns the codebase into a navigable map. Without it, you re-read the same files every conversation and miss cross-cutting couplings (e.g. that `handleAddCredits` is the seam between Convex actions and mutations enforced by the credit-billing-integrity rule). With it, audits go from hours to minutes and orphan detection becomes a single command.
