# Boticário — Elétrica Validation Checklist

**Purpose:** organize the Boticário set + supply your Revu ground truth so the estimator's
elétrica takeoff can be diffed **per line** against truth. When this is filled, Boticário
closes the **correctness** bar for "nailed elétrica" (one deep project, every sub-discipline,
every line vs Revu). Do it once, fully — everything Claude needs is specified here.

**How to fill:** put your Revu numbers in the `Revu` columns. Count **independently** in Revu
(the "tool now" column is only so you know what gets diffed — don't copy it). Units are marked.
Leave a cell blank only if that thing genuinely doesn't exist on the sheet (then write `n/a`).

---

## ⭐ SAMPLE SCOPE — do ONLY these (full Boticário = days; this slice = hours)

Boticário is a campus (Casas 20/26/28/30/32 + Anexos, multiple floors). Don't validate it all.
Validate one vertical slice that still exercises every engine part:

- **PE06_1PAV** (`J&J-LB-ELE-PE06_1PAV.R09.pdf`, Casa 28 1º pav) → **infra metragem + device points**
  (Parts 2 & 3). Detectors already exist here; interruptor + luminária already Revu'd → just confirm.

  | Symbol | Description | Quantity | Unit |
| :--- | :--- | :--- | :--- |
| ✔️ (Blue) | tomada-10A-alta | 17 | Count |
| ✔️ (Green) | tomada-10A-baixa | 70 | Count |
| ✔️ (Orange) | tomada-10A-média | 26 | Count |
| - - (Red) | eletrocalha-50x50x15mm | 21,15 | m |
| - - (Green) | eletroduto-aço-galvanizado-3/4"-  teto | 151,63 | m |
| - - (Blue) | eletroduto-corrugado-reforçado-3/4" - parede | 39,31 | m |
| - - (Orange) | eletroduto-corrugado-pead-3/4" - piso | 17,3 | m |
| - - (blue) | sensor de presença iluminação | 9 | count | 
| - - (no color) | BES (correct terminology is Barra de Equipotencialização Local) | 1 | count | 
| - - (Oragnge) | Iluminação de emergência | 8 | count | 


  ### Note that BES is the only item related to the SDAI the remaining SDAI items are all in Térreo ###



- **+ ONE "Diagrama de Quadros"** (any of `PE03_TRI`…`PE08_TRI`) → **cabos/schedule** (Part 4).
  Pick whichever has a representative mix of 1φ/3φ circuits. Which did you use: `QL-NE-TIPO-2.1`
- **Defer:** the reconciler/join (needs same-area planta+quadro) — it's a cross-check, not a
  quantity. Out of scope for this correctness pass.

Two choices to lock before you start:
- **Aterramento source:** PE06 `ELE_LEP` points ☐ — or SPDA sheet PE12_1PAV ☐ (different things).
- Everything below is scoped to **PE06_1PAV + your chosen TRI** unless noted.

### Files to gather (from `docs/pdf/boticario/PDF/`)

**Required — the minimum 2:**
- [ ] `J&J-LB-ELE-PE06_1PAV.R09.pdf` — Planta Casa 28 1º Pav → infra metragem + device points (Parts 0,2,3)
- [ ] **one** Diagrama de Quadros (pick below) → cabos/schedule (Part 4)

**Pick ONE Diagrama de Quadros** (choose the one listing Casa-28 1º-pav panels — open PE06_1PAV,
read its `QD-…` names, find them in a TRI; for pure cabos correctness any works):
- [ ] `J&J-LB-ELE-PE03_TRI.R02.pdf` — Diagrama de Quadros 1
- [ ] `J&J-LB-ELE-PE04_TRI.R02.pdf` — Diagrama de Quadros 2
- [ ] `J&J-LB-ELE-PE05_TRI.R02.pdf` — Diagrama de Quadros 3
- [ ] `J&J-LB-ELE-PE06_TRI.R03.pdf` — Diagrama de Quadros 4
- [ ] `J&J-LB-ELE-PE07_TRI.R04.pdf` — Diagrama de Quadros 5
- [ ] `J&J-LB-ELE-PE08_TRI.R04.pdf` — Diagrama de Quadros 6

**Optional / supporting (only if noted):**
- [ ] `J&J-LB-ELE-PE02_UNI.R04.pdf` — Diagrama Unifilar BT (alimentadores) — if you also want the feeder BOM
- [ ] `J&J-LB-ELE-PE12_1PAV.R01.pdf` — SPDA 1º Pav — only if validating aterramento from SPDA
- [ ] `J&J-LB-ELE-PE01_MDE.R00.pdf` — Memorial Descritivo — specs/qty cross-reference (not required)
- [ ] `Lista Mestra de Projetos Executivos_ELE_R07.pdf` — sheet index (source of this map)

---

## Part 0 — Scale (do FIRST — every metragem number multiplies by it)

For each PLANTA (geometry) sheet, the escala. If it's not printed in the carimbo, write the
value to use (accountability is yours — the tool never blesses a scale).

| Sheet (PDF) | Escala (1:N) | from carimbo? (y/n) |
|---|---|---|
| PE06_1PAV | 1:50 |View port and carimbo |

---

## Part 1 — Panel map (so the cabos sheet matches the planta)

The chosen TRI (cabos) should contain PE06_1PAV's panels. Open PE06_1PAV, read its panel
names (`QGLF-NE-A2.1` / `QL-NE-A2.1`), note which Diagrama de Quadros (TRI) lists them. (Skip the lookup if
you're doing a pure cabos check on any TRI — just say so.)

| Panel name on PE06_1PAV | Found in which TRI? |
|---|---|
| QL-NE-TIP2.1| J&J-LB-ELE-PE06_TRI.R03.pdf|

- [ ] Chosen TRI contains these panels — or noted "any TRI, pure cabos check".
- [ ] **Sample coverage confirm:** PE06_1PAV carries iluminação + tomadas + interruptores +
  infra (+ aterramento points). Note anything MISSING that needs another sheet: ``J&J-LB-ELE-PE06_1PAV.R09.pdf`, Casa 28 1º pav`

---

## Part 2 — Revu: INFRA metragem (per kind × bitola) — METROS

The housing runs, measured from the PLANTA. Kinds are **distinct products** (perfilado ≠
eletrocalha ≠ leito ≠ eletroduto ≠ busway — your rule). Say whether numbers are **per-floor**
or **building-wide total**: `Building 28 1st floor`

 | Symbol | Description | Quantity | Unit |
| :--- | :--- | :--- | :--- |
| ✔️ (Blue) | tomada-10A-alta | 17 | Count |
| ✔️ (Green) | tomada-10A-baixa | 70 | Count |
| ✔️ (Orange) | tomada-10A-média | 26 | Count |
| - - (Red) | eletrocalha-50x50x15mm | 21,15 | m |
| - - (Green) | eletroduto-aço-galvanizado-3/4"-  teto | 151,63 | m |
| - - (Blue) | eletroduto-corrugado-reforçado-3/4" - parede | 39,31 | m |
| - - (Orange) | eletroduto-corrugado-pead-3/4" - piso | 17,3 | m |
| - - (blue) | sensor de presença iluminação | 9 | count | 
| - - (no color) | BES (correct terminology is Barra de Equipotencialização Local) | 1 | count | 
! - - (Orange) | Iluminação de emergencia | 8 | count

  ### Note that BES is the only item related to the SDAI the remaining SDAI items are all in Térreo ###
> **This whole section is currently UN-validated** (the tool's infra numbers are a denom=50
> regression pin, never checked vs Revu). Your numbers here are the highest-value input.

- [ ] Infra metragem filled, per kind + bitola, with units + per-floor-or-total stated.

---

## Part 3 — Revu: DEVICE POINTS — COUNT

Counts from the PLANTA. `interruptor` and `luminária` already have a Revu number — just
**confirm or correct**. The rest are NEEDED (no Revu yet).

### see table above. The table bellow also accounts for casa 28 only interruptor  ### 

| Device | **Revu count** | tool now (ref) | notes |
|---|---|---|---|
| tomada | | 224 | **NEEDED — final** (prior "~189, refining up" never settled) |
| interruptor — simples | | (55) 29 in the casa 28 1st pav| confirm; total below |
| interruptor — 2 seções | | (9) 7 in the casa 28 1st pav| confirm |
| interruptor — paralelo | | (14) none in casa 28 1st pav | confirm |
| interruptor — condulete | | (0) | confirm |
| interruptor — TOTAL boxes | | 77 | Revu was 78 (Δ−1) — confirm |
| luminária (total drops) | | 238 | Revu was 244 (Δ6) 75 Ponto de Iluminação in the casa 28 1st pav— confirm |
| iluminação emergência | | 35 | **NEEDED** (see table above) |
| aterramento | | 1 | **NEEDED** (see table above) |
| other (list) | | | |

- [ ] Device counts filled/confirmed (tomada final + emergência + aterramento are the gaps).

---

## Part 4 — Revu: SCHEDULE / cabos (from the quadro de cargas) — METROS

From your chosen Diagrama de Quadros (TRI) — plus `PE02_UNI` only if you opted into feeders.
This validates that the tool read the table cells + ran the conductor math right.

**4a — cabo por bitola** (conductors = fases by polaridade + neutro + terra, each at its gauge):

| Bitola (mm²) | **Revu cabo metros** |
|---|---|
| 4 | 2*5 m|

**4b — eletroduto por Ø** (from the table's diameter/COMP columns):

| Ø | **Revu eletroduto metros** |
|---|---|
| 3/4"| 4 |

**4c — the dedup decision (settles a known +143m gap):**
A feeder can appear in the TABLE *and* as a drawing callout → counted twice (+143m on PE02).

- [ ] Rule: dedup (count once) ☐ — or keep both ☐. Why: `no usually feeders are measured by the projetistas and registered on unifilar in sthis case "J&J-LB-ELE-PE02_UNI.R04.pdf" and handled to installers`

**4d — polaridade** (mono/bi/tri per feeder family, if the table doesn't state it):

- [ ] Confirmed (e.g. "all 380V feeders = tri FFF+T", motores = FFF no neutro): `-all 380V feeders = tri FFF+T", motores = FFF no neutro)`

---

## Part 5 — Delivery

- [ ] Filled tables saved (in this file, or a CSV per part — your choice).
- [ ] All Boticário PDFs in one folder; tell Claude the **folder path**: `/home/carlos/apps/airio/docs/pdf/boticario/PDF/`
- [ ] Plain numbers + units. No formatting needed beyond these tables.

---

## Done = ready to validate

When Parts 0–4 carry real Revu numbers for the sample slice (**PE06_1PAV + your chosen TRI**),
Claude runs the estimator on those sheets and **diffs every line vs your Revu**. Lines that
match → proven. Lines that diverge → fix or flag as HITL. That closes the **correctness** bar —
after which the next real Aeronet bid (you as oracle, verified in the UI) closes **generalization**.
