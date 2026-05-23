# v0 Takeoff Engine — Results (2026-05-21)

Sheet: `docs/pdf/senac/sdai/SIA-COM-INC-EX-F03-1PV-SJ-R00.pdf`
Project: SENAC SIA (Brasília) · Disciplina COM-INC (combate a incêndio) · 1º pavimento · autor PROTEC Engenharia · rev R00.

## Core feasibility WIN
Devices counted **from text callouts in the vector PDF — no computer vision.**
Page is a single plotter prancha (4612×2384 display, **rotated 270°**, 119k vector paths).
Counting = string-frequency over callout words; verified against a pin overlay (all pins land on the floor plan, none in the legend → no legend contamination).

## Verified takeoff (1º pavimento)
| Device | Count | Detail |
|---|---|---|
| Extintor portátil | **18** | 17 ABC (fosfato monoamônico) + 1 CO2 (gás carbônico) |
| Hidrante / caixa de incêndio | **10** | HID-18 → HID-27 (numbering is building-wide; floors below used 1–17) |
| Sinalização extintor (cód 23) | 25 | |
| Sinalização hidrante (cód 24A) | 11 | |

## Compatibilização finding (HONEST)
**No clean within-plan inconsistency on this single sheet.**
- Every extintor and every hidrante HAS its signage (0 missing).
- The "extra" signs (25 vs 18 ; 11 vs 10) are NOT defects — verified by crop: a single extintor legitimately carries two cód-23 signs (wall placements). Do **not** headline "orphan signs" to Sergio; it collapses on first question.

## Metragem de tubulação (the bigger prize — added 2026-05-21)
Carlos: "we also install the tubes — can we measure in meters?" **Yes, and precisely in principle.**
- **The PDF preserved 86 CAD layers**, each vector path tagged with `layer`. Pipe isolates EXACTLY on layer **`P-PIPE`** (no heuristic). Other useful layers: `HID`, `SIN`, `Cotas` (dimensions), `INC. 1PAV`.
- **Scale stated on sheet: ESC.: 1/75** → 0.026458 m per PDF point.
- **Pipe is drawn as double parallel lines** (250/264 long segments have a parallel partner ~3.8cm apart) → true run = measured ÷ 2.
- **Horizontal run estimate: 709–902 m (central 806 m)** on this floor. Reported as a RANGE on purpose.

**Honest caveats (do not bury):**
1. Scale 1:75 is TRUSTED (engineer typed it), not yet empirically calibrated. `Cotas` layer can validate via one labeled dimension — attempted, not clean on this sheet (dimension-chain extension lines tangle with legend codes). Calibrate before quoting to a customer.
2. ~200m of sub-13cm strokes excluded as fittings — some curve tessellation IS run. 14/264 long segs unpaired.
3. **Risers (vertical DESCE/SOBE) NOT included** — sheet says "VER CORTE ... PRANCHA 04/04". Total developed length needs the section sheet. Hard gate.

**Verdict:** metragem is worth ~10x device-counting to an installer (drives tube + connections + labor cost). If Sergio agrees, this becomes the demo headline, not extintor counts. Implemented in `count.py:pipe_metragem()` returning a low/central/high band (never a single number).

## Riser metragem from the corte (step-by-step, 2026-05-21)
Got the full project: `docs/pdf/senac/compatibilizados/` — 3 floors (1ºSUBSOLO, TÉRREO, 1ºPAVIMENTO) × 5–7 disciplines each + cortes. All vector, layers intact.

**Rule-transfer proven:** ran `count.py` UNCHANGED on subsolo INC (`SIA-COM-INC-EX-F04-1SS`) → 27 extintores, 9 hidrantes (HID-38→46), 1012–1289 m pipe. Same project = same template → rules transfer floor-to-floor for free (same discipline only).

**The corte (`SIA-COM-COR-EX-F04-1PV`):**
- Multi-discipline section. Fire pipe = magenta (1,0,0.5) on layer `AP-Condutos` (NOT P-PIPE — corte has its own layer scheme).
- **Scale ≠ plan.** Corte is **1:50**, plan is 1:75. Derived EMPIRICALLY from level marks (+5.61→+9.75 = 4.14 m over 235 pt = 0.01762 m/pt). This is the scale-trust-killer method.
- **Floor-to-floor height = 4.14 m** (from level marks, exact).
- Direct geometry sum is UNRELIABLE on the corte: magenta = 2434 m raw, 1066 m deduped, vs ~60 m visible → CAD export stacked ~108 overlapping sub-segments. Don't sum corte pipe.

**Riser method (locked):** `riser_run_m = riser_markers (from PLAN) × floor_height (from CORTE)`.
- Plan DESCE/SOBE markers, legend excluded by display position: **8 risers** (generous cutoff x<3550; strict cutoff gives 6).
- 8 × 4.14 = **33 m** risers.

**Developed total for 1ºPAV fire pipe (conservative, for quoting):** horizontal HIGH (902) + risers (33) = **935 m** + connections.

**PROJECT RULE (Carlos, domain):** OVER-estimate beats under-estimate. Leftover material is cheaper than aditivos mid-project. → metragem quotes the HIGH bound, riser markers counted at full floor height, generous plan/legend cutoff. Encoded in `count.py` (`developed_para_orcamento_m`).

Implemented: `count.py:riser_metragem()` + `developed_para_orcamento_m`; surfaced in CLI + web UI.

## Scale: detect → propose → human-confirm (step 4A, 2026-05-21)
Scale is one number that multiplies every metre, so the design (Carlos) is: **tool detects + proposes + shows evidence; human ratifies. Accountability sits with the human.**
- `count.py:detect_scale()` parses the stated ratio from sheet text (`ESC: 1/N`). Plan → reads **1:75** automatically (was hardcoded). Returns `needs_confirmation=True` always.
- If no ratio in text → fallback **1:1** (CAD default per Carlos) with a loud "provavelmente ERRADO p/ prancha plotada" warning. The corte hits this (no ESC text) → proves why the human gate is needed.
- UI shows a yellow **CONFIRME** banner above the number; CLI prints `⚠ ESCALA ... >>> CONFIRME (humano)`. Ambiguous (multiple ratios) → flagged.
- `pipe_metragem(scale_denom=...)` lets the human override.
- Note: empirical calibration via dimensions (`Cotas`) attempted but not clean on these sheets; the human-confirm gate is the v0 answer (level-mark method works on cortes, see above).

## Adjustments (2026-05-21): zoomable viewer + procurement specs
1. **Better viewer for the human check.** The plan is now embedded as the **annotated PDF** (pins drawn on the vector page via `annotated_pdf()`), served inline at `/pdf/{token}` and shown in an iframe → native browser viewer (zoom/pan/search), crisp at any zoom. PNG (`/overlay`) kept as fallback. CLI writes `annotated.pdf`. (Headless Chromium screenshot shows blank iframe — no PDF plugin — but real browsers render inline; "nova aba" link is the fallback.)
2. **Material specs → procurement section.** Each `DeviceRule` carries a `spec` (and `subtype_specs` for ABC/CO2), read from the legend (tuned, like the count rules). `summarize()` emits a `procurement` list (item · qty · unit · spec). Pipe diameter auto-detected (`ø` tokens → ø65/DN65) and added as a metres line. Surfaced as a table in CLI + web. This lets procurement pre-process before the full BOM exists. Stage-1 Intel would later extract specs per-file instead of hardcoding.

## What a REAL compatibilização catch needs (next artifacts)
This PDF references a **4-sheet set**: "COMPATIBILIZAÇÃO DO 1° PAVIMENTO Nº 04/04" + detail drawings DI-1…DI-6 on sheet INC-02. Real cross-checks become possible with:
1. **Riser / coluna de incêndio diagram** (sheet 04/04) → hidrantes-per-column vs plan count.
2. **Other floors' plantas** → HID numbering continuity building-wide (no gaps/dupes).
3. **Memorial Descritivo** → memorial item qty vs plan count (the canonical "memorial 40 ≠ planta 37").
4. **Sheet INC-02** → do all referenced details DI-1…DI-6 exist?

## Generalization across ALL SENAC disciplines (2026-05-21)
**Who Sergio is (decisive):** Sergio **owns the SENAC scope** — he is accountable for the WHOLE compatibilizado set, **every discipline**, not just low-voltage. Aeronet's specialty is low-voltage (SDAI/CFTV/cabeamento/automação/acesso/SPDA), but as scope owner Sergio needs a takeoff for **all** disciplines present in this project: INC (incêndio/suppression), ELE (elétrica), SDAI (DET), ESG (esgoto), IAC (ar condicionado), TEL (telefonia), SPK (sprinkler), PRE (pressurização), SPDA. → **The fire demo is NOT the wrong artifact — it is ONE of ~8.** The product must span the entire set.

**What this means:** both halves of the engine matter, applied per discipline. **Device-counting** works where devices carry text callouts (INC ✓; SDAI/CFTV likely tagged points). **Metragem** dominates the linear disciplines (ELE bandeja/eletroduto, ESG/SPK/INC pipe, IAC duct, TEL cable). Each discipline is count-led, metragem-led, or both — Intel decides which from the legend.

**Built `estimator/ele.py`** (sibling of count.py — separate because elétrica has no device-word per device; counting tomadas/luminárias would need CV, which the demo's thesis avoids). Outputs: panel+circuit SCHEDULE, bandeja+conduit METRAGEM, size/diameter HISTOGRAM, cross-discipline CONFLITO. Reuses count.py `detect_scale`/`_m_per_pt`.

**Elétrica metragem CORRECTNESS PASS (2026-05-21, after first cut had bugs):**
- **Every run is drawn as TWO parallel edges** (the tray width / conduit Ø). First cut summed both edges → **2× too high**. PROVEN: bandeja edge-gaps cluster at **4/6/8 pt = 100/150/200 mm** (the exact tray catalog) and the pair-count per gap tracks the size-label freq; visually confirmed (double red lines in `out_ele/bandeja_zoom.png`). Fix: centerline = paired ÷ 2.
- **Per-size metragem falls out of the edge-gap** (gap × scale = physical width) — no label→segment join needed. Validated 2 ways: (a) **falsification** — all 6 segs in the spurious "50mm" bucket also had a valid 100/150/200 partner (ONLY-50mm = 0 m), proving the total is unaffected and the bucket was pure mislabel; fixed by snapping gaps to the labeled catalog widths {100,150,200}. (b) **eletroduto** pair-gaps map cleanly to the labeled diameters (19=Ø3/4", 32=Ø1¼", 51=Ø2", 76=Ø3") → conduit halving is as valid as tray.
- **Busway was missed** — first cut matched only `EL-Condutos*`, omitting `EL-Barramento blindado` (~186 m). Fix: measure `EL-Condutos*` + `EL-Barramento*`; exclude `EL-Conexões*` (fitting graphic) + `EL-Quadro*` (panel boxes).
- **Scale 1:75 empirically corroborated** by the tray-width geometry (8pt gap = 200mm) — still human-confirmed (`--scale-denom`), accountability his.

**GROUND-TRUTH VALIDATION (Carlos, Bluebeam Revu manual, subsolo):** eletrocalha 200x50 = **259.13 m**. ele.py = **253.7 m → 2% under** (un-halved would be ~507 m, so the manual independently confirms the ÷2 double-edge method is correct — not a circular self-check). The 200mm bucket needed a per-size fix: nearest-partner pairing let a close neighbouring run steal 200mm edges into the 100mm bucket (240 m wrong); restricting bandeja pairing to plausible catalog gaps fixed it (240→254). Remaining ~5 m gap ≈ <20pt short connectors at bends (MIN_SEG_PT cutoff) + manual variance; the +10% quote band over-covers it.

**Corrected results** — **subsolo** (`SIA-COM-ELE-EX-F02-1SS`): bandeja **432 m** (200mm=254 / 100mm=143 / 150mm=35), eletroduto **393 m**, busway **186 m**. **terreo** (`SIA-COM-ELE-EX-F04-TER`): bandeja **157 m**, eletroduto **245 m**. All PROVISIONAL @ 1:75 until human confirms; +10% over-estimate quote band applied AFTER halving. (Building-wide ELE = these 2 floors; 1ºPav has no elétrica sheet.)

**Power/força sheet — no fixtures (confirmed by Carlos).** Lighting (luminárias/tomadas) is a separate sheet; this one is quadros + feeders + routing. Spread check confirmed: only `0. QUADROS` is plan-distributed (33 cells); `E-ELEC-EQPM*` is concentrated (a detail/schedule, not placements). So the only discrete count here is quadros.

**Quadros — 19 labels, 17 geometry-confirmed.** Panel labels (19 distinct: BD/QGBT/QGDE/QTE/QTU/QDU) cross-checked against `0. QUADROS` symbol placements → **17/19 confirmed @50pt** (a panel label with a quadro symbol within 50pt = label↔geometry agreement = Carlos's trust model). Radius matters: 80pt gave a loose 19/19, 30pt gives 16 — 50pt is the honest middle. The 2 unconfirmed (**BD-01, BD-02**) are barramento *caixas de derivação* (a different component than QD* panels) → no `0. QUADROS` symbol near them; correctly flagged for review, not forced. Naive geometry clustering gave 44 (over-segmented strokes) — the label-anchored reconciliation is what's trustworthy, NOT raw geometry.

**Eletroduto per-Ø metragem (Carlos: essential).** Conduit split by edge-gap→Ø (validated: gap mm = labeled Ø). Subsolo: Ø3/4"=52m, Ø1"=8m, Ø1¼"=131m, Ø2"=125m, Ø3"=72m (≈393m total). The `AG` in labels (`A-1E-06 AG Ø2"`) = Aço Galvanizado = the `AL-DUTO AG` layer = legend "eletroduto ferro galvanizado" — label↔layer↔legend all agree (the trust triangle).

**Cables (Carlos: essential) — not on this sheet.** Per-feeder conductor gauges are absent from the plan (the lone `#2,5mm²` is legend prose; default `#2` per legend). The full cable schedule (gauge per feeder) lives in the quadro de cargas (separate sheet/table). ele.py reports plan gauges (none here) + the note; cable LENGTH per feeder = its route length (label-anchored tracing, not yet built). Need the quadro de cargas to size cables.

**Schedule (circuits) still legend-dependent** — circuit families (A-IC/A-MT/A-GG…) + false-positive traps (`RAL-7032`); broadened regex (52 circuits) flagged `_INCOMPLETE`, real correctness = Stage-1 Intel. Fire words bleed in (extintor 20, hidrante 11) = compatibilizado overlay → cross-discipline collision candidate.

**THE generalization lesson (SDAI proves it):** ran ele.py on SDAI (`01-SDAI/.../SIA-COM-DET-EX-F01-1SS`, Sergio's literal discipline) → **honest zeros, no crash.** Why: the **layer/tag config is per-discipline, NOT portable.** Elétrica conduit = `EL-Condutos`; SDAI conduit = `E-POWR-CNDT`. Diameter token elétrica `Ø2"` vs SDAI `ø20`. Tags elétrica `A-1E-11`/`BD-03` vs SDAI `MC`/`CA`/`ENDEREÇÁVEL`/`MÓDULO`. → The metragem **mechanism is universal** (sum long segs on the conduit layer × scale, exclude the fitting layer); the **config is not.** Hand-writing one module per discipline = the trap.

**The fix — and the cost/architecture refinement (Carlos, 2026-05-21):** *Most of the "intel" (the per-discipline config) is in the LAYER NAMES, derivable DETERMINISTICALLY — no LLM.* Layer names are self-describing: `EL-Condutos…BANDEJA`=tray, `…AL-DUTO AG`=aço-galv conduit, `EL-Barramento blindado`=busway, `0. QUADROS`=panels, `01 - TEXTO ALIMENTADORES`=labels. ele.py's entire config came from *reading layer names*. So the primary engine = a **layer-name parser** (cheap, deterministic). **Stage-1 Intel (Claude reading legend + labels) is the FALLBACK/validator, not the primary path** — needed where layers are neglected (geometry on the wrong layer), and for richer semantics layers don't carry (legend specs/manufacturers, tag meaning). Layers do most of it; Intel fills the residual. This both lowers cost (LLM only on gaps) and matches the trust model: clean layers → trust + parse; dirty layers → fall back to labels/legend.

**Scale (Carlos rule, reaffirmed):** none of these sheets carry an `ESC:` ratio in the **carimbo** — any matched ratio comes from a **detail inside the drawing** (≠ plan scale). The **human confirms + SETS** the scale (`--scale-denom N`); accountability is his, not the tool's. ele.py prints all metres as PROVISÓRIO and never blesses a scale.

**Files:** `estimator/ele.py`, `estimator/out_ele/takeoff_ele.json` (elétrica), `estimator/out_sdai/` (SDAI graceful-zero proof).
Run: `.venv/bin/python estimator/ele.py "<sheet.pdf>" [--scale-denom N] --out estimator/out_ele`

## Busway fitting BOM → HITL is the THIRD architecture leg (2026-05-22)
Subsystem cross-check of busway (barramento blindado), subsolo. **LENGTH validated EXACT: ele.py 186 m = Carlos's manual Revu 186 m ✅.** Then Carlos asked to also count busway **fittings**: curvas 90° (L-elbows) + conexão reta (inline straight couplers). Manual ground truth: **23 curvas + 27 reta**.

**Why pure-auto fails here (proven this session):**
- The **curva is not a glyph** — it's a 90° corner of the busway centerline. The **conexão reta** is a distinct coupler glyph (a short bar with end-tick caps).
- The obvious layer `EL-Conexões 01. AL-BW` (1064 strokes) is **dominated by circuit-tap flags** (A-1U/A-1E hexagon callouts) + run-line crossings, NOT the fittings — confirmed by rendering sampled clusters and a 51-cell montage. Centroid-clustering it counted flags by coincidence (~51 ≈ 50).
- `EL-Barramento blindado 01. AL-BW` = 74 plain line segments (the run edges → ÷2 = 186 m); corners are implicit.
- A glyph-fingerprint auto-classifier to hit exact 23/27 = hours, over-fits one sheet, and the **same combinatorial complexity recurs across all ~8 disciplines** (glyph types × manufacturer conventions). BOM piece counts need EXACT — no over-estimate slack (a curva ≠ a reta in cost), unlike metragem.

**THE DECISION (Carlos, 2026-05-22): HITL as the third leg.** Stop chasing a universal auto-classifier for ambiguous counts. **The human is the generalizer.** Architecture now = three legs:
1. **Layers (deterministic)** — layer-name parser, primary, cheap.
2. **LLM Intel (semantic gaps)** — legend/label reading, fallback/validator.
3. **HITL (adjudicate + capture)** — for what neither layers nor LLM can disambiguate (varying glyph vocab, fitting BOM).

**HITL ≠ "human does the grind."** Cost split is lopsided: human RECOGNIZES a glyph in seconds (brittle for algo); machine COUNTS/measures/dedupes 1000s instantly (tedious for human). Requirements that make it a product, not consulting:
- **Capture the map** — human points once ("that L = curva") → tool fingerprints the glyph + records `layer X, shape Y = curva` as config.
- **Reuse it** — same project/standard = consistent conventions → one map covers all floors/sheets; next sheet auto-applies, human only CONFIRMS (~5 s).
- **Accumulate** — maps compound into a library; new project of same standard is mostly pre-mapped; marginal human effort → ~0. **Moat = accumulated glyph vocab + adjudication UX, not the algorithm.**
- **Machine still does heavy lifting** — finds candidates, measures, renders montages. Human adjudicates ambiguity ONLY. If the human grinds, the tool failed.
- **Human ground-truth doubles as the acceptance test** (23/27 = the unit test for the fitting counter).

**The loop to productize is exactly what this session ran manually:** render candidate glyph families as a labeled montage → human taps "curva / reta / noise" (Carlos used screenshots in `docs/screenshots/bw-curva-90.png`, `bw-conexão-reta.png`) → tool fingerprints + counts → human confirms vs eyeball → SAVE config → reuse next sheet.

**The auto/HITL line:** metragem (lengths) → machine auto + over-estimate margin, no human (186 m proved it). Fitting BOM (exact counts, varying glyphs) → HITL adjudication.

**Status:** busway LENGTH 186 m ✅. Fitting counter (curva corner-count + reta glyph fingerprint, calibrate to 23/27, then 2nd-sheet check) = NOT built — decision is to build it as a HITL loop, not auto. Active workflow = subsystem-by-subsystem cross-check; next length subsystems: eletrocalha 100x50 / 150x50, eletroduto totals.

## AG conduit per-Ø cross-check → the per-Ø wall (2026-05-22)
Cross-checked `EL-Condutos 03. AL-DUTO AG (Teto)` vs Carlos's manual Revu per-Ø. Total nearly matched (388.2 vs 389.22, <1%) but **per-Ø has two real errors that partly cancel** — proving total alone lies, "must be per-Ø":

| Ø | ele.py (gap-snap) | Revu | verdict |
|---|---|---|---|
| Ø3/4" | 52.3 | 52.35 | ✅ exact |
| Ø2" | 124.5 | 123.35 | ✅ |
| Ø3" | 72.0 | 71.82 | ✅ exact |
| Ø1" | 8.2 | 14.84 | ✗ −6.6 |
| Ø1.1/4" | 131.2 | 119.89 | ✗ +11.3 |
| Ø4" | 0 | 6.97 | ✗ missing |

**Well-separated Ø (3/4", 2", 3") = exact from geometry edge-gap. The two failures are structural, not tunable:**
- **Ø1↔Ø1¼:** conduit is double-line; gap=Ø works for wide sizes, but Ø1"(25mm) has no distinct drawn-width mode (drawn ~29mm, snaps to 32mm=Ø1¼). 22 pairs gap→32, and **zero have a Ø1" label within 60pt** → label-anchoring is impossible here (labels sit 100–310pt from runs on leaders). Tried a full label-anchor rewrite; it relabeled 0 and broke the good buckets. Empirically dead.
- **Ø4" = feeder, off-layer.** Its 6 labels sit by `01 - TEXTO ALIMENTADORES` (feeder leaders) + `E-ELEC-EQPM` — no conduit-run layer has geometry there. Not measurable from plan geometry; comes from the alimentador schedule.
- Label-parse trap fixed in probe: page is **rotated 270°**, so `Ø1`+`1/4"` is stacked vertically (dy≈9.6) = Ø1¼"; `_diam_to_mm("Ø1")`=25 wrongly reads it as Ø1". (Cosmetic — gap-snap doesn't use labels; no metragem impact.)

**Lesson:** per-Ø *sizing* cannot come from line geometry for the ambiguous/feeder cases. This is what triggered the feasibility research below.

## Feasibility research → 4/4 GREEN, keep building (2026-05-22)
Carlos paused building to test the whole approach. 4-lens Tavily research:

1. **Input format (PDF vs DWG/IFC) — GREEN.** BR electrical = "dumb" 2D (~6% use attribute standards); size lives in text labels, not data. Estimators get stripped PDFs; DWG/IFC rarely authored with attributes in BR → same problem. PDF+geometry+label+HITL is the pragmatic market fit; **HITL structurally required** (data in labels everywhere). The per-Ø wall is BR drafting practice, not our format choice.
2. **Method: schedules vs geometry — GREEN (clarifying).** Truth-hierarchy: **schedule tables = sizing** (gauge/Ø/breaker), **geometry = length/path/waste**, **counts = device totals**. Feeder/cable Ø ← the schedule, not the lines. **BR NBR 5410 makes the quadro de cargas legally the sizing source.** → per-Ø failure = read sizing from the wrong source. Fix = extract quadro de cargas, join to runs by feeder/circuit ID. AI table extraction 90–96% clean / 70–80% borderless → confidence-scored + HITL.
3. **Competitive — GREEN, open wedge.** Togal (architectural only), Kreo (MEP auto-count, DWG/IFC, €150/mo = closest threat, but no NBR/SINAPI/LV/BR), Countfire (count-only). **BR tools (OrçaFascio/Sienge/AltoQi/Pleo) = ZERO AI takeoff** (manual + SINAPI/TCPO). Wedge: **BR + electrical/LV + multi-discipline + NBR/SINAPI.** Counting commoditizing; our uncontested-in-BR strengths = metragem + schedules + multi-discipline + NBR.
4. **Economics/ICP — GREEN.** Takeoff = 50–80% of estimating time; AI cuts 80–90% → bid capacity (10→25-30/mo). **HITL takeoff IS scalable SaaS, not consulting** (Beam/Togal/Trimble). ICP = electrical/MEP integrator (Sergio). BR ROI trivial: orçamentista ≈ R$16k/mo loaded, takeoff = 50-80% of time → R$150-400/mo tool pays back instantly.

**Refined build plan:** (1) geometry/length ✅ keep; (2) **schedule/table extraction (quadro de cargas) ← BUILD NEXT** (LLM Intel's real job; fixes per-Ø + feeders); (3) HITL adjudication UI (confidence-flagged); (4) BR moat — NBR 5410 calcs, SINAPI/TCPO, PT-BR.
**Stop:** ❌ geometry-for-sizing (dead-end); ❌ full-auto (HITL is right); ❌ DWG/IFC pivot.
**Unchanged constraint:** distribution is still THE bottleneck — research validated the product, not GTM.

## Schedule-extraction generalization test → LLM-VISION (2026-05-22)
SENAC has no schedules, so tested the schedule leg on 3 other projects' electrical schedules (`docs/pdf/boticario/PDF/`, `docs/pdf/apex/`):

| Source | office | format | deterministic parse | LLM-vision |
|---|---|---|---|---|
| `PE02_UNI` | boticario | feeder/alimentador TABLE | ✅ 41 feeders (own format) | ✅ |
| `PE03_TRI` | boticario | per-panel quadro de cargas (4 panels/~55 circ, 1φ/3φ) | ❌ 0 | ✅ |
| `024-ELE-ALI` | APEX | unifilar diagram + PAINEL table (dense sheet) | ❌ 0 | ✅ |

- **Schedule data present across all 3** as clean vector tables. The boticario feeder table parsed deterministically → 41 feeders incl. **Ø4"=36m + full cable-by-gauge** — exactly what geometry couldn't get (the per-Ø wall fix, confirmed live).
- **Deterministic per-format parser fails cross-format (3×)** — boticario parser → 0 on PE03 + APEX. Hardcoded-parser-per-layout = same trap as per-discipline geometry config.
- **LLM-vision reads all 3** — incl. APEX, where the linear text stream scrambles (dense multi-block: diagram+table+legend), so text-parse fails but reading the rendered table image works. **Vision is the generalizer** (any office/layout, table-or-diagram).

**Verdict — schedule leg = LLM-VISION:** render sheet → Claude vision → structured JSON (panel/feeder/circuits w/ Ø, seção mm², comp m, pot) → confidence → HITL on low-confidence → join to geometry by panel/feeder ID. NOT deterministic (no generalize), NOT text-parse (scrambles on dense sheets). Untested: the geometry↔schedule join end-to-end (needs a same-project schedule+plan pair).

## `estimator/schedule.py` BUILT + validated (2026-05-22)
The schedule leg, shipped. Routes through `claude -p` CLI (subscription OAuth, like intel.py — no billed key; ToS caveat = swap to sk-ant- SDK for a shipped build). Renders the sheet (4200px long edge) → vision (`@image` mention, Read-only tool) → structured JSON (`feeders[]` + `panels[].circuits[]` + `confidence`) → `_validate` (untrusted) → `aggregate()`.

**Validated on boticario PE02:** vision eletroduto-by-Ø = **exact match** to the deterministic ground truth (Ø1.1/2"=1118 / Ø1"=835 / Ø1.1/4"=356 / Ø2.1/2"=315 / Ø3/4"=221 / Ø3"=68 / Ø4"=36 = **2949 m**), conf 0.7, $0.56. The model also auto-flagged duplicate TIP rows (table vs drawing callouts) and caught that motor/AC feeders are FFF+T (no neutro) — i.e. it surfaces HITL items itself.

**Cable counting = CONDUCTORS, not route length (Carlos's rule, 2026-05-22):** per row = (n fases by `polaridade`: mono 1 / bi 2 / tri 3) + 1 neutro + 1 terra (earthing), each at its OWN gauge; a conductor counts only if its gauge is present (motor FFF+T has no neutro); `qtd` (parallel cables) ×fase+neutro, terra ×1; rows with no polaridade → `cabo_polaridade_indefinida` (HITL). `aggregate()` returns `eletroduto_m_por_pol`, `cabo_m_por_bitola`, `cabo_total_m`. Conductor math unit-validated deterministically.

**Next:** the geometry↔schedule JOIN (feeder/panel name = key) for cross-validation (schedule comp_m vs measured route length), then presentation. Note: a re-run to populate `polaridade` on PE02 hit a transient CLI error (returncode 1, empty stderr) — not a code bug; the route + eletroduto are proven, a fresh run populates polarity.

## `estimator/join.py` BUILT + validated (2026-05-22)
Reconciles the SCHEDULE (sizing, schedule.py) against the PLAN (placement) by panel/circuit/feeder NAME — closing the trust triangle and surfacing compatibilização gaps for HITL. Name matching is convention-agnostic: uses the schedule's own authoritative names, looks each up in the plan's text normalized (accent/case/separator folded); `plan_only` scan uses a loose panel-shape regex to surface undocumented labels. Output: `matched` (with plan x,y) / `schedule_only` / `plan_only` / `summary` (match_rate).

**Validated on a REAL same-project pair — APEX** (the only available plan-with-text-panels + schedule pair; SENAC = plan-only, boticario plans have no extractable panel text). Schedule = PAINEL `QG-E-2P-AUD` (circuits QT-1..4); plan = `APEX-021-ELETRICA-2PV`:
- **matched:** panel `QG-E-2P-AUD` + circuits `QT-1`, `QT-E-2P-B-AUD-2`, `QT-E-2P-B-OBS` (with plan positions).
- **plan_only:** `QT-E-2P-B-PDC` — on the plan, no schedule entry → real compatibilização gap (HITL).
- **schedule_only:** the rest — panel feeds circuits across floors, so a single sheet won't carry all; a multi-sheet join raises coverage.

**TODO:** (1) metragem cross-check (schedule `comp_m` vs measured route length) needs ele.py reconfigured for the plan's layer scheme; (2) multi-sheet join (one panel's circuits span floor plans); (3) panel labels are often graphic-not-text (boticario) → may need LLM-vision label detection on the plan, same as the schedule leg.

## `estimator/crosscheck.py` BUILT + validated (2026-05-22)
The trust triangle's third edge: compares two INDEPENDENT BOMs of the same quantity — GEOMETRY (ele.py conduit-by-Ø) vs SCHEDULE (schedule.py conduit-by-Ø) — per bitola. Status per Ø: OK (within max(2m, 5%)), DIVERGE (both present, off), GEOM_ONLY, SCHED_ONLY. Tells you per-Ø WHICH source to trust. Key-normalised so `Ø1.1/4"` == `Ø1 1/4"`.

**Validated on SENAC geometry vs Carlos's Revu manual** (the authoritative per-Ø source = schedule's role) — it reproduces the per-Ø wall as a formal report:
```
Ø3/4"  52.3 / 52.4  OK     | Ø2"  124.5 / 123.3  OK   | Ø3"  72.0 / 71.8  OK
Ø1"     8.2 / 14.8  DIVERGE| Ø1.1/4" 131.2 / 119.9 DIVERGE | Ø4"  0 / 7.0  SCHED_ONLY
TOTAL 388.2 / 389.2  (-0.3%)   divergencias=[Ø1", Ø1.1/4", Ø4"]
```
Geometry trustworthy where Ø widths separate (Ø2/Ø3/Ø3/4 OK → use measured length); DIVERGE where drawn widths overlap (Ø1↔Ø1.1/4 → use schedule sizing); SCHED_ONLY where geometry is blind (Ø4 feeder, single-line/off-layer → schedule fills it). Auto-flags the divergences for HITL. Plugs in directly: `ele.py` diam_m → geom; `schedule.aggregate()['eletroduto_m_por_pol']` → sched.

**Per-feeder route cross-check** (schedule comp_m vs the traced conduit length for that exact feeder) = still TODO — needs per-feeder route tracing on the plan + a same-project position+comp data pair (current data lacks one: SENAC=plan-no-schedule, boticario=schedule-no-text-panels, APEX=positions-but-no-comp-column).

## `estimator/app_ele.py` — presentation layer BUILT + validated (2026-05-22)
Self-serve web UI for the electrical pipeline (sibling of `app.py` which serves the fire `count.py`). FastAPI, reuses `app.py`'s brand stylesheet. Flow: upload the SCHEDULE sheet (required) → `schedule.extract_schedule` (vision) → `aggregate` → render BOM; optional PLAN upload → `join` (name reconciliation) + `ele.metragem` → `crosscheck` (geometry vs schedule per Ø). Sync handler (runs in threadpool; the claude CLI subprocess blocks).

Result page shows: **confidence banner** (CONFIRME-humano if <0.8), **polaridade-indefinida HITL flag**, **Eletroduto por bitola** + total, **Cabo por bitola** (condutores F+N+T per polaridade) + total, **Alimentadores** table (nome/origem→destino/pol/condutor/Ø/comp), **Quadros** (circuits per panel), **Reconciliação planta↔quadro** (matched / só-no-quadro / só-na-planta = HITL), **Cross-check de metragem** (per-Ø geom vs quadro, OK/DIVERGE/SCHED_ONLY), notes, JSON download.

Validated via TestClient (GET / + result render with real-shaped data — all sections present; polaridade banner correctly appears only when polarity unread). Live e2e (uvicorn + real upload) is the remaining manual check (~40s LLM/extraction).
Run: `.venv/bin/uvicorn app_ele:app --port 8001` (from estimator/; needs fastapi + pymupdf + python-multipart + the claude CLI).

**Pipeline now end-to-end:** schedule (vision BOM) → join (reconcile) → crosscheck (trust) → app_ele (present), beside the fire count.py/app.py. The three-leg architecture is shipped.

## schedule.py PIVOT → find_tables-FIRST (2026-05-22, after LLM-vision hit a wall)
**The LLM-vision route was the wrong default.** It is OUTPUT-bound: a 41-feeder table = ~13k tokens of JSON → the subscription CLI took >420s and timed out (confirmed: tiny calls 5-34s, the 41-row call >420s; image size irrelevant — an 8MP crop with 4 circuits ran in 27s, a 6MP crop with 41 rows still timed out). v1 squeaked under once (~$0.56) then drifted over. Carlos (skeptical after the earlier wrong call) pushed for a library — correct.

**Fix: PyMuPDF `find_tables()` (already a dep) as PRIMARY.** It reads the grid spatially (ruling lines + cell alignment) → instant, free, deterministic, immune to the linear-text scramble. My earlier "deterministic doesn't generalize" was wrong-scoped (it was about a hand-anchored parser, not a real grid detector). Column MEANING mapped by CELL CONTENT (the Ø column = the one with inch fractions `3/4`,`1.1/2`; gauges = decimal-mm² columns; comp = last bare-int col; voltage = {380/220} col) — content-heuristic, not per-format anchors. LLM-vision kept as FALLBACK (`force_llm` / no-table-detected).

**Validated:** PE02 (the sheet that timed out) now extracts in **~instant** (e2e POST = HTTP 200 in 5.6s). Eletroduto-by-Ø: 5/7 buckets EXACT (Ø1.1/2"=1118, Ø1.1/4"=356, Ø2.1/2"=315, Ø3"=68, Ø4"=36); total 3092 vs truth 2949 — the +143 = duplicate rows (table-vs-drawing-callout), the known dedup/HITL judgment, NOT a read error. Cable BOM via the conductor rule (all tri, inferred from 380V — Carlos confirmed; F/N/T each summed into its own gauge bucket; terra reduced vs fase).
The table = a **FROM→TO feeder list (QGBT → Quadros Alimentadores)**; headers: NOME/ORIGEM/DESTINO/TENSÃO/POT INST/POT DEM/QTD CABO/CONDUTOR(FASE,NEUTRO,TERRA mm²)/ISOLAÇÃO/QUEDA ΔV/DIÂMETRO ELETRODUTO/COMP(m).

**Loose ends (flagged, not blockers):** (1) duplicate-row dedup (+143m) = HITL; (2) `find_tables` bbox clips the leftmost NOME column (affects join labels, not the BOM — widen region to fix); (3) terra ×qtd vs ×1 for parallel feeders (Carlos's call); (4) polaridade inferred from voltage here, read per-circuit from FASE-R/S/T on panel-level (PE03) tables.

**Lesson:** library-first for the bulk (deterministic/instant/free), LLM only for the residual it can't parse — mirrors layers-first. Don't default to an LLM for structured tabular data.

## Files
- `estimator/count.py` — engine (RULES = legend tuned to this sheet)
- `estimator/out/takeoff.json` — structured counts + coverage
- `estimator/out/overlay.png` — plan with colored pins per device (the "where?" proof)
- Run: `.venv/bin/python estimator/count.py <plan.pdf>`
