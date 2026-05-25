# Estimator — Architecture (the anchor)

Single reference to stop re-deriving this every session. Two halves, two sources,
one rule. Exercised against 3 real BR projects (SENAC, Boticário, APEX) — unstructured
2D AutoCAD, varying layer/header vocabularies; this is the reality, not an idealization.
**Validation is partial — see the status table for what's actually proven vs pending**
(SENAC infra = Revu-validated; Boticário cable = validated; Boticário infra = smoke-only;
APEX = join only). Don't read "exercised" as "fully validated".

## The two halves (each has its OWN source of truth)

| Half | What | Source document | Why not the other source |
|---|---|---|---|
| **Infraestrutura** (eletrocalha, perfilado, leito, eletroduto, busway — distinct products) | metros por bitola — the *housing* | **PLANTA** (CAD geometry) | a table never carries the physical runs |
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
| **SENAC** | `EL-Condutos`, `EL-Barramento` | ✅ Revu-validated (eletrocalha/eletroduto/barramento) | — (no schedule) | — |
| **Boticário** | `ELE_PERF`(perfilado), `ELE_CALHA`(eletrocalha) | ✅ via glossary — **regression-pinned, not Revu** | feeder table (PE02) | ✅ done |
| **APEX** | (not checked) | — | panel table (PAINEL) | ✅ header-driven + ABNT terra |

**The config seam is WIRED** (`glossary.py` for infra layers, `header_glossary.py` +
`abnt.py` for cable headers). Both engines read the project's self-describing vocabulary;
SENAC + Boticário infra and Boticário-feeder + APEX-panel cable all run with zero
per-project code. Canonical infra kinds: `eletrocalha`, `perfilado`, `leito`,
`eletroduto`, `barramento` — each a **distinct product** (own takeoff line; perfilado ≠
eletrocalha, Carlos's rule). The glossary is discipline-scoped: other-discipline conduits
(dados/CFTV `CE-`, fire `SDAI`) are excluded from the elétrica takeoff.

**The quadro is ALSO the device-count spine** (not only cable sizing): `quadro_pontos.py`
reads the same QUADRO DE CARGAS table for outlet/AC/circuit COUNTS (QTD per circuit), joined
to a casa by the `-T#` board suffix in the circuit name. Boticário casa-28 tomadas = 88 pts /
11 circ (find_tables) vs Carlos Revu 91 (Δ3, validated); AC-força = 13 board-`T2` AR COND vs
Revu 15 (Δ2, validated — Δ2 = common-area AC carried no-suffix, assigned via the HITL bucket).
casa-28 20A-tomada = 0 (oracle ✅; every `-T2` tomada is 162 VA/pt = 10A). Both tomada and AC
get the same spine: board-suffix join + a no-suffix HITL bucket that SURFACES common circuits
for human casa-assignment (never pre-assigns / torture-fits). AR COND ⇒ `ac_real` always —
nominal VA is NOT a força/control discriminator (casa-28's 40 VA fan-coil rows are real points).
1 quadro point ≈ 1 drop (1:1) for tomadas/AC — but NOT lighting (1 lighting point : N fixtures;
luminária drops come from the PLANTA via points.py). The planta gives positions; the two
RECONCILE = the verification UI.

**Proven = the MECHANISMS** (paired-edge metragem; find_tables + conductor rule) **and**
the seam's generality (one glossary measures both projects' differing layer names).
**Still pending validation:** Boticário infra is a regression pin (denom=50 fallback), not
a Revu ground-truth number — replace when one exists. APEX infra layers unchecked.

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
- Points: **tag-once on the numbered overlay** for distinctions geometry can't make
  (interruptor variant simples/paralelo — identical 'S', differs only by 3-way circuit).

### HITL = two distinct mechanisms (don't conflate — see [[project-estimator-hitl-architecture]])
1. **Within-project tag-once** (reuse axis = *time*): human tags per-instance once, re-run
   never re-asks. For NON-geometric distinctions (paralelo has no shape to fingerprint).
   **Built** (`points.py`, 2026-05-24): sidecar `<pdf_stem>.points_tags.json`
   (`{device:{str(idx):label}}`, label = variant or `"drop"`) → `apply_tags` → per-variant
   BOM; `overlay()` numbers each pin so the human reads indices off the PNG. Verified by
   **idempotency** (same PDF → identical centroid order → stable indices), not a Revu oracle.
2. **Cross-project glyph→item teaching** (reuse axis = *project*): teach a SHAPE once, machine
   recognizes it in future projects. For visually-distinct glyphs (curva vs reta, luminária
   SKUs, new legends) — this is the moat. NOT YET BUILT. Don't build its cross-project map off
   a #1 case (paralelo) — there's no shape to carry across projects. #1 is the substrate.
