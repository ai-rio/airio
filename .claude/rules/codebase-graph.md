# Codebase Graph Rule — Use graphify Before Wide-Scope Work

A persistent knowledge graph of this codebase lives at `graphify-out/`. Consult it before broad refactors, architecture questions, or audits — it's faster than re-reading files and surfaces non-obvious connections (especially across the 13 `estimator/` modules + the legacy Tagsmith tree still on disk).

## When to consult the graph

Read the graph **before**:
- Cross-cutting refactors (renaming an analyzer kind, moving config seams between `glossary.py` / `header_glossary.py` / `abnt.py`, changing `points.BOTICARIO_POINTS` shape)
- Audits ("is `count.py` still called?", "what reads `points_tags.json`?", "does anything still import from `convex/`?")
- Architecture questions ("how does the takeoff pipeline hang together end-to-end?", "what does `reconcile.py` depend on?")
- Pivot/cleanup work — Tagsmith-era code (`site/`, `dashboard/`, `convex/`) is dormant; the graph helps confirm whether a Python module still references it
- Onboarding a new analyzer or the Astro UI build to the existing plumbing

Skip the graph for:
- Single-file edits with clear scope
- Bug fixes when you already know the file
- Trivial doc tweaks

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
/graphify query "how does quadro_pontos join planta positions to circuits"

# Find shortest path between two concepts
/graphify path "BOTICARIO_POINTS" "regionselect.html"

# Explain one node and its connections
/graphify explain "quadro_pontos.tally_board"
```

## Reading the graph (without /graphify commands)

If running `/graphify query` is overkill, read directly:

1. **Need an entry point?** Open `GRAPH_REPORT.md` → "God Nodes" section. Most-connected nodes are the real abstractions (probably `points.count_points`, `quadro_pontos.extract_circuits`, `ele.metragem`, `schedule.aggregate`).
2. **Wondering what bridges two areas?** Search "Surprising Connections" — INFERRED edges between communities surface non-obvious couplings (e.g. `regionselect.py` reaching into both `points.py` AND `quadro_pontos.py`).
3. **Looking for orphans?** Any source_file appearing only in tiny components (size 1-5) is likely either dead code or a graph blind spot — verify before deleting. `count.py` is a known legacy candidate; `app.py` / `app_ele.py` are FastAPI HTML probes per the lock, not the product.

## Graph blind spots (false orphans)

Treat as live until grep proves otherwise:

- **Python config-string lookups** — AST cannot follow `BOTICARIO_POINTS["ELE_ST"]`, `COLS["nome"]`, `header_glossary` dict lookups, etc. Modules referenced by string keys may show as weakly connected. Grep the literal key before declaring dead.
- **pytest fixtures** — fixtures in `conftest.py` (`boticario_pe06`, `senac_ele`, etc.) are injected by name; AST may not pick them up. Grep the fixture name.
- **CLI entry points** — `if __name__ == "__main__":` blocks at the bottom of each analyzer module; the `main()` function is invoked from the shell, not from another module. Don't flag these as orphans.
- **PyMuPDF API surface** — `fitz.Page.get_drawings()` / `get_text()` / `find_tables()` are runtime calls, not import edges; module dependencies on `fitz` may understate the actual coupling to PDF structure.
- **Tagsmith-era cruft** (`site/`, `dashboard/`, `convex/`) — large and disconnected; the graph will show low-edge components there. They ARE dead (per the wedge lock); orphan signals there are accurate, not blind spots.

When the graph says "orphan", grep before acting.

## Maintenance

- Rebuild after architectural changes (`/graphify` or `/graphify --update`)
- Stale graphs are worse than no graph — if `manifest.json` is older than 1 week or HEAD has moved >50 commits since last build, refresh first
- `graphify-out/` is gitignored intentionally — local artifact, not shared

## Why this rule exists

The graph turns the codebase into a navigable map. Without it, you re-read the same files every conversation and miss cross-cutting couplings (e.g., that `regionselect.py` is the seam between `points.py` planta positions and `quadro_pontos.tally_board` quadro counts, or that `intel_points.py`'s output schema must align with `BOTICARIO_POINTS` for the config-emission path to work). With it, audits go from hours to minutes.
