# Boticário PE06_1PAV — Elétrica Validation Results (2026-05-24)

Sample slice: `J&J-LB-ELE-PE06_1PAV.R09.pdf`, **Casa 28 1º pav** (device points + infra).
Oracle = Carlos's Revu count, Casa 28 only. Engine = `points.py` (BOTICARIO_POINTS).

## TL;DR — two root causes found, neither is "the detector is broken"

1. **The sheet is MULTI-PLANTA.** PE06_1PAV packs **Casa 28** (top-left block) +
   **Casa 20** (the big lower building) + a **top-right ampliação** (excluded per Carlos) +
   a **legend/symbology strip** (bottom carimbo) on one page. The tool counted the WHOLE
   sheet (tomada 224 / luminária 238 / interruptor 77). Carlos counted **Casa 28 only**.
   → The historical "oracle" pins (224 / 238 / 77, "Revu ~189 / 244 / 78") were
   **whole-sheet vs a single-planta truth — apples to fruit-salad. They are TAINTED;
   do not reuse as regression pins.**

2. **A bounding box CANNOT cleanly isolate Casa 28.** The two plantas **interleave at the
   seam** (y≈1000–1130): e.g. interruptor count is 36 at y<1025 but 43 at y<1100 (7 Casa-20
   units leak in), while the BES/aterramento (a real Casa-28 device) sits at y=1075 — below
   that cut. Casa-28 devices and Casa-20 devices share the same y (and nearby x) at the
   seam. → **The region must be a HUMAN-DRAWN POLYGON, not a rectangle.** This is the
   product's region-select primitive, and it's load-bearing for correctness, not cosmetic.

## Per-device diff (Casa 28 red-frame box `(111,113)–(1491,1025)`, top-right detail excluded)

| Device | tool (frame) | Carlos Revu | Δ | cause of Δ |
|---|---|---|---|---|
| interruptor (boxes) | **36** | **36** | **0** ✅ | exact — but may be a frame-cut coincidence (see seam) |
| aterramento (BES) | 0 | 1 | −1 | BES at y=1075 clipped by frame bottom (1025) — region edge |
| tomada | 103 (90 circ + 13 sq) | 114 | −11 | **detector gap + region edge** (see below) |
| luminária (drops) | 65 | 75 | −10 | region edge clip + possible fixture-glyph gap |
| iluminação emergência | 6 | 8 | −2 | region edge / glyph |

The Δ's are a MIX of region-edge clipping (fuzzy seam) and genuine detector gaps. They
can't be cleanly separated until the region polygon is fixed (the human-drawn boundary).

## The ONE unambiguous detector fix: tomada has TWO glyphs

ELE_ST carries the tomada symbol in **two forms**, the detector only catches one:
- **circle ⊖** — a 4-curve bezier path, ~9×9pt → `_detect_circle` counts these (90 in frame).
- **square-with-diagonal ⊠** (floor box / caixa de piso) — a 6-line path, ~10×11pt →
  **NOT counted.** ~13 in frame as single 6-line paths (likely more drawn as split strokes).

→ Add the square glyph as a SECOND detector entry for `tomada` (config, not new mechanism —
same seam as glossary.py). `90 circles + ~13–24 squares` should reach 114 once the region
is correct. The exact square count is region-dependent, so calibrate AFTER the polygon.

## What's NOT yet done (rest of the checklist)

- **Part 2 — infra metragem** (eletrocalha 21.15 / eletroduto teto 151.63 / parede 39.31 /
  piso 17.3 m; sensor presença 9): not run for Casa 28 region yet (needs `ele.py` + region).
- **Part 4 — cabos/schedule** (TRI = `PE06_TRI.R03`, panel `QL-NE-TIP2.1`): not run yet.
- The reconciler/join: deferred (out of scope for this correctness pass).

## VALIDATED Casa-28 diff (2026-05-24, Carlos drew the region in regionselect.html)

Carlos's polygon: `x[71,1505] y[99→1028]` (near-rectangular, bottom edge y≈1028).
Tomada now counts circle ⊖ + square ⊠ (multi detector, shipped). Diff vs his Revu:

| device | tool (in region) | Revu | Δ | cause (decomposed) |
|---|---|---|---|---|
| **interruptor** | **36** | **36** | **0** ✅ | detector + region both proven |
| tomada | 103 | 114 | −11 | SEAM CLIP — 11 Casa-28 tomadas sit just below the straight cut |
| luminária | 65 | 75 | −10 | SEAM CLIP — 10 Casa-28 lum below the cut |
| BES/aterramento | 0 | 1 | −1 | SEAM CLIP — BES at y=1075, below the cut |
| emergência | 6 | 8 | −2 | SEMANTIC gap — ELE_SQ has exactly 6; the other 2 are a DIFFERENT glyph/layer Carlos's "8" includes (balizamento/exit). Intel-leg job, not ELE_SQ tuning |

**Decomposition is clean and one-sided:**
- **Seam clip (tomada/lum/BES):** the bottom band y[1015,1170] holds a MIX — 26 tomada, 14 lum,
  1 BES (Casa 28) AND 4 interruptors (Casa 20). The real Casa-28/Casa-20 divider is the
  irregular building wall; a straight polygon edge can't separate them. Interruptor is exact
  precisely because all 36 sit above the cut and the 4 Casa-20 ones below are correctly excluded.
  → Close by (a) retracing the boundary along the wall, or (b) **whole-drawing validation**
  (draw Casa 28 + Casa 20; the seam boundary becomes irrelevant, compare totals). (b) is cleaner.
- **emergência −2:** NOT region (0 clipped nearby). ELE_SQ carries exactly 6 emergência blocks;
  the 2 rejected ELE_SQ clusters were a magenta square + a hatched rect (not emergência). The
  missing 2 are a different emergência glyph Carlos's legend-definition includes → the **Intel
  leg** (read the legend → know emergência spans >1 glyph) is the right fix, not ELE_SQ tuning.

**Shipped this session:** tomada square-glyph (`points.py` multi detector, 39 tests green);
`regionselect.py` (region polygon + tap-to-drop HITL + sidecar export), browser-verified.

## Recommended next steps (in order)

1. **Region-select polygon** (the product UI primitive): human draws Casa 28 boundary once
   on the overlay → tool counts inside. Unblocks EXACT per-line validation. Carlos's
   "semi-dotted red line" boundary can seed the default; human confirms/edits.
2. With the polygon fixed: add the **tomada square glyph** to config, recalibrate tomada,
   then re-diff luminária / emergência / aterramento — the residual after the region is
   correct is the TRUE detector gap to fix.
3. Then run **Part 2 (infra metragem)** and **Part 4 (cabos)** against the same Casa 28 slice.

## Scope coordinates (rot0, page 2384×3370; PDF native rotation = 270)
- Casa 28 frame (red, ELE_CE): `(111,113)–(1491,1025)` — close, but clips seam devices.
- Top-right ampliação (red frame, EXCLUDE): `(1553,107)–(2301,1003)`.
- Casa 20: y≳1060 down to ~2580. Legend strip: bottom carimbo y≳2700.
