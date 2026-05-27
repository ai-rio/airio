# Design System — airio

> Canonical agent-facing reference. For full token detail + rationale, see `docs/spec/design-tokens.md`. This file is the quick-look during build.

**Locked:** 2026-05-26 via `/design-consultation`. Memorable thing: *"airio lets me scale 3-5 → 10+ proposals/month."* Throughput tool, not polish product.

---

## Product Context

- **What this is:** BR low-voltage electrical estimator SaaS (Astro on Cloudflare Workers Static Assets → CF Container Python pipeline)
- **Who it's for:** Brazilian orçamentistas at specialized LV/MEP firms. n=1 first user = Carlos at Aeronet
- **Space:** BR construction estimating. Peers: Bluebeam Revu (incumbent), Kreo, STACK, Togal, Sienge
- **Project type:** Productivity tool / data-dense web app. Desktop-primary. ~10h/day use during active bid prep

## Aesthetic Direction

- **Direction:** **Engineering-drawing DNA.** Drafted, industrial, instrument-panel feel. Borrows visual language from electrical drafting (the artifact orçamentistas live inside) instead of cloning Linear or Sienge.
- **Decoration level:** **Minimal.** Typography does the work. No textures, no gradients, no decorative blobs.
- **Mood:** *"Made by an engineer, for engineers."* Workmanlike. Throughput. Drafting-table substrate, not landing-page surface.
- **Reference cues (not to clone):** Bluebeam Revu (utility), Linear (restraint), engineering drawings + drafting conventions

## Typography

- **Display + Body + UI:** **Bricolage Grotesque** (Google Fonts, SIL OFL, variable: weight + grade + width axes)
  - Mathieu Triay design with subtle industrial / measurement-annotation character
  - Self-host via `@fontsource/bricolage-grotesque` (~70KB variable file)
  - Rationale: distinct from Inter/Geist/IBM Plex Sans (the AI-default sans monoculture)
- **Data / Tables / Codes / Item numbers:** **Iosevka** (free OFL, variable, condensed monospace)
  - Engineering-tool DNA, drafting-CAD feel
  - Condensed: ~30% more characters per row than JetBrains/Geist Mono → dense BOM tables fit better
  - Self-host via `@fontsource/iosevka` (~80KB variable file)
  - Tabular-nums first-class
  - Rationale: distinct from JetBrains Mono / Geist Mono / Fira Code (AI-default mono trio)

### Type Scale (px)

| Token | Size | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-xs` | 11 | 16 | 500 | Tags, badges, metadata, chips |
| `--text-sm` | 13 | 18 | 400 | Table cells, labels, helper text |
| `--text-base` | 14 | 20 | 400 | Body (default UI text) |
| `--text-md` | 15 | 22 | 400 | Slightly emphasized body, primary inputs |
| `--text-lg` | 16 | 24 | 500 | Section headers, modal titles |
| `--text-xl` | 18 | 26 | 600 | Page subtitles, prominent labels |
| `--text-2xl` | 22 | 30 | 600 | Page titles |
| `--text-3xl` | 28 | 36 | 600 | Project name / hero label (max heading) |

**Always apply `font-variant-numeric: tabular-nums` to columns of numbers (quantities, prices, SINAPI codes, item nums).**

## Color

- **Approach:** **Restrained.** ~95% neutrals (grayscale). One accent color, used sparingly. Semantic colors for status only.

### Accent (LOCKED) — Construction safety orange

- `--color-accent: #ea580c` (Tailwind orange-600) — Primary CTAs, links, active states, focus rings
- `--color-accent-hover: #c2410c` (orange-700)
- `--color-accent-soft-bg: #fff7ed` (orange-50) — Subtle accent backgrounds (selected row, info panel)
- `--color-accent-soft-fg: #9a3412` (orange-800) — Text on accent-soft-bg

**Discipline:** orange appears for primary actions / links / focus rings only. Never decorative. Never overlaid on PDF (overlay palette is separate). One primary CTA per screen max.

### Neutrals (workhorse — 95% of pixels)

- Backgrounds: `#ffffff` (app), `#fafafa` (surface), `#ffffff` (elevated/cards/modals), `#f5f5f5` (disabled)
- Text: `#0a0a0a` (primary, NOT pure black), `#525252` (secondary), `#737373` (muted), `#a3a3a3` (disabled)
- Borders: `#f0f0f0` (subtle), `#e5e5e5` (default), `#d4d4d4` (strong)

### Semantic Status

- Success: `#16a34a` text on `#f0fdf4` bg — resolved omissos, integrated quotes
- Warning: `#d97706` text on `#fffbeb` bg — stale dispatches, MD vagueness, force-send overrides
- Danger: `#dc2626` text on `#fef2f2` bg — missing required, blocking errors
- Info: `#0284c7` text on `#f0f9ff` bg — hints, secondary CTAs

### PDF Overlays (S9 planta count workspace ONLY — not chrome)

- Eletroduto `#2563eb` | Eletrocalha `#16a34a` | Perfilado `#ca8a04` *(amber, yellow-shifted to avoid clash with accent)* | Leito `#7c3aed` | Busway `#db2777` | Device pin `#dc2626` | Region `rgba(37, 99, 235, 0.15)` | Omisso `#f59e0b`

### Dark mode

**Deferred from MVP.** Light only. Reconsidered if Carlos requests after dogfooding. Single-theme = half the design surface.

## Spacing

- **Base unit:** 4px
- **Density:** dense default (32px row height, tight padding). Optional `comfortable` toggle per screen (40px row, 1.5× padding)
- **Scale:** `--space-1: 4`, `-2: 8`, `-3: 12`, `-4: 16`, `-5: 20`, `-6: 24`, `-8: 32`, `-12: 48`, `-16: 64`

## Layout

- **Approach:** hybrid (grid-disciplined within app, no creative-editorial for productivity)
- **Max content width:** 1440px (centered)
- **Sidebar (nav tree / omissos drawer):** 280px fixed
- **Border radius scale:** `--radius-none: 0`, `-xs: 2`, `-sm: 4` (default), `-md: 6` (cards), `-lg: 8` (modals). NEVER > 8px.

## Motion

- **Approach:** minimal-functional. Animate UI chrome (hover, focus, panel open/close). DO NOT animate data updates (rollup totals, BOM line edits) — instant feels faster.
- **Easing:** `--ease-default: cubic-bezier(0.2, 0, 0, 1)` | `--ease-out` (entrances) | `--ease-in` (exits)
- **Duration:** `--motion-fast: 120ms` (button hover, input focus) | `--motion-normal: 200ms` (panel/modal) | `--motion-slow: 300ms` (page transitions)

## Logo / Mark — `ai·rio`

- **Wordmark:** lowercase `airio` with U+00B7 middle dot between `ai` and `rio`: **`ai·rio`**
- **Typeface:** Bricolage Grotesque SemiBold (600), letter-spacing -0.01em
- **Color:** `#0a0a0a` on light surfaces
- **Symbolic reading:** the center-dot reads as a measurement point / outlet / circuit node — engineering-drawing primitive
- **Sizing:** display 28-32px / navigation 16-18px / favicon source = center-dot scaled
- **NOT to do:** no gradients on wordmark, no stroke/outline, no tagline lockup, no stock-construction icons, no emoji middle-dot

Tier 3 brand identity (full mark + custom symbology) deferred to phase 2 — after 3+ paying orçamentistas.

## Workflow UX Principles

Locked 2026-05-27. Industry-anchored: 100% of estimating-tool peers (Bluebeam Revu, Kreo, STACK, Togal, Sienge eCustos, PlanSwift) use multi-phase navigation. Same for Revit / ArchiCAD. Multi-phase is the category norm because estimating output is contractual + procurement-bound — phases give **auditability, defensibility, save/resume**. The orçamentista hands procurement a deliverable signed by the phase order taken.

Single-canvas tools (Linear, Figma, Notion) only get away with collapsed flows because their outputs are low-stakes. Estimating outputs cost real R$ when wrong.

### Principle 1 — Multi-phase navigation, NOT single-canvas

Keep the 8 phases visible + distinct: **Cadastro · Documentos · Triagem · Preparação · Quadro de Cargas · Memorial · Quantitativos · Orçamento**. Each phase = its own screen / state. Linear progress strip shows where the orçamentista is.

**Do NOT collapse phases to "fewer clicks."** Collapsing destroys per-phase save points, audit trail, and the buyer-facing defensibility of "this is the order I took the takeoff in."

### Principle 2 — Throughput wins INSIDE each phase, not by collapsing phases

The "scale 3-5 → 10+ proposals/month" memorable-thing is met by making EACH phase near-clickless, not by removing phases. Target: **<2 min active time per phase on a familiar project**. Tools per phase:

- **Smart defaults**: auto-tag, auto-detect, auto-propose from cross-project dictionaries (layer→kind, filename→sheet-type, titleblock→scale).
- **Bulk actions**: "aceitar todos" / "aplicar a todas as plantas" / multi-select + apply.
- **Keyboard shortcuts**: power-user paths visible in chrome (`⌘ + Enter · próximo`).
- **Progressive disclosure**: simple by default, depth on demand (advanced settings collapsed, expand only if needed).
- **Non-blocking navigation**: orçamentista can jump back to any prior phase, not forced linear wizard.

### Principle 3 — Phases are mental modes, NOT just screens

When deciding whether two activities deserve separate phases, ask: **"are they distinct mental modes?"** Different mental modes = separate phases even if they touch similar data.

Example: Triagem vs Preparação share "pre-count setup" but are distinct mental modes:
- Triagem = thumbnail-level classification ("qual é qual")
- Preparação = sheet-content-level configuration ("como medir cada planta")

Different modes → separate phases. Same mode → one phase. The 8-step decomposition reflects 8 distinct mental modes per Carlos's verbatim workflow.

### Principle 4 — Auditability is a 1st-class UX surface

Every phase records what Carlos did + when + which defaults he accepted vs overrode. This trail becomes:
- The defensibility behind the orçamento ("here's what I checked, in this order")
- The omissos report justification (per Step 3 spec)
- The HITL audit trail for buyer trust (per `observability.md` rule)

UI implication: timestamp the rascunho ("Rascunho salvo automaticamente · há 4s"), show phase-completion checkmarks, log per-row overrides in the BOM.

---

## Anti-patterns (never)

- ❌ Inter / Geist / IBM Plex Sans / Roboto / JetBrains Mono / Fira Code (AI-default sans + mono)
- ❌ Purple/violet gradient hero (AI-slop signature)
- ❌ Bright white shadows / chromatic shadows
- ❌ Border-radius > 8px (the bubble-radius marketing-app aesthetic)
- ❌ Dark mode in MVP (deferred)
- ❌ Pure black text (`#000000` — use `#0a0a0a`)
- ❌ Display-size fonts (>32px) — no hero sections in a working tool
- ❌ Animating data updates — feels slow, distracts
- ❌ Decorative orange — accent is for primary actions / focus / links only
- ❌ Inherit Tagsmith's old design system (`.claude/rules/_legacy/design-system.md`)
- ❌ **Dev-internal language in user-facing UI** — banned in copy: "wedge MVP", "MVP", "fase 2 do roadmap", "v0.X", "compounding", "ICP", "airio é o instrumento" (founder-cosplay), "wedge", any internal product-strategy framing. Future-feature messaging: use "em breve," not roadmap-talk. Helper text describes WHY the user cares, not why we built it that way. *(Carlos correction 2026-05-26 S1 review.)*
- ❌ **English codenames from screen-inventory.md in user-facing UI** — banned in copy: "Skim", "Upload", "MD", "BOM", "ICP", "S1"/"S2"/etc., "intake". Always use BR-orçamentista Portuguese terms. **Canonical 8-step user-facing workflow strip** (linear progress, NOT cross-cutting state): **1 Cadastro · 2 Documentos · 3 Triagem · 4 Preparação · 5 Quadro de Cargas · 6 Memorial · 7 Quantitativos · 8 Orçamento**. Preparação groups per-sheet scale + layer mapping (one mental phase, not two). *(Carlos corrections 2026-05-27 progress-strip review.)*
- ❌ **Don't show cross-cutting state in the linear progress strip** — Omissos (S11), supplier dispatch (S12-S14), exports (S17-S19) are state surfaces / outputs, not phases. They live in their own UI surfaces (drawers, badges, secondary nav). The linear strip is for the 8 main phases only.

## Decisions Log

| Date | Decision | Source |
|------|----------|--------|
| 2026-05-26 | Light theme MVP, no dark mode | Carlos vs all-day data work + white PDF backgrounds |
| 2026-05-26 | Productivity-tool DNA (Linear / Vercel / Figma reference, not marketing-site) | Carlos picked aesthetic intent |
| 2026-05-26 | 4px spacing base, 0-8px radius, minimal shadow | locked in design-tokens.md draft |
| 2026-05-26 | Sans: Bricolage Grotesque (Google OFL, variable) | `/design-consultation` after Geist/Inter/IBM Plex rejected as AI-default |
| 2026-05-26 | Mono: Iosevka (free OFL, variable, condensed) | `/design-consultation` — engineering-tool DNA, dense BOM rows |
| 2026-05-26 | Accent: construction safety orange `#ea580c` | `/design-consultation` — escapes SaaS-blue convergence, grounds in BR work context |
| 2026-05-26 | Mark: Tier 2 wordmark `ai·rio` with center-dot | `/design-consultation` — cheap MVP identity, defer Tier 3 brand sprint |
| 2026-05-26 | Overlay-perfilado shifted from `#d97706` → `#ca8a04` | avoid visual clash with accent |
| 2026-05-27 | No dev-language in user-facing UI | Carlos S1 correction — "wedge MVP" / "ICP" / "v0.1" / founder-cosplay all stripped |
| 2026-05-27 | No English codenames in user-facing UI | Carlos progress-strip correction — canonical 8-step Portuguese labels locked |
| 2026-05-27 | 9-step progress strip → 8-step (collapsed Escala+Camadas into Preparação) | Carlos question — Escala+Camadas are one mental mode (per-sheet setup) |
| 2026-05-27 | Workflow UX Principles section added — multi-phase + smart defaults + mental-mode-distinct + auditability | Carlos asked industry standard / trend; 100% of estimating peers use multi-phase; throughput wins inside phases not by collapsing |

---

For full rationale + CSS custom properties + component specs + agent prompt guide, see `docs/spec/design-tokens.md`.
