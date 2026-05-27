# Codebase Graph Rule — Default Discovery Tool

A persistent knowledge graph of this codebase lives at `graphify-out/`. **This is the default tool for any question whose scope is larger than one file.** Faster than re-reading files; surfaces non-obvious connections across the 13 `estimator/` Python modules and the Astro/CF UI layer (`src/`, `workers/estimator-container/`). Grep / glob are second resort — use them to *confirm* what the graph suggests, not to discover what the graph already maps.

## When to consult the graph

Read the graph **before**:
- Cross-cutting refactors (renaming an analyzer kind, moving config seams between `glossary.py` / `header_glossary.py` / `abnt.py`, changing `points.BOTICARIO_POINTS` shape, reshaping the Astro API ↔ Container wire)
- Audits ("is `count.py` still called?", "what reads `points_tags.json`?", "what bridges the Astro pages to the Python analyzers?")
- Architecture questions ("how does the takeoff pipeline hang together end-to-end?", "what does `reconcile.py` depend on?", "which screens in `screen-inventory.md` reference which analyzer module?")
- Cleanup work — confirm a candidate-dead file's community is small and edge-isolated before deleting
- Onboarding a new analyzer or a new Astro screen to the existing plumbing
- Surfacing duplicated rationale across docs (the graph's `semantically_similar_to` edges catch this)

Skip the graph for:
- Single-file edits with clear scope
- Bug fixes when the stack trace already points at the file
- Looking up a literal config-string value (grep is fine here)
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

1. **Need an entry point?** Open `GRAPH_REPORT.md` → "God Nodes" section. Concept-level god nodes (function/section, NOT file-level dummies) are the real abstractions. As of the 2026-05-27 run, the top-10 honest god nodes are dominated by spec docs (`S9 · Planta count workspace`, `Step 5 — Cable schedule quantification`, `Step 6 — Planta counting`, `Zone 6 — Supplier flow`, `Two-Halves Architecture`) alongside code spines (`schedule.py` internals, `_result_html()` in app_ele, `_need()` in conftest). The spec docs ARE the structural spine.
2. **Wondering what bridges two areas?** Read "Surprising Connections" (INFERRED `semantically_similar_to` / `informs` edges between communities surface non-obvious couplings — e.g. duplicate rationale across docs, design language ↔ wedge framing, validation ↔ HITL spec) and the "Hyperedges" section (EXTRACTED group-relationships, fully trustworthy — e.g. "Two halves + reconciler architecture", "Pre-count setup (Scale → Tools Chest → Layers)").
3. **Looking for orphans?** Any source_file appearing only in tiny components (size 1-5) is likely either dead code or a graph blind spot — verify before deleting. `count.py` is a known legacy candidate (per CLAUDE.md, superseded by `points.py`); `app.py` / `app_ele.py` are FastAPI HTML probes per the lock, not the product.

## Trust filter — strip INFERRED + calls before quoting god nodes

The semantic-extraction subagent (Claude reading docstrings + files) generates `INFERRED calls` edges from rich docstrings to every entity the docstring mentions. These are **docstring projections, not actual call relationships**. Discovered 2026-05-27 by tracing `GET()` (47 graph edges, ~1 real call) and `join()` (24 graph edges, 3 real calls) — both were small functions whose docstrings described the wider pipeline, and the subagent projected those mentions into `calls` edges.

Pattern: every `INFERRED + relation=calls` edge between nodes in **different files** is suspect. ~20% of edges (142/823 in the 2026-05-27 graph) were this artifact. After stripping them, communities collapse from 51 → 35 and the honest spine emerges.

**Before quoting a god node, betweenness bridge, or "this connects X to Y" claim from the raw graph:**

```python
# Filter to EXTRACTED-only (+ keep INFERRED non-calls like semantically_similar_to)
import json, networkx as nx
from networkx.readwrite import json_graph
G_raw = json_graph.node_link_graph(json.load(open("graphify-out/graph.json")), edges="links")
G = nx.Graph()
for n, d in G_raw.nodes(data=True): G.add_node(n, **d)
for u, v, d in G_raw.edges(data=True):
    if d.get("confidence") == "INFERRED" and d.get("relation") == "calls":
        continue  # drop hallucinated calls
    G.add_edge(u, v, **d)
G.remove_nodes_from([n for n in G.nodes() if G.degree(n) == 0])
# Now G is the trustworthy graph. Degree, betweenness, communities all honest.
```

Also strip `worker-configuration.d.ts` nodes (degree=42 each from CF's auto-generated type union — pure noise) before reading file-level rankings.

**Trustworthy without filter:** Hyperedges (always EXTRACTED), `rationale_for` edges (docstring→concept, EXTRACTED), `contains` edges (file→node, structural), all AST-derived `imports` / `calls` between code nodes in the same file.

**Suspicious by default:** `INFERRED calls` to cross-file targets, especially when source node has a multi-paragraph docstring describing pipeline architecture.

## Graph blind spots (false orphans)

Treat as live until grep proves otherwise:

- **Python config-string lookups** — AST cannot follow `BOTICARIO_POINTS["ELE_ST"]`, `COLS["nome"]`, `header_glossary` dict lookups, etc. Modules referenced by string keys may show as weakly connected. Grep the literal key before declaring dead.
- **pytest fixtures** — fixtures in `conftest.py` (`boticario_pe06`, `senac_ele`, etc.) are injected by name; AST may not pick them up. Grep the fixture name.
- **CLI entry points** — `if __name__ == "__main__":` blocks at the bottom of each analyzer module; the `main()` function is invoked from the shell, not from another module. Don't flag these as orphans.
- **PyMuPDF API surface** — `fitz.Page.get_drawings()` / `get_text()` / `find_tables()` are runtime calls, not import edges; module dependencies on `fitz` may understate the actual coupling to PDF structure.
- **Tagsmith-era cruft (HISTORICAL)** — `site/`, `dashboard/`, `convex/` directories were stripped on 2026-05-26 (commit `efceb54`); env-var pollution in `.env.local` + both `worker-configuration.d.ts` files purged on 2026-05-27 (commit `6e5ea27`). They no longer exist on disk. If the graph still references them, the graph is stale — run `/graphify --update`.
- **Astro auxiliary Worker bridge** — the wire from Astro UI (`src/pages/api/takeoff.ts`) → `workers/estimator-container/src/index.ts` → Python container is a TypeScript service binding (`env.ESTIMATOR.fetch`), not an import. The graph won't show a `calls` edge across the JS↔Python boundary; the connection is real but lives in `wrangler.jsonc` config + the service-binding runtime contract. Grep `ESTIMATOR` or read `wrangler.jsonc` to confirm.

When the graph says "orphan", grep before acting.

## Maintenance

- Rebuild after architectural changes (`/graphify` or `/graphify --update`)
- Stale graphs are worse than no graph — if `manifest.json` is older than 1 week or HEAD has moved >50 commits since last build, refresh first
- `graphify-out/` is gitignored intentionally — local artifact, not shared

## Why this rule exists

The graph turns the codebase into a navigable map. Without it, you re-read the same files every conversation and miss cross-cutting couplings (e.g., that `regionselect.py` is the seam between `points.py` planta positions and `quadro_pontos.tally_board` quadro counts, or that `intel_points.py`'s output schema must align with `BOTICARIO_POINTS` for the config-emission path to work). With it, audits go from hours to minutes.
