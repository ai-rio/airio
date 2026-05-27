# Carlos's Real Takeoff Workflow — n=1 Spec

Source: Carlos narrates his Aeronet workflow, verbatim, in his own words. This doc IS the spec for the Astro UI screens per the wedge lock.

Captured: 2026-05-26, session "astro-cf-pivot continuation."

---

## Step 1 — Trigger: PDF arrives

**Carlos (verbatim):** "open PDF, skim all sheets first"

Implications (Claude inference, to confirm later):
- First action = orientation pass, not counting
- Multi-sheet PDF assumed (not single-sheet)
- "Skim" = visual triage, no measurement yet

Open questions to revisit:
- What is Carlos looking for in the skim? (Sheet count? Discipline coverage? Scale? Legend location? Quadro location?)
- Does scope doc / RFP get opened in parallel, or PDF only at this stage?
- Elétrica-only vs full MEP — decided here or known from cliente brief?

---

## Step 2 — Skim purpose (what Carlos scans for in first pass)

**Carlos (verbatim, ordered priority):**

1. Project scope/size
2. Where quadro de cargas lives
3. Where Memorial descritivo lives
4. Understand the drawing legends (this is usually standard)
5. Drawing quality
6. Red flags

Implications:
- **Memorial descritivo** = surfaced as 1st-class artifact (NEW — not in `estimator/` plumbing today; not in handoff). Likely text doc inside PDF or sibling file. Needs explicit slot in UI.
- **"Legends usually standard" = LOCATION only** (Carlos clarified). Legend POSITION on the sheet is BR convention (top-of-planta or own legend sheet). Legend CONTENT (symbols + nomenclature) still per-project unique. Vision Intel reads each project's legend; dict accumulates over time. Memory `reference_semantic_layer_standards` (legend-as-canonical-key, NECA 100, teach-once) stands.
- UI implication: legend location can have a smart default (top-of-planta or dedicated sheet picker); legend CONTENT confirmation is always per-project HITL.
- Quadro location + Memorial location = both early artifacts Carlos hunts. UI should ask user to point at them, not auto-detect blindly.
- "Drawing quality" + "Red flags" = gut-check signals, not measurable. UI may surface a "quality flag" the orçamentista can mark.

Open questions to revisit:
- What does "scope/size" mean to Carlos in numbers? (m² of edificação? número de quadros? número de pontos rough estimate?)
- Memorial descritivo — separate PDF or page inside same PDF? What does Carlos extract from it?
- "Standard legends" — does Carlos keep a personal master legend dict? Or memory only?
- Red flag examples — what specific things kill a bid before counting starts?

---

## Step 3 — Skim outcome: go / no-go + sequencing

**Carlos (verbatim):**

> 1. No go usually is due to a project size, we don't take small residential projects e.g. homes, flat refurbishment
> 2. Effort around 4-7 days to round it up 10 days to deliver
> 3. Once I understand that is a real project no ballpark. I don't do it or the project is worth or not no ballpark at all
> 4. It depends, I'm focusing in elétrica as all other depends on it, but if I already knows that is firm I can get any of it
> 5. When decided to go ahead: Despatch the Quadro de cargas to suppliers so I can get the pricing, Quantify cable schedules, and them count
>
> Intermediate steps: Many times some necessary components are not at neither, MD, drawings, or in one but not in the other, so when the component fall into one of these we usually quantify it as "omissos" and query the customer about it. This brings another level of complexity as it can increase pricing which can be negative but in the other hand can count as expertise and have a positive side effect.

### Key primitives surfaced

**No-go = SIZE filter.** Small residential (homes, flat refurbishment) = pass. Implication: ICP gate baked into Carlos's intake. Project type chip on intake screen — "is this commercial / institutional / industrial / multi-family residential? Or single-family residential / flat refurb?" Latter = soft-warn "your wedge skips these."

**No ballpark before counting — HARD RULE.** Carlos explicitly refuses pre-count ballparks. UI must NOT offer "estimated price in 30s" feature. Either project is worth doing → real takeoff; or it's not → no quote. Kills any "instant quote" UX.

**Effort: 4-7 actual, 10 quoted.** Buffer baked in. Implication: per-takeoff session has a clock — UI may surface elapsed vs target. NOT a billing meter; an internal estimator-of-the-estimator. Optional.

**Discipline order = elétrica default (because everything depends on it).** Matches the wedge lock. Confirms the wedge isn't arbitrary — it mirrors Carlos's actual sequencing. Other disciplines only if firm already secured (= post-sale work). UI confirms: elétrica is the entry point; other disciplines = post-sale add-on, not parallel.

**Go-decision unlocks 3 actions (parallel/sequential, Carlos's order):**
1. **Despatch Quadro de Cargas to suppliers** → cable pricing RFQ. NEW workflow primitive — Carlos sends the quadro out for supplier quotes BEFORE counting. UI implication: a "send quadro to suppliers" export step (PDF/CSV of the quadro de cargas with supplier-ready format).
2. **Quantify cable schedules** → maps to `estimator/schedule.py`. The cable BOM from the quadro.
3. **Then count** → points + infra metragem (`points.py`, `quadro_pontos.py`, `ele.py`).

So the existing Python plumbing IS Carlos's order — schedule → count. Confirmed.

### **🚨 OMISSOS — HITL scaffolding primitive (corrected 2026-05-26)**

> "components are not at neither, MD, drawings, or in one but not in the other → quantify as 'omissos' + query customer"

> **Carlos's correction (skim turn):** "the omissos module... has to be an ongoing process not deterministic as AI wont be able to quantify drawing as we already experienced it"

**Right framing:** omissos is **NOT** an auto-detect pipeline. By definition an omisso = the absence of data → tool cannot compute what isn't there. AI quantifying drawings has failed before (per `feedback_library_first_not_llm`). Omissos surfaces AS Carlos works — tool scaffolds, doesn't detect.

**airio's role = persistent HITL scaffolding:**
- Every screen (cable schedule, planta count, MD normalization) has a persistent **"flag omisso"** action
- Carlos clicks when he spots one in his work; tool captures structured data:
  - Which artifact has the component / which doesn't (MD ✓, Quadro ✗, Planta ?)
  - His quantification estimate (count + unit)
  - His query draft text to cliente
  - Project + section context (Campus → Building → Pavimento)
- Tool persists across screens; one omissos list rolls up from all flags
- Tool drafts the email query to cliente (Carlos edits + sends)
- Tool tracks omisso state (flagged → query_sent → resolved-in / resolved-out)

**What the tool will NOT do:**
- ❌ Cross-artifact diff to "find" omissos before Carlos sees them
- ❌ Auto-compute "drawn but missing from MD"
- ❌ Replace Carlos's eye

**The MD-as-checklist scaffolding** (per Step 9 correction):
- AI extracts MD into a structured item list (kind + specs + section_ref + vagueness flags)
- UI surfaces as a CHECKLIST per MD item
- Carlos walks the checklist: "✓ matched in BOM" / "⚠️ flag as omisso" / "✗ ignore"
- Omissos list populated from Carlos's "⚠️" clicks — Carlos drives, AI scaffolds
- No auto-detection; Carlos's eye stays primary

**Optional soft hint** (low-confidence, suggest-only, NOT assertion):
- "MD mentions 'fancoils' but no fancoil circuits visible in your Quadro tagging — flag?"
- Hint surfaces a possible miss; Carlos confirms or dismisses
- Hints are nudges, not findings; they never enter the omissos list without Carlos's click

**Why this primitive still matters as moat (re-stated):**
- Most takeoff tools count what's drawn; airio gives Carlos a **structured place to capture what's missing** as he works
- Carlos already does this mentally → tool persists it
- Same end-deliverable (omissos report to cliente) but cleaner workflow + auditable trail
- Junior orçamentistas using airio learn the omissos discipline by following the scaffolding

**Plumbing implication:** NO `omissos.py` analyzer needed. The omissos primitive is **UI + persistence + email drafting + optional soft hints** — not an analyzer. Per pre-build gate, definitely not building a Python module.

### Open questions to revisit

- Project size threshold — m² cutoff? R$ cutoff? Or vibe-based ("smells small")?
- Memorial Descritivo — separate PDF? Page in same PDF? What format does cliente deliver it in?
- Quadro de Cargas RFQ to suppliers — what fields do suppliers need? (Carlos's existing supplier-RFQ template = a real artifact we should see.)
- Omissos query-to-cliente — Carlos writes them by hand today? Email? Doc? Template?
- "Real project" judgment — what makes it real vs not-real beyond size?

---

## Step 4 — Supplier dispatch: two tracks, raw PDF

**Carlos (verbatim):**

> 1. These are cable manufacturers, we usually send it to specialized quadro manufacturers, e.g. https://www.brval.com.br/ , cable "alimentadores schedule audit goes to specialized distributors e.g. https://cabinerio.com.br/
> 2. The customer project straight
> 3. The pricing quote for quadro de cargas
> 4. Usually a week
> 5. Usually email, whatsapp with files attached

### Two supplier tracks (Claude inference, confirm)

| Track | Counterparty | Example | What's sent | What's received |
|---|---|---|---|---|
| **Quadro track** | Specialized quadro manufacturers (build physical panel) | brval.com.br | **Customer project PDF (raw)** | Pricing quote for the Quadro de Cargas |
| **Cable track** | Specialized distributors (cable wholesalers) | cabinerio.com.br | **Quantified cable list** (Carlos's own cable BOM, derived from Quadro de Cargas) — NOT raw PDF | Pricing for alimentadores (feeder cables) |

**Asymmetry** (corrected 2026-05-26): Quadro manufacturer reads the raw PDF themselves (they design + build the panel, so they need the full project context). Cable distributor needs a curated cable list — Carlos quantifies it first (= `schedule.py` output today).

Cable manufacturers (Prysmian/Nexans/Cobrecom) = upstream of distributors, NOT Carlos's direct supplier. Carlos buys through distributors.

### Sequencing implication (revises Step 3, action #2)

The 3 go-decision actions Carlos listed are **not** strictly sequential:

```
GO-decision
   │
   ├──► Dispatch Quadro PDF → quadro mfr        (parallel, raw PDF, ~1 wk wait)
   │
   ├──► Quantify cable schedules (schedule.py)
   │         │
   │         └──► Dispatch cable BOM → cable distributor   (~1 wk wait)
   │
   └──► Count points + infra metragem (parallel, points.py + ele.py + quadro_pontos.py)
```

So cable schedule quantification has **two consumers**: cable distributor (procurement) AND the takeoff report (Carlos's deliverable to cliente). Same artifact, two destinations. UI design implication: `schedule.py` output is a 1st-class object with at least 2 export targets.

### Mechanics

- **Channel:** email + WhatsApp, file attached.
- **Cycle time:** ~1 week from dispatch to quote received.
- **Format sent:** raw customer PDF, untouched. No curated RFQ, no Excel cable list, no preprocessing.

### Why "raw PDF straight" matters for the UI

If Carlos sends the unchanged customer PDF, his TOOL doesn't need to produce a supplier-RFQ format. The dispatch step is just:
1. Pick which 2 supplier counterparties (one quadro mfr, one cable dist)
2. Hit "send" → email/WhatsApp with the PDF attached
3. Wait ~1 week, log the response

UI implications:
- **Supplier contact book** in Carlos's account (his quadro mfrs, his cable distribs)
- **Dispatch button** per project: "Send to [quadro mfr ▾] + [cable dist ▾]" → opens email draft / WhatsApp link with PDF attached
- **Response logging** — when the quote comes back (1 week later), Carlos pastes it in → links to the takeoff for procurement total
- **Status:** "awaiting quadro quote" / "awaiting cable quote" / "both received" — visible state on the project

### Open questions

- How many quadro mfrs does Carlos have on rotation? (1, "I always use brval"? Or 3 he plays off each other?)
- Same Q for cable distribs.
- Does Carlos compare 2-3 quotes per RFQ, or single-supplier per project?
- Does the supplier-quote come back as PDF, Excel, plain email text? (Affects how we ingest it.)
- Is the dispatch step strictly BEFORE counting (Carlos's stated order), or can counting run in parallel during the 1-week wait? (Probably parallel — confirm.)

---

## Step 5 — Cable schedule quantification (the cable BOM)

**Carlos (verbatim):**

> 1. Memorial descritivo is more like a SPECS guide, Quadro de cargas must be the source of truth
> 2. Excel. Per bitola and per color F+N+T usually ABNT standard
> 3. Usually but not always, projetistas provide measurements for alimentadores schedule, but not for internal circuits, so we have a 250m per circuit average and so we can guaranty that we'll not ask for aditives during the project so the steps are:
>    A: quantify schedules guided by the projetista numbers, following the mono, bi, tripolar, standards to get the final number;
>    B: for internal circuits check gauge, application, e.g. iluminação, outlets, motors, ac etc so we can make an average, always paying attention to gauge, Amperes, F+N+T specs...
> 4. Yes
> 5. Just PE06 took me a morning with the help of REVU, which most of the people don't use

### Primitives surfaced

**Source-of-truth hierarchy:**
- **Quadro de Cargas** = source of truth for cable BOM (canonical, authoritative)
- **Memorial Descritivo** = SPECS guide (types, applications, standards) — secondary, validates Quadro entries
- **Planta** = WHERE; cross-checked for omissos
- If Quadro and MD disagree → Quadro wins for numbers, MD wins for specs.

**Output shape (Excel, deliverable to cable distributor):** richer than just bitola × cor × metragem — Carlos's interjection 2026-05-26 flagged that **allowed brands + isolation** are MD-derived fields that MUST go in the distributor RFQ. Confirmed against MD-EXAMPLE section 7.1.3 (ENFIAÇÃO E CABOS) which specifies isolation type, temperature rating, voltage rating, NBR refs, and approved cable types ("HEPR LSOH Afumex", "tipo Gsette", etc.).

Real RFQ schema per row:

```jsonc
{
  bitola: "2.5 mm²",
  cor_funcao: "F (preto) | N (azul) | T (verde-amarelo)",  // ABNT
  metragem: 480.0,
  isolation: "HEPR LSOH 0,6/1 kV 90°C",         // FROM MD
  voltage_rating: "0.6/1 kV",                    // FROM MD
  temperature_rating_c: 90,
  allowed_brands: ["Prysmian", "Nexans", "Cobrecom"],  // FROM MD allowed-list
  nbr_refs: ["NBR 13248", "NBR NM 60332-3"],     // FROM MD
  notes: "antichama / dupla isolação / ..."
}
```

Brief tabular view (what distributor sees):

| Bitola | Cor / Função | Metragem | Isolation | V | T(°C) | Marcas aceitas | NBR |
|---|---|---|---|---|---|---|---|
| 2.5 mm² | F (preto) | 480 | HEPR LSOH | 0,6/1 kV | 90 | Prysmian / Nexans / Cobrecom | 13248, NM 60332-3 |
| 2.5 mm² | N (azul) | 480 | HEPR LSOH | 0,6/1 kV | 90 | Prysmian / Nexans / Cobrecom | 13248, NM 60332-3 |
| ... | ... | ... | ... | ... | ... | ... | ... |

**ABNT colors confirmed as standard:**
- F (Fase) = preto / vermelho / cinza
- N (Neutro) = azul claro
- T (Terra) = verde / verde-amarelo

Per Carlos's mono/bi/tripolar comment, polaridade drives how F/N/T multiply per circuit:
- Monofásico = 1F + 1N + 1T
- Bifásico = 2F + 1N + 1T
- Trifásico = 3F + 1N + 1T

`schedule.py` + `abnt.py` should already encode this — verify when wiring the Astro screen.

### The alimentadores / internal-circuits split — TWO sub-flows

| Sub-flow | Length source | Carlos's manual rule |
|---|---|---|
| **Alimentadores (feeders, quadro-to-quadro)** | Projetista provides measurements in Quadro | Apply mono/bi/tripolar multipliers to projetista's number |
| **Internal circuits (within-quadro distribution)** | Projetista does NOT provide measurements | **250m per circuit average** (buffer to avoid asking for aditivos mid-project) |

For internal circuits, Carlos's manual checks per circuit:
- Gauge (bitola)
- Application (iluminação / outlets / motors / AC / etc.)
- Amperes
- F+N+T per polaridade

**Plumbing gap surfaced:**

Current `schedule.py` reads the Quadro de Cargas table as authoritative. It likely **does not** distinguish alimentadores rows from internal-circuit rows, nor apply the 250m/circuit average for internal. That's Carlos's MANUAL rule today.

→ The Astro UI must surface this distinction. Per the pre-build gate: **DO NOT build a 14th analyzer for this yet.** First pass: Astro UI shows the Quadro rows; Carlos tags each row alimentador vs internal; for internal, the UI proposes 250m default; Carlos overrides per-circuit if needed. Once that HITL pattern stabilizes → if it's worth automating → modify `schedule.py`.

Matches memory `feedback_metragem_overestimate` (over-estimate-on-purpose → aditivos worse than leftover material). Confirms it for cable schedule, not just infra metragem.

### Omissos detected here too (cross-artifact)

Confirmed: while quantifying the cable schedule, Carlos diffs Quadro de Cargas ↔ MD ↔ planta. Anything in 1 or 2 of 3 → omisso → query cliente. So omissos detection is **continuous through the takeoff**, not a discrete step. UI must let Carlos flag an omisso at ANY screen, not at a separate "find omissos" page.

### Time baseline (the dogfood target)

- **PROJECT-A PE06 (real project, real complexity)**: cable schedule quantification = **one morning (~4h) with Revu**
- "Most people don't use Revu" — Carlos's edge over peer orçamentistas; Revu has measurement tools that speed manual cable counting

**airio dogfood target:** if Astro UI gets cable schedule quantification from "one morning with Revu" to **<1h end-to-end** for a PE06-size project, that's a real win to show. The tool's value = automate what Revu speeds up for Carlos; deliver it to orçamentistas who don't have Revu (or don't use it).

### Open questions

- Does Carlos's existing Excel cable-BOM file have a fixed template he reuses? (If yes, that template IS the UI's export format spec.)
- Mono/bi/tripolar tagging — comes from the Quadro itself (column), or Carlos infers from circuit context?
- 250m/circuit average — is it 250m flat regardless of bitola? Or 250m for 2.5mm², different for 4mm²/6mm²/...?
- Revu workflow on cable schedule — Carlos uses Revu's measurement tools on the PLANTA to back-check the Quadro's totals? Or Revu just for annotation?

---

## Step 6 — Planta counting (infra first, then devices)

**Carlos (verbatim):**

> 1. My method is to tackle the most numerous and complex first, usually cable housing, e.g. tubulação which has quite a few variations as we could see Teto, parede, Piso, have different specs so it is the most complex, the support and fixation can be done by ABNT standard e.g. a run must have this number of supports and fixation, so this is pure maths.
> 2. A campus such as PROJECT-A I do per building, a building I do per pavement, usually based on each individual planta
> 3. I'm quite proficient in Revu so I use it all
> 4. Once I get the numbers I need to normalize it against the MD so we get the correct pricing from suppliers
> 5. PE06 took me a morning to get to the results I've shared with you

### Primitives surfaced

**Counting order = COMPLEXITY-FIRST, not device-first.**

| Priority | Category | Why Carlos starts here |
|---|---|---|
| **1** | Infra / cable housing / **tubulação** | Most numerous AND most complex (teto/parede/piso variation) |
| 2 | Other infra (eletrocalha, perfilado, leito, busway) | Geometry-based, less variation |
| 3 | Devices (tomadas, AC, luminárias, interruptores) | Pure count; less spec-variation |

**This re-orders the wedge lock's HITL queue spec.** The lock says: "region polygon per casa, AC tagging, drop false pins, polaridade." That's the device flow. Carlos's actual order is INFRA-first → devices second. Astro HITL screens should reflect this: tubulação verification UI before device verification UI.

### Tubulação variation = NEW categorization dim (teto / parede / piso)

| Run location | Spec implication |
|---|---|
| **Teto** (ceiling) | Different support spec, fixation cadence, often eletrocalha-style |
| **Parede** (wall) | Different support spec, embedded vs surface-mount variations |
| **Piso** (floor) | Embedded, different protection class, fewer supports usually |

**Plumbing gap:** Current `ele.py` reads infra layer kinds (eletroduto / eletrocalha / perfilado / leito / busway) via `glossary.py`. It likely does **not** tag each run with teto / parede / piso. This dimension comes from:
- Layer naming convention in the CAD file (per projetista)
- Sheet context (planta de piso vs planta de forro)
- Symbol/annotation on the planta

Per pre-build gate: **do not extend `ele.py` yet.** Surface this in the Astro HITL: when Carlos confirms an infra run, the UI asks "teto / parede / piso?" Defaults proposed from layer+sheet context. Pattern stabilizes → then plumb.

### ABNT support + fixation = downstream math

> "a run must have this number of supports and fixation, so this is pure maths"

Once metragem per run is known + location (teto/parede/piso) tagged → ABNT NBR 5410 / NBR 15465 / NBR 5419 prescribes support spacing (typically 1.5m–2m for eletroduto, varies by diameter + location). Deterministic calculation:

```
supports_count = ceil(run_length / spacing_per_diameter_location)
fixations_count = supports_count  (approx; depends on bracket type)
```

This is a 1st-class **deliverable line** in the BOM (suportes, abraçadeiras, parafusos count), not just metragem. Currently NOT computed by `ele.py`. Future deterministic post-processor — but per gate, NOT a new analyzer yet. Surface in UI: when metragem confirmed, show "ABNT supports: X (auto-calculated)" — Carlos overrides if needed.

### Granularity hierarchy (drives navigation tree in UI) — REVISED

Carlos's actual rollup norm (skim turn answer): **per campus → per building → per pavimento → per SYSTEM.**

```
Campus  (e.g. PROJECT-A PE)
  └── Building  (e.g. PE06)
        └── Pavimento  (e.g. Térreo, 1º andar)
              └── System  (iluminação / tomadas / força / ar-condicionado / SDAI / SPDA / aterramento)
                    └── Planta sheet(s)
                          └── Region(s) within sheet  (casa, área, sala — Carlos draws polygons)
```

**4 levels, not 3.** System is a real dimension Carlos rolls up by — confirmed by the MD I read (MD-EXAMPLE Section 2.1 explicitly says: "as plantas e documentos foram divididos por sistemas, a saber: iluminação e distribuição de tomadas, força e alimentadores, aterramento e SPDA, cabine de medição/gerador, diagramas de quadros, unifilar geral").

**Current rollup mechanism:** Revu exports Excel per sheet → Carlos builds per-pavimento × per-system pivot in Excel. airio replaces this natively (no Excel intermediate).

**Astro UI implication:** navigation panel = this 4-level tree. Counts roll up: planta → pavimento × system → building → campus. The system dim is a 1st-class filter, not an afterthought.

### MD-normalize for pricing (clarification of MD's role)

Earlier: MD = SPECS guide. Now: **MD normalization happens AFTER counting, BEFORE supplier dispatch (final BOM).** The cycle is:

```
Counts from planta  ──►  Normalize against MD specs  ──►  Final BOM  ──►  Supplier pricing
                              │
                              └── (resolves: did MD say "tomada 2P+T" or "tomada universal 20A"?
                                  The count is the number, MD pins the spec → correct unit price)
```

So MD doesn't supply quantities (Quadro does that), but MD pins the **SKU specification** so the supplier quotes the right SKU. UI: every BOM line shows count (from planta) + spec (from MD, editable) + omisso flag if MD silent.

### Revu = Carlos's edge

> "I'm quite proficient in Revu so I use it all"

Revu's measurement, markup, count, and search tools = Carlos's daily driver. The Astro UI must REPLACE Revu (for elétrica takeoff specifically), not just be a viewer. **What Revu does for Carlos = the bar the Astro UI clears.** Asked next.

### Time baseline (tension with earlier estimate)

PE06 device + infra count = **a morning** (in addition to a morning for cable schedule = ~1 working day total).

**Tension flagged:** Carlos's earlier statement was "4-7 days effort, 10 days to deliver." PE06 = ~1 day at the actual counting phase. The gap is either:
- (a) PE06 is small/familiar by now (Carlos has audited it many times for the Aeronet validation → no longer a representative effort);
- (b) The remaining 3-6 days = supplier coordination + omissos cycles + cliente queries + writing the actual proposal/report, not the counting itself;
- (c) Both — counting is fast for a project of Carlos's familiarity; bigger projects (full campus, all 8 disciplines) eat the rest.

Most likely (b) + (c). **The takeoff tool's "morning to <1h" win is the counting phase only**; supplier + omissos + proposal are separate value-adds, not in the immediate UI scope.

### Open questions

- Which specific Revu tools does Carlos use most for elétrica? (Count tool = the AI-Powered Count, Length measurement, Search-and-find on text, Polygon Area, Markups Legend...?)
- Per-pavimento rollup — Carlos does it in Excel today? Or eyeballs from Revu count summaries?
- Teto/parede/piso tagging — is the layer convention reliable per projetista, or does Carlos look at the sheet title to infer?
- ABNT support count today — Carlos computes manually or skips and quotes a bulk allowance?
- Polaridade tagging (mono/bi/tri) for devices — does it happen here in the planta count, or back at the Quadro stage?

---

## Step 7 — Revu workflow (ordered)

**Carlos (verbatim):**

> 1. Scale
> 2. Tools chest
> 3. Understand Layers
> 4. Measuring tool
> 5. Count
> 6. Polygon area
> 7. Once measuring and counts are done creating a custom legend with totals

### The 7-step Revu sequence = the Astro UI's wireframe spec

Each Revu tool maps to a screen / interaction in the Astro UI:

| # | Revu tool | Carlos's action | Astro screen / interaction |
|---|---|---|---|
| 1 | **Calibrate / Scale** | Set scale per sheet (1:50, 1:100, etc.) | Scale confirmation screen — auto-detect from titleblock + Carlos confirms/overrides |
| 2 | **Tool Chest** | Pull from his personal symbol library | Glyph-teaching dictionary — per-symbol mapping accumulated across projects (HITL #2, the moat). **Skim turn correction (2026-05-26):** Carlos's current Revu Tools Chest is "mostly empty" — he rebuilds glyphs per project, no persisted library. → airio's Glyph Dictionary is GREENFIELD capability, not digitization. Accumulation across projects = pure new value-add. |
| 3 | **Understand Layers** | Toggle layer panel, identify which CAD layer = what kind | Layer-kind mapping screen — `glossary.py` config seam, but visual; show layers + propose canonical kind + Carlos confirms/overrides |
| 4 | **Measuring tool** | Lengths along paths | `ele.py` metragem output, displayed per-layer per-run on the planta with overlay |
| 5 | **Count** | Device count by glyph | `points.py` + `quadro_pontos.py` output, displayed as numbered overlay pins |
| 6 | **Polygon area** | Region area (m² per casa / sala) | Region-polygon HITL — Carlos draws polygon per casa, totals roll up |
| 7 | **Custom legend with totals** | Stamps a totals legend back onto the planta | **Output: annotated planta PDF + BOM** (matches wedge lock's "BOM + overlay") |

### Hierarchy reconfirmed: Scale → Tools Chest → Layers BEFORE counting

This is the **3-step setup before any count happens.** UI must enforce this order:
1. Confirm scale per sheet (block counting until set)
2. Activate Tools Chest = pull Carlos's glyph dictionary for this discipline (or seed new entries via vision Intel)
3. Confirm layer-kind mapping per sheet (block counting until layers tagged)

Then counting (steps 4–6) can run.

### Custom-legend-with-totals = deliverable format

Carlos's output isn't just Excel — it's the **planta itself, marked up, with a totals legend stamped on it**. Procurement gets an annotated PDF showing "here's WHAT and here's WHERE." This is the overlay artifact the wedge lock named, confirmed as Carlos's actual deliverable today.

UI implication: BOM export is **two artifacts**:
- (a) Excel cable schedule (for cable distributor, per Step 5)
- (b) **Annotated planta PDF** with totals legend (for cliente + procurement) — must regenerate the PDF with overlays applied

### Tools NOT mentioned (negative signal)

Carlos did NOT list these from my menu — means they're not in his core elétrica flow:

- **Search and Highlight** — text-search across PDF; not a primary tool for him
- **Compare Documents** — revision diff; not in MVP scope
- **Markups Legend** as separate from Tool Chest — they're conflated for him

UI implication: revision diff / change tracking ≠ MVP. Maybe phase 2 if cliente revisions become a pain point.

### Open question (Carlos did not answer the second half of Q7)

> "And — what does Revu NOT do well for you (gaps the airio tool should fill)?"

That answer = the wedge over Revu. Re-asked below.

---

## Step 8 — Revu gaps = the airio wedge

**Carlos (verbatim):**

> Revu is a highly effective dumb tool it nails most of the issues but has no AI on it and is not a brazilian market standard I use it because I've researched and understood that this is the most effective tool to deal with without autocad complexity.
>
> 1. Layer→kind mapping — Revu shows layers but doesn't know "EL-Condutos = eletroduto"
> 2. Quadro de Cargas extraction — Revu can't read the table; you re-type into Excel
> 3. Polaridade / mono-bi-tri tagging — Revu doesn't know circuit polarity; you tag manually
> 4. Omissos detection — Revu can't cross-check Quadro ↔ MD ↔ planta; you do that mentally
>
> In summary all project intel is done by me as Revu is an effective dumb tool used mostly for measurement and counting so no MD at all goes through it

### The wedge over Revu — sharp framing

Revu = **dumb tool** (Carlos's word). Does:
- ✅ Measurement
- ✅ Counting
- ❌ No AI
- ❌ Not BR-market-standard

What Revu DOESN'T do = **project intel layer**. Today, Carlos IS the intel layer (his head). airio's wedge:

**"Revu + Project Intel"** — keep what Revu does well (measurement, counting), add the intel layer that Revu lacks. Or: replace Revu entirely for elétrica because we do both halves.

### 4 confirmed gaps → 4 Astro screens

| Gap | Today (Carlos's brain) | Plumbing | Astro screen |
|---|---|---|---|
| **Layer→kind mapping** | Carlos decodes "EL-Condutos = eletroduto" each project | `intel.py` (Stage-1 Intel) + `glossary.py` (config seam) | Layer-mapping screen: Intel proposes mapping, Carlos confirms/overrides |
| **Quadro de Cargas extraction** | Manual re-type into Excel | `schedule.py` (PyMuPDF `find_tables`) + `header_glossary.py` | Quadro screen: auto-extracted table, Carlos reviews; alimentador vs internal tag (per Step 5) |
| **Polaridade (mono/bi/tri)** | Read from Quadro de Cargas column (skim turn answer — NOT a separate tag stage) | `schedule.py` + `header_glossary.py` already extract Quadro columns including polaridade | NO separate polaridade screen needed — polaridade flows directly from Quadro extraction. The "gap" vs Revu is just that Revu can't read the Quadro table at all; airio's `schedule.py` does. |
| **Omissos capture** | Mental cross-check Quadro ↔ MD ↔ planta as Carlos works | **HITL scaffolding only — NO auto-detect** (per Carlos's correction, Step 3) | Persistent "flag omisso" button on every screen; tool structures + persists Carlos's flags; optional soft hints (low-confidence suggestions, never auto-assertions); drafts cliente email |

### "MD doesn't go through Revu" — 1st-class screen in airio

Today Carlos opens MD separately (mentally cross-references). In Revu, MD is invisible. **In airio, MD must be a 1st-class artifact loaded alongside the planta + Quadro.** UI implication:

- Upload MD (PDF/DOCX/text) as a separate file in the project intake
- MD content indexed/searchable (text + section structure)
- At each BOM line / each omisso → "what does MD say about this?" → cite the relevant MD passage
- MD enables the **SKU spec resolution** layer (Step 6's "normalize against MD for pricing")

This is a NEW intake input not yet plumbed. Per pre-build gate: Astro UI surfaces it as upload + viewer first; OCR / structure-extraction comes later when the HITL pattern stabilizes.

### Positioning shift (memory candidate)

| Before this turn | After |
|---|---|
| airio = "Revu replacement / better Revu" | airio = "**Revu + Project Intel layer**" — the BR-standard tool Revu power-users hoped existed |
| ICP = orçamentistas who don't use Revu | ICP = same as before (specialized LV/MEP firms), but the **value prop differs by user persona**: <br>• Revu users (rare in BR): "skip the mental intel work, do takeoff faster" <br>• AutoCAD/manual users (BR majority): "skip both Revu's measurement AND the intel work, BR-standard tool" |

Worth a memory update? Yes — the "Revu + Intel layer" framing sharpens the wedge lock without contradicting it. **Surface to Carlos for confirmation before writing the memory.**

### Open questions

- Tools Chest deep-dive — what's IN Carlos's personal Tools Chest today? (Specific glyphs / symbol library?) That's the seed for the cross-project glyph-teaching dict (HITL #2 / moat).
- The MD upload + viewer screen — Carlos's MD docs today: PDF? Word? Mix? Does projetista deliver MD always, or sometimes only after omissos query?

---

## Step 9 — MD normalization for SKU pricing

**Carlos (verbatim):**

> Basically what MD is is describing the SPECS of each item that will be used in the project so these specs should be incorporated in the BOM so the supplier knows what exactly to quote.
>
> 1. Yes it is basically that we mostly use description column for that
> 2. Yes "tomada 2P+T 20A 250V branca padrão NBR 14136 marca xyz" if there is an SKU we include that too
> 3. Similar to docs/pdf/<PROJECT-A>/PDF/<MD-EXAMPLE>.pdf but note that [PROJECT-A] MD in particular is too vague
> 4. Usually we flag it and question the customer
> 5. 2-3 hours

### MD's role definition (sharper than Step 5)

**MD = SPECS for each material item in the project.** The orçamentista's job at this stage = lift those specs INTO the BOM **description column**. Supplier reads description → quotes the matching SKU.

```
Quadro de Cargas (numbers, quantities)  ──┐
                                          ├──►  BOM rows
Planta count (device counts)        ──────┤
                                          │
Memorial Descritivo (SPECS text)    ──────┘──►  BOM "description" column populated
                                                + SKU column if MD provides it
```

### BOM row anatomy (confirmed shape)

| Field | Source |
|---|---|
| Count (qty) | Planta count (`points.py`, `quadro_pontos.py`) OR Quadro de Cargas |
| Unit (un / m / kg / etc.) | Per-kind mapping |
| **Description** | **From MD** — e.g. "tomada 2P+T 20A 250V branca padrão NBR 14136 marca xyz" |
| SKU | From MD if provided; otherwise blank or "TBD-supplier" |
| Omisso flag | True if MD silent on this item |
| Section (campus / building / pavimento) | Granularity tree (Step 6) |
| Polaridade | Per-circuit tag (Step 8 gap) |
| Run location | teto / parede / piso (Step 6) — for infra runs |

### Real-world MD quality varies — Carlos's flag

> "[PROJECT-A] MD in particular is too vague"

Implication: airio cannot assume MD is rich/precise. The UI must **gracefully degrade** when MD is vague:
- Vague MD field → show "MD says: '<short snippet>'" + Carlos types/edits description
- Silent MD → Carlos flags as omisso (per Step 3 correction — HITL, not auto)
- Rich MD → auto-populate description, Carlos confirms

**The MD reference file** (`docs/pdf/<PROJECT-A>/PDF/<MD-EXAMPLE>.pdf`) — read 2026-05-26. Format = NBR-style memorial, 56 pages, hierarchical sections (1, 2, ..., 7.1.4 = INTERRUPTORES, 7.1.5 = TOMADAS, 7.1.6 = LUMINÁRIAS, 7.1.15 = INFRA, etc.). "Vagueness" = brand/SKU explicitly deferred ("linha à ser determinada pela arquitetura e decoração"). MD pins: voltage, current, NBR norm, mount type, color. MD does NOT pin: brand, model, SKU.

### AI's realistic role for MD (Carlos's clarification, skim turn)

> "what AI can do is flag the MD items and summarize it"

| ✅ AI can do | ❌ AI cannot do |
|---|---|
| Parse MD into per-item list (tomadas, interruptores, luminárias, infra, conductors, etc.) | Reliably count drawing devices (failed before — `feedback_library_first_not_llm`) |
| Summarize each item's spec (voltage, current, NBR, brand-if-pinned, mount type, vagueness flags) | Auto-diff MD ↔ Quadro ↔ Planta to assert omissos |
| Present items as a CHECKLIST against Carlos's BOM | Decide what's an omisso |
| Cite the source MD section per item (for traceability) | Resolve vagueness ("linha a ser determinada" = Carlos's call) |

**MD-as-checklist workflow:**

```
MD PDF uploaded
  ↓
intel.py-style Stage-1 extraction → structured item list:
  [{ kind: "tomada", section_ref: "7.1.5",
     specs: { voltage: 250, current: 10, nbr: "14136", mount: "embutir", color: "branca" },
     brand: null, sku: null,
     vagueness_flags: ["linha not pinned: pending arq/dec"] },
   { kind: "interruptor", section_ref: "7.1.4", ... },
   { kind: "luminária", section_ref: "7.1.6", ... }, ...]
  ↓
Astro UI surfaces as a CHECKLIST per MD item
  ↓
Carlos eyeballs against his BOM → clicks "✓ matched in BOM" / "⚠️ flag as omisso" / "✗ ignore" per item
  ↓
Omissos list (Step 3) populated from Carlos's "⚠️" clicks
```

The MD item list IS the scaffolding for omissos. Tool extracts the list; Carlos drives the comparison.

Schema validation per `ai-output-handling.md` — Stage-1 MD extraction output passes a strict schema check; on failure, fall back to manual entry (Carlos pastes MD section text per item).

### Omissos appear here AGAIN (continuous detection confirmed)

When MD silent on a counted device → omisso → query cliente. So omissos surface in 3 places:
1. Cable schedule (Step 5)
2. Planta count cross-checks (Step 6)
3. **MD normalization (Step 9 — here)**

All three feed the same omissos list. UI must persist omissos across screens.

### Time baseline

PE06 MD normalization = **2–3 hours.**

PE06 running total now:
- Cable schedule quantification: ~4 h (a morning)
- Planta count (infra + devices): ~4 h (a morning)
- MD normalization: ~2–3 h
- **Subtotal: ~10–11 hours = ~1.5 working days**

Earlier estimate was "4-7 days effort, 10 days to deliver." Subtotal is much less. Remaining ~2.5–5.5 days = (b) supplier coordination + omissos cycles + cliente queries + proposal writing + cross-checks (per Step 6's flagged tension).

**Tension still flagged** — re-resolve at end of walkthrough by asking Carlos what fills the remaining days.

### Open questions

- BOM description column today — Excel cell freeform text, or controlled vocabulary?
- When MD provides an SKU explicitly (e.g. "Pial 057570"), does Carlos send that exact SKU to supplier as "match this or equivalent"?
- The PROJECT-A MD-vague case — what specifically is vague? (Material brand omitted? Spec like wattage missing? Color silent?)

---

## Step 10 — Post-count workflow: pricing, omissos cycle, proposal, delivery

**Carlos (verbatim):**

> Let me clarify it. For a quicker BOM we use SBC, or SINAPI as stated on memory. But for Quadros as they're critical and prices are volatile we need to wait till the supplier responds to add it to BOM
>
> 1. Yes usually we do the described standard procedure
> 2. It depends of the project stage but initially we just report it through email with the query and wait the answers to settle it and include in the BOM, 2 days usually
> 3. Yes After BOM alignment
> 4. I have no workflow on that
> 5. Email

### Pricing has TWO tracks (critical clarification)

| Track | Used for | Source | Timing | UI primitive |
|---|---|---|---|---|
| **Quick BOM** | Most line items (cables, conduit, devices, infra hardware) | **SBC** or **SINAPI** cost tables (BR standards) | Instant lookup, no waiting | Per-BOM-row "SINAPI/SBC reference" column with auto-fetched unit price |
| **Quadro track** | Quadros de Cargas (the physical panel) | Quadro manufacturer quote | ~1 week wait | BOM row with "supplier quote pending" placeholder → swap in when received |

**Why Quadros wait:** prices volatile, critical line item (Quadros are expensive + high-spec → can't ballpark from a table).

**UI implication:** the BOM is **NOT a single artifact emitted once.** It's a **living BOM**:
- v1 (T+0, after counts): all rows priced via SBC/SINAPI EXCEPT Quadro rows = "pending supplier"
- v2 (T+1 week, supplier responds): Quadro rows priced, v1 cable rows can also be refined with cable distributor quote
- v3 (T+omissos resolved): omissos either added (cliente confirmed) or dropped (cliente declined)

Each version is a snapshot. Carlos may need to share v1 internally before v2 lands externally. UI should support BOM versioning.

### Omissos resolution cycle

> "Initially we just report it through email with the query and wait the answers to settle it and include in the BOM, 2 days usually"

- Mechanism: email query to cliente per omisso
- Cycle time: **~2 days per round**
- Iteration: "depends on project stage" → multiple rounds possible
- Resolution states: cliente confirms (→ BOM row added with quantified count) / cliente declines (→ dropped, noted in proposal as "not in scope") / cliente delegates back to projetista (→ wait for projetista, slower)

**UI primitive:** per-omisso state machine (Carlos-driven flags, NOT auto-detected — see Step 3 correction):
```
flagged (by Carlos) → query_drafted (by tool, edited by Carlos) → query_sent (timestamp + recipient) → response_received → resolved (in/out)
```

Email queries today = manual. UI drafts them ("Omisso #3: MD silent on luminária type for sala de reuniões — please confirm Pial 057XXX or equivalent?"). Optional; Carlos edits.

### Proposal writing = AFTER BOM alignment

Confirmed sequencing:
```
Counts done → MD normalized → omissos sent → supplier quotes received → BOM aligned → Proposal written → Email delivery
```

No question yet about the proposal format/content (orçamento PDF, cover letter, annex, markup applied). **Q11 will drill into that.**

### "No workflow on final cross-check" — wedge expansion opportunity

> "I have no workflow on that"

Carlos sends BOM to cliente without a formal review pass today. That's a **gap his current tools (Revu + Excel) don't fill** because they have no notion of BOM completeness.

airio can fill it cheaply: a **pre-send QA checklist** generated automatically:
- [ ] All planta sheets accounted for (vs intake)
- [ ] All Quadro circuits priced (no "pending" left)
- [ ] All omissos in `resolved` state
- [ ] All BOM rows have description (none blank)
- [ ] ABNT support counts computed for all infra runs
- [ ] Polaridade tagged for all cable runs
- [ ] Margins applied

This is a small feature with high trust payoff — Carlos's deliverables get a "verified" stamp. **Logging as a wedge expansion item; NOT building per pre-build gate.**

### Delivery = email

Final deliverable goes to cliente via **email**. UI implication:
- Generate the proposal artifact (PDF — format TBD in Q11)
- Generate draft email with proposal attached
- Carlos reviews + sends from his own mail client (not airio's send) — keep airio out of the SMTP path; reduces compliance surface

### Time accounting (CORRECTED 2026-05-26)

**Prior framing (WRONG — kept for traceability):** I claimed 4-7 days = mostly wait time (omissos cliente + supplier quotes); Carlos's active work was just ~10-11h on PE06. **Carlos corrected:** the 4-7 days = active work scaling by project SIZE. PROJECT-A is a CAMPUS with many plantas + many quadros + multiple buildings. PE06 alone = ~1 day. Full PROJECT-A-class project = many PE-something buildings, ~1 day each, → days add up.

| Phase | One building (PE06-scale) time |
|---|---|
| Skim + go-decision | <1 h (estimate, didn't ask) |
| Cable schedule quantification | ~4 h |
| Planta count (infra + devices) | ~4 h |
| MD normalization | 2-3 h |
| **Per-building active subtotal** | **~10-11 h ≈ 1.5 working days** |

**Scaling to full PROJECT-A-class campus:**
- Multiple buildings (PE01, PE06, PE0N, ...)
- Each building = ~1-1.5 days active work
- Plus campus-level rollup, cross-building consistency checks, single proposal package
- ⇒ **4-7 days TOTAL active work for a campus** (not wait time)

Plus omissos email cycles + supplier quote waits run in PARALLEL with continued counting on other buildings — Carlos doesn't sit idle during waits, he moves to the next building/sheet.

**Sharpened value prop (corrected):**

airio shrinks the per-sheet / per-quadro active work. That shrink **multiplies across N sheets × N buildings** in a campus job. If per-PE06 active work drops from ~1 day → <2h, then a 6-building campus drops from ~6 days → <2 days. **Compounding win, not just one-screen win.** This is a stronger story for the campus-scale ICP than for single-building jobs.

ICP refinement: airio's biggest leverage = campus / multi-building / multi-floor jobs (PROJECT-A, PROJECT-C, <PROJECT-X> factories) where N is high. Single-building/small jobs still benefit but the wow factor is the multi-building compounding.

### Open questions for Q11

- Proposal format (PDF? Word? Custom template?)
- Cover letter / executive summary content
- Markup / margin applied at this stage (or built-in to SBC/SINAPI numbers)?
- Annex format — the BOM Excel + annotated planta PDF?

---

## Step 11 — Proposal + delivery package

**Carlos (verbatim):**

> 1. Combined package with locked (simplified BOM) for commercial protection so our BOM isn't used as a leveler, after negotiations if the customer gives positive feedback with a strong buying intent signal we can disclose the full BOM. So at first we send a simplified BOM without quantitatives, and according to negotiation we disclose accordingly.
> 2. All of it
> 3. Hidden in pricing units (that works only for private market not for public sector)
> 4. Not usual, but we can disclose it once the deal is made
> 5. I think most of proposal templates / brand styling / cliente-relationship stuff but I can be wrong

### 🚨 NEW MAJOR PRIMITIVE — Tiered BOM disclosure (commercial moat)

The BOM is **not one artifact**. It's a single dataset with multiple **disclosure-tier views**.

**Carlos shared real proven templates from a prior project (`docs/pdf/excel-templates/`, read 2026-05-26).** Project name redacted per NDA discipline. The templates map to the tiers:

| File observed | Cols | Tier | What's exposed | What's hidden |
|---|---|---|---|---|
| **Orçamento Resumido** | 10 (only Item/Descrição/Total) | **v1 cliente initial** | Section totals + descriptions only | All qty, unit, codes, SINAPI ref |
| **Orçamento Sintético** | 9 | **v2 negotiation** | Item / Cód SINAPI / Banco / Descr / Und / Quant / Valor Unit / Valor Unit c/ BDI / Total | M.O. / MAT. split |
| **Sintético c/ Mão de Obra** | 12 | **v3 internal or post-deal** | + Tipo (work category) + Mão de Obra Valor + % | MAT. split |
| **Sintético c/ MO + Material** | 13 | **v4 fully unrolled** | + Material per-unit + Labor + Material totals | (nothing — full transparency) |

**Universal header context (all 4 files):**
- **Obra**: project name
- **Bancos**: e.g. "SINAPI - 04/2024 - Rio de Janeiro" — SINAPI integration is REAL and CENTRAL, with month + region pinned per project
- **B.D.I.**: e.g. 35.0% — the markup hidden in unit prices (confirms Step 11 #3 concretely)
- **Encargos Sociais**: e.g. "Não Desonerado: 0,00%"

**Item hierarchy (observed):**
- 1, 1.1, 1.1.1, ... — work-package oriented (services + locations)
- Top-level categories mix SERVICES ("SERVIÇO DE LANÇAMENTO DE CABOS", "CRIPAGEM E CONEXÃO DE CIRCUITO") and INFRA ("INFRAESTRUTURA → SALA DOS GERADORES → PRÉDIO PRINCIPAL → ATERRAMENTO")
- ⚠️ This item hierarchy is **different** from Carlos's mental granularity tree (Campus → Building → Pavimento → System). The Excel hierarchy is the **customer-facing flattening**; the granularity tree is the **internal navigation**. UI must support BOTH views over the same data.

**Definitive BOM row schema (from templates):**

```jsonc
{
  "item": "1.1.1",              // hierarchical numbering
  "sinapi_codigo": "91935",     // SINAPI code per line
  "sinapi_banco": "SINAPI - 04/2024 - Rio de Janeiro",  // basis pinned by month + region
  "descricao": "CABO DE COBRE FLEXÍVEL ISOLADO ...",
  "tipo": "INEL - INSTALAÇÃO ELÉTRICA/ELETRÔNICA",       // labor category code
  "unidade": "M",
  "quantidade": 1170.0,
  "valor_unit": 25.14,          // SINAPI unit cost (without BDI)
  "bdi_pct": 35.0,              // markup %
  "valor_unit_com_bdi": 33.93,  // = valor_unit × (1 + bdi_pct/100)
  "mao_obra_valor": 8868.6,     // labor cost portion
  "mao_obra_pct": 22.34,        // labor as % of total
  "material_valor_unit": 26.35, // material per unit (when split)
  "total": 39698.1
}
```

**Visibility flags per tier** (each field tagged with which tier(s) it's visible in):
- `descricao`, `item`, `total` (rolled section level) → visible in v1+
- `quantidade`, `valor_unit`, `valor_unit_com_bdi`, `total` (line-level), `sinapi_codigo`, `sinapi_banco`, `unidade` → visible v2+
- `tipo`, `mao_obra_valor`, `mao_obra_pct` → visible v3+
- `material_valor_unit` (material split per unit), `mao_obra_total`, `material_total` → visible v4+

The export selector becomes: pick tier → render Excel with tier-appropriate column set → save as .xlsx.

**Why:** commercial protection. If Carlos sends full BOM upfront, cliente can shop it line-by-line to other suppliers, using Carlos's takeoff for free as a price-leveling tool. The tiered disclosure prevents the "leveler" attack — cliente needs to give buying-intent signal before getting more detail.

**This is a moat-level differentiator.** Most takeoff tools export one BOM. airio must support **at least 3 export tiers** with field-level redaction rules. Per pre-build gate: NOT building now; logging as the BOM export screen's required spec.

UI implication:
- Each BOM row has tier flags (`show_in: [internal, v1, v2, v3]`)
- Export targets = picker: "Generate proposal — initial / negotiation / post-deal"
- Quantity column auto-hidden in v1; partial in v2; full in v3
- The annotated planta PDF is a SEPARATE export, gated to v3 by default

### Buyer-type mode: private vs public sector

> "Hidden in pricing units (that works only for private market not for public sector)"

| Market | Markup treatment | Why |
|---|---|---|
| **Private** | Markup hidden inside unit prices | Carlos's margin protected; cliente sees one price |
| **Public sector** | Markup transparent (separate line / disclosed %) | Regulatory transparency (tomada de preços, pregão, licitação rules) |

**UI implication:** project intake screen asks **"private cliente / public cliente?"** That toggle drives:
- BOM unit-price computation (rolled vs unrolled markup)
- Proposal template (private's protective tier-disclosure vs public's full-transparency export)
- Compliance fields (NF, CNPJ, edital ref, etc.) shown only in public mode

Per pre-build gate: log the requirement; first MVP = private-only (Aeronet's current cliente mix); public sector mode = phase 2 once private flow proven.

### Cover content = full proposal package

> "All of it" — exec summary + scope statement + terms (payment, delivery time, validity) + price + BOM

UI implication: proposal template has fixed sections. airio fills the data-driven sections (price, BOM); Carlos fills the prose sections (exec summary, scope statement, terms). Word-style template or PDF generator with content placeholders.

### Annotated planta + full BOM = post-deal disclosure

> "Not usual, but we can disclose it once the deal is made"

Confirms tier 3 gating. The custom-legend-with-totals annotated PDF (from Step 7) = post-deal artifact in cliente-facing flow. Internally Carlos uses it always.

### Scope boundary (sharpened)

| airio's job (data layer + structured outputs) | Carlos's job (proposal craft + commercial judgment) |
|---|---|
| Takeoff data extraction | Proposal copywriting |
| BOM structure + disclosure-tier views | Brand styling |
| Annotated planta export | Cover letter tone |
| Buyer-type markup mode | Cliente relationship + negotiation strategy |
| Compliance fields (NF, CNPJ, public-sector edital ref) | Pricing strategy (overall margin level — Carlos sets the %) |

Carlos's hedge ("I can be wrong") was reasonable — corrected 2026-05-26 after reading the proven Excel templates in `docs/pdf/excel-templates/`. airio DOES generate the proposal Excel files (data + formatting + tier filtering + B.D.I. application + SINAPI integration). Carlos's craft (cover prose / brand / negotiation / cliente relationship) wraps the generated artifact. The boundary is sharp at the **prose-vs-data line**, not at the "airio touches no proposal output" line I overstated earlier.

### Open questions

- Today's "simplified BOM" — what does v1 look like? (Rolled-up by section? Just total? Specific Excel template?)
- Trigger for v2 disclosure — what cliente signal counts as "strong buying intent"? (Carlos's judgment call or a process step?)
- Markup % typical range — 15%? 25%? Per-line vs flat? (Useful to know for default seeding; not required to ask if Carlos prefers not to disclose.)
- Public-sector engagements — does Aeronet take any today, or is it pure private?

---

## Step 12 — TBD (next: what about the MD reference PDF Carlos pointed me at — do I read it now? Or any other workflow gap before we transition to wireframes?)

