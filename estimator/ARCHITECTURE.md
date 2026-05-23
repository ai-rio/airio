# Estimator — Architecture (the anchor)

Single reference to stop re-deriving this every session. Two halves, two sources,
one rule. Validated against 3 real BR projects (SENAC, Boticário, APEX) — unstructured
2D AutoCAD, varying layer/header vocabularies. This is the reality, not an idealization.

## The two halves (each has its OWN source of truth)

| Half | What | Source document | Why not the other source |
|---|---|---|---|
| **Infraestrutura** (eletrocalha, eletroduto, perfilado, busway) | metros por bitola — the *housing* | **PLANTA** (CAD geometry) | a table never carries the physical runs |
| **Cabos** (condutores) | metros por bitola — F/N/T × polaridade × paralelos | **QUADRO DE CARGAS / DIAGRAMA** (table) | geometry can't resolve gauge/Ø/count (the per-Ø wall) |

You need **both documents**. Neither alone is a full takeoff — same as reading them by hand.

### Cable length has TWO sources (the halves complete each other)
The schedule always gives the **gauge** per circuit/feeder. The **length**:
- if the table carries `COMP`/`DIST` → use it (cable metres straight from the schedule);
- if it doesn't (common on **smaller projects** — a real, frequent case) → length comes
  from the **plan route** (the reconciler joins circuit→route geometry), or HITL if no plan.

So `cabo_m = (length: table ∨ plan-route) × conductors(polaridade, F+N+T) × paralelos`.
A schedule without lengths still yields a **gauge inventory**; metres are filled by the plan.

## The diagram

```
                         ┌─ PER-PROJECT CONFIG ─┐
   INPUT (project's       (self-describing:       GENERIC ENGINE        CANONICAL
    own vocabulary)        layer names / headers)  (write ONCE)          OUTPUT

 ╔═ INFRA (housing) ═══════════════════════════════════════════════════════════╗
 ║  PLANTA.pdf          layer_map:                INFRA extractor       infra BOM ║
 ║  CAD layers   ─────► EL-Condutos → eletroduto  ─► paired-edge ÷2  ─► m/bitola  ║
 ║  (varies/project)    ELE_PERF    → perfilado      × escala           calha/    ║
 ║                      ELE_CE      → eletrocalha    per layer          duto/     ║
 ║                      EL-Barram.. → busway                            busway    ║
 ╚═══════════════════════════════════════════════════════════════════╤═══════════╝
                                                                      │
 ╔═ CABOS (conductors) ═════════════════════════════════════════════╪═══════════╗
 ║  QUADRO.pdf          header_map:               CABLE extractor    │  cabo BOM  ║
 ║  find_tables  ─────► "DIÂMETRO ELET"→ Ø        ─► conductor rule ─┤  m/bitola  ║
 ║  grid+headers        "CONDUTOR FASE"→ fase        pol × (F+N+T)    │  por      ║
 ║  (varies/project)    "COMP"        → comp          × paralelos      condutor   ║
 ╚═══════════════════════════════════════════════════════════════════╤═══════════╝
                                                                      ▼
                                   RECONCILER (join by nome de quadro/circuito)
                                   • infra comp(route) vs cabo comp(tabela)
                                   • presente em um doc, ausente no outro → HITL
                                                                      ▼
                                       TAKEOFF = 2 BOMs reconciled + flags
```

## THE RULE (anti-tail-chase)

**New project = new config (layer_map + header_map), NOT new code.** The two engines
are written once; everything project-specific lives in the config. If you find yourself
editing an engine to handle a new project, the config layer is missing — that's the bug.

## Config = the project's self-describing vocabulary

Mirrors "most of the intel is in the layers." The drawing already names its own things;
the config just maps those names → canonical fields. Cheap, per-project, no LLM for the
clean case (LLM/HITL only when layers are dirty or headers non-standard).

## Status across the 3 real projects (the test matrix = the work queue)

| Project | Infra layers | infra mapped? | Cable table | cable mapped? |
|---|---|---|---|---|
| **SENAC** | `EL-Condutos`, `EL-Barramento` | ✅ done (Revu-validated) | — (no schedule) | — |
| **Boticário** | `ELE_PERF`, `ELE_CE`, `ELE_ST`… | ❌ not mapped | feeder table (PE02) | ✅ done |
| **APEX** | (not checked) | ❌ | panel table (PAINEL) | ❌ not mapped |

**Proven = the MECHANISMS** (paired-edge metragem; find_tables + conductor rule).
**Not proven = generality** — each engine is currently hardcoded to ONE project's
vocabulary (SENAC layers in `ele.py`; feeder-header shape in `schedule.py`). No config
seam exists yet. That's why feeding Boticário's plan to the SENAC-glued infra engine
returns empty — the source of the "still getting SENAC infra" confusion.

## The fix (one refactor, defined by this diagram)

Pull the two maps OUT of the engines into a per-project config; engines read the map.
Then: SENAC, Boticário, APEX each = a config entry, and both halves run on all three.

## Commands (scaffold)
```
# tests — pins the proven numbers (SENAC infra, Boticário cabo, APEX join); integration skips if PDFs absent
uv run --with pymupdf --with fastapi --with python-multipart --with pytest pytest
# local app
.venv/bin/uvicorn app_ele:app --port 8001
# deploy target: Dockerfile → CF Container (standard-1), fronted by a Worker
```

## HITL seams (where the human adjudicates — by design)
- Infra: confirm the **escala** (human sets it; accountability his).
- Cabo: confirm **polaridade** (inferred from voltage on feeder tables; read per-circuit
  on panel tables) + **duplicate rows** (table vs drawing callout).
- Reconciler: **name mismatches** (in one doc, not the other).
