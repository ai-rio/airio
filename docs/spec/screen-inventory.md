# airio Astro UI — Screen Inventory + State Models

**Source:** `carlos-takeoff-workflow.md` (11 steps captured + Carlos's skim corrections + Excel templates read 2026-05-26).

**Status flags used:**
- ⚠️ **TENTATIVE** — inference not yet validated against a verbatim Carlos answer
- 🔒 **SPEC DEFERRED** — moat-bearing screen; surface skeleton only, drill detail in dedicated session
- 🟢 **GROUNDED** — backed by Carlos's verbatim or by an artifact I read (template, MD PDF)

**Reading order:**
1. Skim Section A (Screens) — confirm/reject each as a unit; flag wrong ones
2. Skim Section B (State Models) — confirm the cross-cutting state shapes
3. Wireframing happens AFTER inventory approval; per-screen spec drilling per moat screen.

---

## Section A — Screens

19 screens across 6 zones. Routes are illustrative (Astro `src/pages/`).

### Zone 1 — Project Intake & Setup

#### S1 · Project intake (new project)
- 🟢 Route: `/projects/new`
- **Data shown:** project name field; cliente type toggle (private / public) [⚠️ public = phase 2 default off]; discipline picker (elétrica default, locked for wedge); ICP size check ("residential single-family / flat refurb" warning → soft block + override)
- **User actions:** name, pick type, pick discipline, accept ICP warning if applicable
- **Backend calls:** `POST /api/projects` → create project record; persist intake answers
- **Transitions:** → S2 (PDF upload)
- **Moat dep:** none

#### S2 · PDF + MD upload
- 🟢 Route: `/projects/[id]/upload`
- **Data shown:** drag-drop zone for plantas (multi-PDF) + separate slot for MD (single PDF, always upfront per Carlos); MD format = PDF baseline
- **User actions:** drop files; tag each as "planta" / "quadro de cargas" / "memorial descritivo" / "unifilar" / "outro"
- **Backend calls:** `POST /api/uploads` (multipart) → store; trigger background `intel.py` MD parse + per-PDF page-count + sheet-thumbnail render
- **Transitions:** → S3 (skim view) once all uploads complete
- **Moat dep:** none

#### S3 · Skim view (orientation)
- 🟢 GROUNDED (Zone 1 confirmation 2026-05-26)
- Route: `/projects/[id]/skim`
- **Data shown:** thumbnail grid of all uploaded PDF sheets across all files; per-thumbnail badges (size MB, page count, intel-detected type guesses); scope/size estimate widget (m² from MD area extraction if available — MD section 1.2 / "Áreas" per the MD example I read)
- **User actions:** click thumbnails to inspect; tag sheets ("planta de força", "planta de iluminação", "quadro", "unifilar", etc.); confirm/dismiss scope estimate
- **Quality + red flags REMOVED from S3** (Zone 1 decision): live on per-sheet count screen (S9) instead, where Carlos has the sheet open and is actively looking at it.
- **Backend calls:** `GET /api/projects/[id]/sheets`; `POST /api/projects/[id]/sheets/:sid/tags`
- **Transitions:** → S4 (scale) once at least one planta tagged
- **Moat dep:** none

### Zone 2 — Pre-count gates (Revu's first 3 steps)

> Per Revu Step 7 ordered list: Scale → Tools Chest → Layers BEFORE any count. UI enforces this order — counting screens are gated.

#### S4 · Scale calibration per sheet (MVP scope tightened 2026-05-26)
- 🟢 Route: `/projects/[id]/sheets/[sid]/scale`
- **Data shown:** sheet view; titleblock zoom helper showing the auto-detected scale text and where it was read from; preset dropdown if auto-detect fails
- **Layered fallback (per Carlos's "is 2-point overcomplexity" check):**
  - **Tier 1: auto-detect** — PyMuPDF text extraction on titleblock region → match patterns like `Esc[\.:]?\s*1[/:]\s*(\d+)`. 90%+ hit rate on BR elétrica plantas. Carlos confirms (1 click).
  - **Tier 2: preset dropdown** if Tier 1 fails — common BR scales (1:25 / 1:50 / 1:75 / 1:100 / 1:200). Carlos picks (1 click).
  - **Tier 3: default 1:1 + warning** if Carlos marks "sem escala" — per `feedback_metragem_overestimate` (CAD default = 1:1; verify against level marks visually).
  - **Tier 4 (DEFERRED, "Advanced" button only if edge case appears):** 2-point calibration on PDF. NOT in MVP; adds custom overlay UX (drag handles, distance input, snap-to-grid) for a fallback used <10% of time. Carlos has dozens of sheets per project — clicking 2 points × N sheets is tedious. Skip until proven necessary on a real Aeronet project.
- **User actions:** confirm Tier 1 auto-detect (default path) OR pick Tier 2 preset OR mark sem-escala (Tier 3 default 1:1 with warning)
- **Backend calls:** `POST /api/sheets/[sid]/scale` with `{scale_ratio, source: "titleblock_auto" | "preset" | "default_1_1"}`
- **Transitions:** → S5 (Tools Chest) once scale set; this screen is BLOCKING for counting
- **Moat dep:** none (deterministic)

#### S5 · Tools Chest / Glyph Dictionary
- 🔒 **SPEC DEFERRED** — moat-bearing (HITL #2: cross-project glyph teaching)
- Route: `/projects/[id]/glyphs` + global `/glyphs` (Carlos's accumulated dictionary)
- **What's known:**
  - Carlos's current Revu Tools Chest = mostly empty (per skim turn answer). airio's Glyph Dictionary is GREENFIELD capability, accumulating across projects = pure value-add.
  - First-time per project: `intel_points.py` vision reads the project's legend (e.g. top-of-planta or dedicated legend sheet) → proposes symbol↔kind mappings → Carlos confirms each → entries persist to project + propose-to-global dict.
  - Global dict: across-project glyph dictionary. Per-symbol shows: glyph image, canonical kind, projects-of-origin, confirmation count.
- **Needs deeper drill:**
  - Per-glyph confirmation UI shape (visual diff vs library entry?)
  - When does a glyph "graduate" from project-local to global? (Threshold? Carlos-promotes?)
  - Variant handling (interruptor "S" symbol with 1 vs 2 vs 3 marks — same family, different variants)
  - Negative samples (this glyph is NOT a tomada) — needed?
- **Moat dep:** HIGH — this IS the moat. Do not crystallize without dedicated session.

#### S6 · Layer → kind mapping per sheet (cross-project memory ON per Zone 2 decision)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/sheets/[sid]/layers`
- **Data shown:** CAD layer panel (from PyMuPDF parsing); per-layer proposed kind from THREE sources, ranked by confidence:
  1. **Cross-project memory** — "you mapped 'EL-Condutos' → eletroduto in 12 prior projects, accept?" (highest signal)
  2. **`glossary.py` default seed** — encoded BR conventions
  3. **`intel.py` per-project Intel** — LLM proposal from layer name + sheet context (fallback)
- **User actions:** confirm/override per layer kind; saved mapping flows TWO places:
  - per-project (this project, all sheets)
  - global airio dictionary (counter increments: "EL-Condutos → eletroduto: confirmed in N projects")
- **Backend calls:** `GET /api/sheets/[sid]/layers` (returns per-layer 3-source ranked proposals); `POST /api/sheets/[sid]/layer-mapping` (writes project + increments global dict counter)
- **Transitions:** → S7 (Quadro) and → S9 (Planta count); both screens require layer mapping
- **Moat dep:** MEDIUM-HIGH — layer↔kind dictionary accumulation across projects = secondary moat (less central than glyph dict S5, but real). Cross-project memory makes per-sheet layer mapping ~1-click after a few projects, instead of N decisions.

### Zone 3 — Quadro & MD extraction

#### S7 · Quadro de Cargas extraction & review (auto-infer alimentador per Zone 3 lock)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/quadros/[qid]`
- **Data shown:** PDF table preview side-by-side with extracted JSON (`schedule.py` output via `header_glossary.py` + `abnt.py`); columns auto-mapped (bitola, polaridade [Quadro IS the source per Zone 1 — no separate polaridade screen], aplicação, etc.); rows highlighted on PDF when selected in table
- **Auto-inference rule (alimentador vs internal-circuit):** deterministic heuristic from Quadro column structure:
  - If row has explicit `comprimento` / `metragem` value → **alimentador** (projetista provided length, use as-is per Step 5 mono/bi/tripolar multipliers)
  - If row has NO length value → **internal-circuit** (apply 250m default per `feedback_metragem_overestimate`)
  - Other signals: column header naming, row position in table (alimentadores typically grouped at top), polaridade pattern (trifásico more often alimentador)
  - 1-click confirm pattern: airio proposes per-row alimentador/internal flag + length default → Carlos confirms or flips
- **User actions:** verify per-row extraction; confirm/flip per-row alimentador flag (1-click pattern, not manual per-row choice); override internal-circuit 250m default if Carlos has better info
- **Backend calls:** `GET /api/quadros/[qid]/extract` (returns rows with auto-inferred flags); `POST /api/quadros/[qid]/rows/[rid]` (per-row edits / flip flag)
- **Transitions:** → S8 (MD checklist) and → S9 (Planta count); both run in parallel after Quadro done
- **Moat dep:** none (deterministic PyMuPDF extraction + heuristic flag + HITL confirm)

#### S8 · MD checklist (neutral default per Zone 3 lock — Carlos drives every disposition)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/md`
- **Data shown:** AI-parsed MD item list (left pane): per item = section_ref (e.g. "7.1.5"), kind (tomada/interruptor/luminária/etc.), specs summary (V, A, NBR, mount, color), brand-if-pinned, vagueness flags ("linha à ser determinada"); right pane = source MD passage for the focused item
- **Neutral disposition default (Zone 3 decision):** airio does NOT pre-mark items ✓ / ⚠️ / ✗. Per the omissos correction rule (HITL scaffolds, doesn't assert), Carlos's eye stays primary. The tool surfaces the list + the spec summary + the source passage; Carlos decides each disposition. No auto-✓ even when item kind clearly matches a BOM line.
- **User actions:** walk the list — per item, decide and click: ✓ matched in BOM / ⚠️ flag as omisso / ✗ ignore; edit description text if vague; pin brand manually if Carlos has the answer
- **Backend calls:** `GET /api/projects/[id]/md/items` (returns `intel.py`-parsed schema-validated list, all items in `pending` state); `POST /api/projects/[id]/md/items/[iid]/disposition` for ✓/⚠️/✗
- **Transitions:** ⚠️ clicks populate Omissos (S11); rest of items feed BOM descriptions (S15)
- **Moat dep:** LOW — extraction is `intel.py` work, well-bounded by `ai-output-handling.md` rule. Checklist UX is straightforward.

### Zone 4 — Counting phase

#### S9 · Planta count workspace (Zone 4 lock — single canvas with toggle layers, Revu-style)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/sheets/[sid]/count`
- **Single-canvas rendering (Zone 4 decision):** ALL overlays (CAD layers from S6 + device pins from `points.py` + infra metragem runs from `ele.py` + region polygons + omissos pins) render on ONE canvas simultaneously. Layer-toggle panel (Revu-style) on the side lets Carlos hide/show any overlay category independently. No separate tabs/modes for devices vs infra — one workspace, layered visibility.
- **Data shown:** PDF viewer with stacked overlays (toggleable):
  - CAD layers (kind-tagged from S6)
  - Device pin overlay (`points.py` + `quadro_pontos.py`)
  - Infra metragem overlay (`ele.py`, runs colored by kind)
  - Region polygons (per casa/área)
  - Omissos pins (Carlos-flagged locations)
- Ordering per Carlos's preference = **infra first** (Step 6 correction) — UI surfaces infra-overlay first by default; device-overlay toggleable on top
- Polygon region tool active by default for casa/área marking
- Teto/parede/piso tag dropdown on each infra run
- Persistent "flag omisso" button (top-right, opens S11 quick-flag dialog)
- **Per-sheet quality + red flags panel** (moved from S3 per Zone 1) — Carlos rates drawing quality + flags issues while looking at the actual sheet
- **User actions:** confirm/drop pins; draw region polygons (per casa); tag teto/parede/piso per infra run; verify metragem (override per run if needed); flag omissos as you go; rate sheet quality (chip-set or 1-5 + free-text) and tag red flags (missing scale, layer soup, illegible, missing legend, etc.)
- **Backend calls:** `GET /api/sheets/[sid]/count`; `POST /api/sheets/[sid]/pins/[pid]/disposition`; `POST /api/sheets/[sid]/runs/[rid]/location-tag`; `POST /api/sheets/[sid]/regions`; `POST /api/sheets/[sid]/quality`
- **Transitions:** → S10 (rollup view); → S11 (omissos board) for full omisso edit
- **Moat dep:** MEDIUM — depends on S5 glyph dict for pin proposal quality; otherwise grounded.

#### S10 · Per-pavimento rollup (4-dim tree, LIVE per Zone 4 lock)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/rollup`
- **Live rollup mode (Zone 4 decision):** totals update in real-time as Carlos counts on S9 sheets. Implementation: S9's pin/run/region edits push events to a per-project rollup store; S10 subscribes and re-renders affected nodes. Carlos always sees current numbers — no manual refresh, no stale state.
  - Trade-off: more compute / event traffic. Mitigation: throttle/batch updates (debounce 250ms after Carlos's last edit), only recompute affected nodes (not entire tree).
- **Data shown:** 4-level navigation tree: Campus → Building → Pavimento → System (iluminação / tomadas / força / ar-condicionado / SDAI / SPDA / aterramento per the MD I read); per-node aggregated counts (devices) + metragens (infra runs by kind); rolled-up tables; filter by tier (matches S16 disclosure tiers — internal view = full); "last updated" timestamp per node
- **User actions:** drill into any node; export per-pavimento Excel (replaces Revu's per-sheet Excel export)
- **Backend calls:** `GET /api/projects/[id]/rollup?level=pavimento&system=tomadas`; live updates via Server-Sent Events or polling (TBD — implementation detail; CF Worker + DO state-sync pattern supports either)
- **Transitions:** → S15 (BOM workspace) for full BOM editing
- **Moat dep:** none

### Zone 5 — Cross-cutting state surface

#### S11 · Omissos board (paste-back cliente response per Zone 5 lock)
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/omissos`
- **Cliente-response handling (Zone 5 decision):** **paste-back UI**, NOT mailbox integration. airio stays out of Carlos's mailbox + SMTP. Carlos receives cliente's reply via his own email client (Gmail/Outlook/etc.); copy/pastes the reply text into the omisso's "cliente response" field. airio parses no inboxes, auto-matches nothing.
  - Why: MVP simplicity; zero OAuth/IMAP setup; no email-parsing surface; Carlos already reads cliente replies in his own client; copy/paste is 5 seconds.
  - Phase 2+ option (if friction proves real): forward-to-airio inbox at `omissos+<project_id>@airio.com.br` with manual review queue.
- **Data shown:** list of all omissos Carlos has flagged (across S9, S8, etc.); per omisso:
  - Which artifact has/lacks the component (MD ✓/✗, Quadro ✓/✗, Planta ✓/✗)
  - Carlos's quantification estimate (qty + unit)
  - Query-draft text (airio auto-drafts, Carlos edits)
  - State: flagged → query_drafted → query_sent → response_pasted → resolved-in / resolved-out / deferred
  - Cliente response paste-area + timestamp (when pasted)
  - Optional soft-hint suggestions (low-confidence, NEVER auto-omissos per Step 3 correction)
- **User actions:**
  - Edit per-omisso (artifact presence flags, qty, description)
  - Accept/edit auto-drafted query text
  - Copy query to clipboard → send from own mail client
  - Mark "query_sent" with timestamp + recipient
  - **Paste cliente reply** into response field → mark "response_pasted"
  - Decide: resolved-in (qty added to BOM) / resolved-out (dropped, noted as scope exclusion in S16 proposal footer) / deferred (cliente will answer later)
- **Backend calls:** `GET /api/projects/[id]/omissos`; `POST /api/projects/[id]/omissos`; `PATCH /api/projects/[id]/omissos/[oid]`; `POST /api/projects/[id]/omissos/[oid]/response` (paste-back endpoint)
- **Transitions:** resolved-in omissos populate BOM rows in S15
- **Moat dep:** MEDIUM — structured persistence of orçamentista omissos discipline IS a moat capability (per Step 3 corrected primitive).

### Zone 6 — Supplier flow + Output / Proposal

#### S12 · Supplier contact book (REVISED 2026-05-26 from real PEDIDO file)
- 🟢 Route: `/settings/suppliers`
- **Data shown:** schema mirrors Carlos's actual CONTATOS DE COMPRAS sheet:
  ```
  empresa (razão social)
  categories (multi-tag): ELETRICOS, HIDRAULICOS, FERRAMENTAS, ELETROCALHAS,
                         PERFILADOS, SPK, INFRAESTRUTURA, TINTAS, EPIS, ...
                         (from real TIPO DE MATERIAL column observed)
  localizacao: city / region (e.g. BRASILIA, SAO PAULO, ...)
  contacts: [
    {role: "VENDEDOR LOTUS" or per-obra, nome, tel_celular, tel_loja, email},
    {role: "VENDEDOR AERONET" or general-account, nome, tel_celular, email}
  ]
  notes: free-text (e.g. "NÃO TRABALHAM COM TIGRE", brand exclusions, etc.)
  preferred_for: [cable, quadro, eletroduto, ...]  // optional Carlos tag
  ```
- **User actions:** add/edit/delete suppliers; multi-tag categories; mark preferred per category; add notes (brand exclusions etc.)
- **Backend calls:** `GET /api/suppliers`; `POST /api/suppliers`; `PATCH /api/suppliers/[sid]`
- **Transitions:** referenced from S13
- **Moat dep:** none

#### S13 · Dispatch (multi-supplier PEDIDO)
- 🟢 GROUNDED (schema confirmed from real `MODELO DE PEDIDO` Carlos shared 2026-05-26)
- Route: `/projects/[id]/dispatch`
- **Data shown:** per-project dispatch dashboard with two tracks:
  - **Quadro track:** raw project PDF + pick 1-N quadro manufacturers from S12; email draft
  - **Cable / material track (PEDIDO format — proven Aeronet template):**
    ```
    HEADER:
      faturamento_entity + cnpj (Aeronet billing entity)
      pedido_num (auto-increment per project)
      data
      encarregado (Carlos or designate)
      obra (project name)
      4 supplier slots (LOJA 1..4) — pick from S12 filtered by category

    ROWS:
      item_num | quantidade | embalagem (MTS/UN/KG) | descricao
      [supplier_1.valor_unit | total] [supplier_2.valor_unit | total]
      [supplier_3.valor_unit | total] [supplier_4.valor_unit | total]
      // Excel formulas baked: total = SUM(quant × valor_unit)

    STATUS TRACK (row 1 banner, MVP scope):
      EFETUANDO PEDIDO  →  COMPRA LIBERADA  →  [exit airio scope: procurement]
    ```
  - Cable descricao format follows Aeronet convention observed:
    `CABO {brand-if-pinned}{line-if-pinned} {isolation} {temp}º {voltage} {bitola} {color}`
    Example: `CABO CORFIO ATOX-FLEX 450/750...` or `CABO FLEXIVEL HEPR 90º 0,6/1KV 2,5mm² PRETO`
- **User actions:** pick 2-4 suppliers per track (S12 filtered); pedido auto-generates as Excel matching MODELO DE PEDIDO format; generate email draft; (later) WhatsApp link
- **Backend calls:** `POST /api/projects/[id]/pedidos` → creates pedido record; `GET /api/projects/[id]/pedidos/[pid]/export` → returns `.xlsx` in MODELO DE PEDIDO format
- **Transitions:** → S14 (quote inbox / pedido comparison)
- **Moat dep:** LOW — schema fully observed from real file

#### S14 · Quote inbox / Pedido comparison
- 🟢 GROUNDED (multi-supplier comparison pattern observed)
- Route: `/projects/[id]/pedidos/[pid]`
- **Data shown:** active pedido as a side-by-side multi-supplier comparison view:
  - Item rows on the left
  - One column-pair per supplier (Valor unit | Valor total)
  - Per-row "winner" pill highlighting cheapest (or Carlos's manual pick)
  - Per-supplier total at bottom
  - Status track widget (EFETUANDO / LIBERADA / etc.)
- **User actions:** upload/paste returned pedido sheet (airio reads supplier columns); manual entry of returned prices if pasted via email/WhatsApp; pick winner per row OR auto-pick cheapest; "integrate into BOM" → flows winning prices into S15 BOM rows
- **Backend calls:** `POST /api/projects/[id]/pedidos/[pid]/responses` (multipart or row-edit); `POST /api/projects/[id]/pedidos/[pid]/integrate`
- **Transitions:** → S15 (BOM workspace, prices updated)
- **Moat dep:** none

> **Scope LOCKED 2026-05-26:** MVP = **Pre-bid only**. airio's PEDIDO lifecycle = 2 states (EFETUANDO PEDIDO + COMPRA LIBERADA). After COMPRA LIBERADA, Carlos's existing Aeronet workbook handles full procurement execution (EM ANDAMENTO, CONCLUIDA, ENTREGUE, etc.). Tightest wedge confirmed. Post-LIBERADA scope = phase 2+, NOT MVP.

#### S15 · BOM workspace (internal)
- 🟢 Route: `/projects/[id]/bom`
- **Data shown:** all BOM rows with full schema (per templates I read):
  ```
  item · sinapi_codigo · sinapi_banco · descricao · tipo · unidade · quantidade ·
  valor_unit · bdi_pct · valor_unit_com_bdi · mao_obra_valor · mao_obra_pct ·
  material_valor_unit · total · omisso_flag · quote_source (SINAPI / supplier_quote / manual)
  ```
  ; filters by system / pavimento / kind / source / omisso state
- **User actions:** edit description (from MD), pin SKU, override quantity, override unit price, set markup per line (or use project-level B.D.I.); rows can be marked tier-visibility (v1/v2/v3/v4 column subsets)
- **Item hierarchy = HYBRID model (Carlos's skim turn answer):**
  - airio PROPOSES default item numbering from the granularity tree (Campus → Building → Pavimento → System): e.g. Building "PE06" → item 1; System "Iluminação" within PE06 → item 1.1; BOM lines → 1.1.1, 1.1.2, ...
  - Carlos REFINES — reorders, inserts work-package sections ("SERVIÇO DE LANÇAMENTO DE CABOS", "CRIPAGEM E CONEXÃO DE CIRCUITO" — services-first items that don't live cleanly in the tree)
  - Numbering is an EDITABLE VIEW over the underlying data, not a re-shaping; the same BOM row rolls up under tree (S10) AND under item hierarchy (S15/S16). Persistence: per-project numbering saved.
- **Backend calls:** `GET /api/projects/[id]/bom`; `PATCH /api/projects/[id]/bom/[rid]`; `PATCH /api/projects/[id]/bom/structure` for item-numbering edits
- **Transitions:** → S16 (tier picker for export)
- **Moat dep:** none

#### S16 · Tier disclosure picker (export)
- 🟢 Route: `/projects/[id]/export/proposal`
- **Data shown:** four tier cards (v1 Resumido / v2 Sintético / v3 Sintético+MO / v4 Sintético+MO+MAT) with column-list previews matching the templates I read; per-tier "what's exposed / what's hidden"; project-level B.D.I. setting (default e.g. 35%); SINAPI banco setting ("SINAPI - MM/YYYY - Region") with per-project month/region
- **User actions:** pick tier → preview → "Generate Excel" → downloads `.xlsx` matching the template format Carlos already uses
- **Backend calls:** `POST /api/projects/[id]/export/proposal?tier=v1|v2|v3|v4` → returns `.xlsx`
- **Transitions:** → S19 (email composer)
- **Moat dep:** LOW — tier filtering is a column-set selector + Excel writer; concrete spec from templates.

#### S17 · Annotated planta PDF export (overlay) — CONTINUOUS regeneration per Zone 6 lock
- 🟢 GROUNDED 2026-05-26
- Route: `/projects/[id]/export/overlay`
- **Continuous regeneration (Zone 6 decision):** annotated PDF reflects current project state automatically. As Carlos counts/edits on S9, as omissos resolve on S11, as BOM lines change on S15 — the overlay PDF stays fresh.
  - Implementation: PDF regenerated server-side on relevant events (debounced ~5s after last edit per sheet); preview always shows latest. No "Generate" button click needed.
  - Trade-off: more compute. Mitigation: per-sheet caching, only re-render sheets whose data changed; final download is a snapshot of the latest cached render.
- **Data shown:** live preview of annotated PDF — pins numbered, regions colored, totals legend stamped on each sheet (Carlos's Revu Step 7 #7 output); "as of {timestamp}" indicator
- **User actions:** pick sheets to include in export (default: all); pick legend position (default: top-right); "Download current snapshot" → `.pdf`
- **Backend calls:** `GET /api/projects/[id]/export/overlay/preview` (cached, fresh); `POST /api/projects/[id]/export/overlay/download` → returns `.pdf` snapshot
- **Transitions:** → S19 (email composer); per Step 11 disclosure rules, this export is **post-deal default** (cliente-facing only after deal close)
- **Moat dep:** none

#### S18 · Pre-send QA checklist (small MVP per Zone 6 lock — wedge expansion)
- 🟢 GROUNDED for MVP scope 2026-05-26 (was ⚠️ TENTATIVE)
- Route: `/projects/[id]/export/qa`
- **Small MVP checklist (Zone 6 decision):** ship with the obvious deterministic checks; expand once Carlos's pattern stabilizes. Skip anything that requires judgment calls or risks over-assertive blocks.
- **MVP checks (deterministic, all simple):**
  - [ ] All planta sheets have scale set (S4)
  - [ ] All planta sheets have layer mapping complete (S6)
  - [ ] All BOM rows have a `descricao` (non-empty)
  - [ ] All BOM rows have a `quantidade > 0`
  - [ ] All BOM rows have either SINAPI price OR supplier_quote integrated (no rows with `quote_source = null`)
  - [ ] All omissos in `resolved_in` / `resolved_out` state (none `flagged` / `query_sent` / `deferred`) — warning only, not blocking (cliente reply may be slow; Carlos overrides)
  - [ ] Project-level B.D.I. set (S15/S16)
  - [ ] SINAPI banco pinned ("SINAPI - MM/YYYY - Region") for the project
- **Out-of-MVP checks (phase 2):** ABNT supports computed; cross-discipline omissos; spec-compliance lint
- **User actions:** click failed check → jump to source screen (deep-link); per-check "force send" override (logged); "Send anyway" bypass with confirmation
- **Backend calls:** `GET /api/projects/[id]/qa-report` → returns ordered check list with status + deep-link slugs
- **Transitions:** unblocks S19 send (warnings don't block; errors require override)
- **Moat dep:** LOW — small feature, high trust payoff. Phase 2 expansion guided by which checks Carlos overrides most (= candidates for removal or refinement)

#### S19 · Email composer (delivery)
- 🟢 Route: `/projects/[id]/send`
- **Data shown:** draft email with cliente address (from intake), subject auto-filled, body template with project name + tier label, attachments preview (selected proposal `.xlsx` from S16; optional annotated PDF from S17 if post-deal)
- **User actions:** edit; copy to clipboard for Carlos's own mail client (airio stays out of SMTP per Step 11); or "open in Gmail compose" link
- **Backend calls:** `GET /api/projects/[id]/email-draft?tier=v1`
- **Transitions:** terminal screen for current proposal cycle
- **Moat dep:** none

---

## Section B — State Models (cross-cutting)

### SM1 · Living BOM versioning

BOM is a single dataset with multiple **time-snapshots** (NOT confused with tier views which are filtered exports of the current snapshot):

```
v0  (project created)
 │
 v_quick  (counts done, SINAPI/SBC priced, Quadro rows = pending-supplier)
 │
 v_supplier  (quadro mfr + cable distrib quotes arrived, integrated)
 │
 v_omissos_resolved  (cliente confirmations integrated, scope adjusted)
 │
 v_final  (locked snapshot for delivery)
```

Each transition logs which rows changed + source (SINAPI quick / supplier_quote / cliente_response). UI shows current vs prior to communicate "what changed" to Carlos.

### SM2 · Omissos lifecycle

```
flagged (by Carlos in S9 / S8 / S11)
 │
 query_drafted (Carlos writes / accepts auto-draft in S11)
 │
 query_sent (Carlos sends via his own email; logs timestamp + recipient in S11)
 │
 response_received (Carlos pastes response or marks received in S11)
 │
 resolved_in  ←─┬─→ resolved_out  (Carlos decides)
                │
                └─→ deferred  (cliente will answer later)
```

`resolved_in` populates a BOM row in S15. `resolved_out` logs in proposal as scope exclusion (footer in S16 export). `deferred` keeps the omisso visible in S11 with status indicator.

### SM3 · Multi-supplier PEDIDO lifecycle (revised 2026-05-26)

Per real MODELO DE PEDIDO. Pre-bid scope only for MVP — post-COMPRA LIBERADA states are procurement-phase (out of wedge scope unless Carlos extends).

```
EFETUANDO PEDIDO  (S13 draft — Carlos populates item rows + picks 2-4 suppliers)
 │
SENT  (dispatched via S13 — pedido .xlsx delivered to N suppliers via email/WhatsApp)
 │
QUOTES_PARTIAL  (≥1 supplier responded; S14 shows per-supplier column filling in)
 │
QUOTES_COMPLETE  (all suppliers responded OR SLA expired and Carlos closes the cycle)
 │
INTEGRATED  (Carlos picks winners per row → SM1 transitions v_quick → v_supplier)
 │
COMPRA LIBERADA  (bid approved by cliente — MVP scope EXIT)
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 │  (phase 2: airio extends into procurement)
COMPRA EM ANDAMENTO → COMPRA CONCLUIDA → MATERIAL ENTREGUE → ...
```

Stale dispatches (>SLA, default ~1 week per Step 4) surface as warnings in S14. Per-supplier SLA configurable in S12.

### SM4 · Pre-count gates (scale + layers)

Counting screens (S9) are **gated** — UI blocks counting interactions until:
- `sheet.scale_set` = true (from S4)
- `sheet.layer_mapping_complete` = true (from S6)

Tools Chest (S5) is **not blocking** — Carlos can count with vanilla `points.py` defaults; glyph dict accelerates over time but doesn't gate.

### SM5 · Disclosure-tier visibility filter

Per BOM row field, a visibility map per tier (from templates I read):

```
v1 (Resumido):   item, descricao_section, total_section
v2 (Sintético):  v1 + sinapi_codigo, sinapi_banco, descricao_line, unidade, quantidade, valor_unit, bdi_pct, valor_unit_com_bdi, total_line
v3 (+ MO):       v2 + tipo, mao_obra_valor, mao_obra_pct
v4 (+ MO + MAT): v3 + material_valor_unit, mao_obra_total, material_total
```

S16 export selector picks one tier; renders `.xlsx` with that column subset. No data loss in the underlying store; just filtered view.

---

## Inventory at a glance — FINAL after Carlos's zone-by-zone pass 2026-05-26

| Zone | Screen | Status | Moat dep | Key decision (Zone X lock) |
|---|---|---|---|---|
| 1 · Intake | S1 Project intake | 🟢 | none | cliente type (private/public) AT intake |
| 1 · Intake | S2 PDF + MD upload | 🟢 | none | MD = PDF upfront baseline |
| 1 · Intake | S3 Skim view | 🟢 | none | quality+red-flags MOVED to S9 |
| 2 · Pre-count | S4 Scale calibration | 🟢 | none | auto-detect + preset; **NO 2-point** in MVP |
| 2 · Pre-count | **S5 Tools Chest / Glyph Dict** | 🔒 DEFERRED | **HIGH (moat)** | dedicated session later |
| 2 · Pre-count | S6 Layer → kind mapping | 🟢 | MEDIUM | cross-project memory ON |
| 3 · Extract | S7 Quadro extraction | 🟢 | none | auto-infer alimentador (1-click confirm) |
| 3 · Extract | S8 MD checklist | 🟢 | LOW | NEUTRAL default — Carlos drives all ✓/⚠️/✗ |
| 4 · Count | S9 Planta count workspace | 🟢 | MEDIUM (S5) | single canvas + toggle layers + quality panel |
| 4 · Count | S10 Per-pavimento rollup | 🟢 | none | LIVE rollup (debounced + SSE) |
| 5 · State | S11 Omissos board | 🟢 | MEDIUM | paste-back cliente response (no SMTP/IMAP) |
| 6 · Supplier | S12 Supplier contact book | 🟢 | none | full schema from real CONTATOS DE COMPRAS |
| 6 · Supplier | S13 Dispatch (PEDIDO) | 🟢 | none | MODELO DE PEDIDO multi-supplier; pre-bid only |
| 6 · Supplier | S14 Pedido comparison | 🟢 | none | side-by-side N suppliers + winner pick |
| 6 · Output | S15 BOM workspace | 🟢 | none | HYBRID item hierarchy (tree proposes, refine) |
| 6 · Output | S16 Tier disclosure picker | 🟢 | LOW | 4 tiers from real orçamento templates |
| 6 · Output | S17 Annotated planta PDF | 🟢 | none | CONTINUOUS regeneration |
| 6 · Output | S18 Pre-send QA checklist | 🟢 (small MVP) | LOW | 8 deterministic MVP checks; override-able |
| 6 · Output | S19 Email composer | 🟢 | none | copy-to-clipboard / open in Gmail |

**Counts:** 19 screens · 5 state models · **18 🟢 grounded** · 1 🔒 moat-deferred (S5) · 0 ⚠️ tentative remaining.

**State models:** SM1 Living BOM versioning · SM2 Omissos lifecycle · SM3 Multi-supplier PEDIDO lifecycle · SM4 Pre-count gates · SM5 Disclosure-tier visibility filter — all GROUNDED.

---

## What to do with this doc

1. **Carlos's pass:** walk Section A top → bottom. For each screen, mark "yes / no / different" + brief why for any "no/different." Pay extra attention to ⚠️ TENTATIVE screens.
2. After approvals, drill **S5 (Tools Chest / Glyph Dict)** as its own session — it's the moat and deserves dedicated UX exploration.
3. Once S5 spec lands, wireframing per screen (Carlos defines the design tokens / typography / color — per `_legacy/design-system.md` warning, do NOT inherit Tagsmith's old system).
4. Then Astro routing scaffold + per-screen build, gated by pre-build gate (each PR ships a screen Carlos can dogfood on a real Aeronet PDF).

---

## Open per-screen questions (per advisor's PER-SCREEN bucket — defer to wireframe phase)

- S1: project size cutoff in numbers (m² / R$ floor); private/public sector toggle UX
- S3: drawing quality + red flags — chip-based or free-text?
- S4: per-sheet titleblock auto-detection — `intel.py` extension or PyMuPDF text-position heuristic?
- S5: full deferred drill (see 🔒 section)
- S7: 250m/circuit override granularity (per bitola? flat?)
- S9: teto/parede/piso default heuristic — from layer name? sheet title? Carlos always picks?
- S11: cliente-response inbox — paste-back UI or actual mailbox integration?
- S12: supplier track-record metrics — useful or noise?
- S13: WhatsApp link mechanics on web (wa.me works; auto-attach files via WhatsApp Business API — phase 2)
- S15: B.D.I. per-line override vs project-wide
- S16: SINAPI banco picker — current month default with override, or always Carlos picks?
- S17: legend position default — top-right, top-left, bottom?
- S18: which checks are blocking vs warning?

---

*Last updated: 2026-05-26 (post-skim corrections + Excel templates read).*
