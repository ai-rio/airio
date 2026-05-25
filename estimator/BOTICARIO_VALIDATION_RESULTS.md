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

## WHOLE-DRAWING diff (2026-05-25, Carlos's Revu totals: casas 28 + 20 + mezanino)

Seam-free oracle (Carlos counted all 3 plantas → the seam boundary stops mattering). Tool =
whole PE06 sheet, validation-scoped (excl legend strip y>2700 + ampliação box). Scale 1:50.

**INFRA METRAGEM — first Revu validation of the infra half (was a denom=50 regression pin):**
| line | tool | Revu | Δ | status |
|---|---|---|---|---|
| **perfilado 38x38** | 168.3 m | 167.06 | **+0.7%** | ✅ EXACT — metragem mechanism proven on a 2nd product + 2nd scope |
| eletrocalha 50x50 | 66.3 m | 57.64 | +15% | rough: 913pt unpaired segs + width buckets (100/200mm) don't match the 50mm tray |
| eletroduto galv 3/4" (teto) | **370.0** | 345.11 | **+7%** | ✅ acceptable (rigid, paired method) — layer ELE_TA |
| eletroduto pead piso | 1.9 | 76.25 | −98% | ✗ corrugado MISSED — layer ELE_TP |
| eletroduto reforçado parede | 64.4 | 75.11 | −14% | ⚠ corrugado partial — layer ELE_TE |
→ **FIXED (2026-05-25):** eletroduto was 0 because it's on CRYPTIC layers the universal glossary
  can't word-match. Carlos confirmed: **ELE_TA=teto(galv) / ELE_TP=piso(pead) / ELE_TE=parede(reforç)**
  (NOT ELE_CE/SF). Added `kind_overrides` param to `ele.metragem()` (per-project HITL layer→kind
  map — keeps project codes OUT of the universal glossary). Now measured: total 436 vs 496 (−12%).
→ **NEW METHOD FINDING:** the paired-edge ÷2 mechanism works for RIGID conduit (galv ELE_TA +7%)
  but FAILS for CORRUGADO/flexible (pead ELE_TP −98%, reforç ELE_TE −14%). Corrugado is drawn as a
  wavy single line = many tiny tessellated segments, all < MIN_SEG_PT(20) → dropped. Corrugado needs
  a different measurement mode (single-line path length, handle tessellation) — NOT paired ÷2.
  39 tests green (override is an optional param; SENAC pins unchanged).
→ **CORRUGADO GEOMETRY (2026-05-25, rendered ELE_TP + ELE_TE) — it is NOT one mode:**
  • **pead ELE_TP = DASHED single line** (404 segs, 392 short<20pt, 0 curves). Dashes counted,
    GAPS not → dash-sum 55 vs route 76 (−28% ≈ the gap fraction). Needs dash-route tracing
    (connect collinear dashes, measure full extent incl. gaps).
  • **reforç ELE_TE = MIXED** (347 lines + 161 curves): some PAIRED double-line runs, some SINGLE
    lines w/ tick marks, curved bracket end-caps. paired÷2=64, long-single×1=71, all-segs=92.
  → A single "corrugado mode" would OVERFIT these 2 layers on one sheet (the param-torture trap).
  Proper fix = a dedicated single-line + dash-tracing measure validated across MORE corrugado
  examples. galv (rigid paired, ~70% of eletroduto) is the closed part; **corrugado DEFERRED.**

**DEVICE POINTS (validation-scoped):**
| device | tool | Revu | Δ | read |
|---|---|---|---|---|
| emergência | 34 | 37 | −3 | the 3-glyph variant gap (Intel found aclaramento + 2× seta) |
| tomada | 239 | 210 | +29 OVER | classification — ELE_ST circle/square can't split tomada-10A / 20A / ponto-força-AC (35); AC points likely counted as tomada |
| luminária (Ponto Ilum) | 213 | 276 | −63 UNDER | real detector miss (~23%) — cluster misses fixture glyphs across Casa 20 + mezanino |
| interruptor | 70 | n/a | — | not counted this round |

**NEW device detectors added (2026-05-25, Carlos gave the layer map):**
| device | layer | glyph | tool | Revu | Δ |
|---|---|---|---|---|---|
| caixa de passagem | ELE_SF | hatched square (~13 strokes, 11×11) | 66 (scoped) | 66 | **0 EXACT** ✅ |
| sensor de presença | ELE_SAL | PIR dome + 3 waves (~7 strokes, 19×19) | 9 | 12 | −3 (ELE_SALmax 11 clusters: ~1 merged + 2 variant → HITL) |

**Still NO clean detector:**
- **ponto de força AC (35) = on ELE_ST** (same layer as tomada!) → the tomada +29 over-count IS
  these AC points lumped in. Splitting tomada vs AC needs glyph discrimination ON ELE_ST → Intel/HITL.
  → **RESOLVED 2026-05-25 — the split is by AMPERAGE, not just AC (Carlos's requirement).**
    PE06_1PAV ground truth (Carlos): **10A vast majority / 21× 20A-2P+T / 1× 20A-4P+T / ~35 AC.**
    Three probes prove amperage is NOT recoverable from the planta:
      1. all 224 ELE_ST circles = ONE path signature (c4 / 9×9 / unfilled) + ONE color (magenta);
         the legend NAMES the types (`tomada-10A-alta/baixa/entreforro`, `tomada-20A-alta/baixa`)
         but they are legend TEXT, not OCG layers — geometry is identical.
      2. only ~5 amperage tokens on the WHOLE sheet (the legend) — no per-outlet amperage label.
      3. 127/224 circles have NO text near them; `schedule.extract_schedule(PE06_TRI)` returns 0
         tomada circuits → no circuit-number join key to the QUADRO DE CARGAS.
    So NO glyph detector can split amperage here; it lives only in the quadro / the engineer's head.
    → Added `variants {default: tomada_10a, labels: [tomada_10a, tomada_20a_2pt, tomada_20a_4pt,
    ponto_forca_ac]}` to ELE_ST. HITL **exception-tagging**: default to the majority 10A, human taps
    only the FEW exceptions (22 × 20A + ~35 AC) on the clean `points_overlay_tomada.png` — not 224 taps.
    Future automation = parse the QUADRO DE CARGAS tomada circuits (amperage + qty) for an AGGREGATE
    split; needs schedule.py to actually extract them (0 today) and is aggregate-only (planta has no
    locate key). 40 tests green.
- **Ponto de Iluminação (276) = MMM-LUMINOTÉCNICA** confirmed, but Carlos: it's a FULL VARIETY of
  fixture types (spots, trilhos/rails, pendants — Boticário is a HOTEL). One glyph detector
  inherently under-counts a varied design → the multi-glyph-variety problem (like emergência
  3-glyph) = Intel/HITL, NOT a param fix. The −63 = missed fixture TYPES, not merging.

**Net:** perfilado exact = the infra mechanism + scale are right. Remaining = (1) glossary one-liner
for eletroduto ELE_TA; (2) eletrocalha pairing/width refine; (3) luminária under-count (the real
detector gap); (4) tomada/AC + new classes = variant/classification → Intel/legend; (5) emergência
3-glyph. Direction of tomada FLIPPED vs Casa-28-alone (was −11 clip, now +29) → confirms AC-lumping.

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

## Session decisions (2026-05-25, Carlos)

1. **Outlet split by AMPERAGE → HITL exception-tagging.** Carlos's requirement: split tomadas by
   10A / 20A-2P+T / 20A-4P+T (+ AC) — different SKU/breaker/gauge. Proven NOT derivable from the
   planta (3 probes). Shipped: ELE_ST `variants` default=tomada_10a; human taps only the ~22+35
   exceptions. Schedule-derive (quadro de cargas) is aggregate-only + deferred. See RESOLVED note.
2. **+7% galv / +15% eletrocalha over-count → ACCEPTED** per the over-estimate rule
   (`feedback_metragem_overestimate`: quote uses the high bound; aditivo worse than leftover).
   ⚠ eletrocalha's +15% is MECHANISM NOISE (913pt unpaired segs + width buckets 100/200mm vs the
   50mm tray), not a deliberate buffer — refine when a second project lands, not by tuning PE06.
3. **luminária −63 / corrugado → PULL A SECOND PROJECT.** PE06 geometry is at the deterministic
   ceiling; more tuning = overfit. A 2nd project validates generalization AND supplies the
   fixture/corrugado variety to design against. (Data-gathering thread, separate from this commit.)
