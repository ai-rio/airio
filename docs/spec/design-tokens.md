# airio · Design Tokens

> First-pass design system for the Astro UI. Productivity-tool DNA (Linear / Vercel / Figma). Light theme, restrained color, dense layouts, sharp-to-subtle radius, free variable typeface. Locked 2026-05-26.

---

## 1. Visual Theme & Atmosphere

airio is a **working tool** the orçamentista uses for hours per day. The interface stays out of the way so the data, PDF overlays, and BOM tables shine. No marketing flourish, no dark mode (MVP), no decorative elements. Inspired by Linear, Vercel dashboard, Figma desktop — apps where senior product designers have already done the work of making productivity feel polished without being precious.

**Key characteristics:**

- Light default (`#ffffff` app bg, `#fafafa` muted surfaces). White PDFs sit on light UI without contrast jarring.
- Single neutral typeface (Geist) at multiple weights — no display fonts, no script fonts, no playful pairings.
- Restrained color: ~95% neutrals (grayscale), one accent color reserved for primary actions + links, semantic colors for status (success/warning/danger/info).
- **Sharp-to-subtle radius** (0–8px range, default 4px) — productivity-tool, not consumer-app.
- Minimal shadow — only on overlayed surfaces (popovers, modals). No chromatic tint.
- Dense by default. Compact row heights, tight spacing. Comfortable mode available per screen if Carlos prefers.

**Tags:** light, dense, neutral, restrained-accent, sans, subtle-radius, system-shadow.

---

## 2. Color Palette & Roles

### Neutrals (the workhorse — ~95% of pixels)

| Token | Value | Role |
|---|---|---|
| `--color-bg-app` | `#ffffff` | Main app background |
| `--color-bg-surface` | `#fafafa` | Subtle surface (sidebar, alternating rows, muted panels) |
| `--color-bg-elevated` | `#ffffff` | Cards, modals, popovers (over `bg-surface`) |
| `--color-bg-input` | `#ffffff` | Form input backgrounds |
| `--color-bg-disabled` | `#f5f5f5` | Disabled controls |
| `--color-fg-primary` | `#0a0a0a` | Main text (near-black, NOT pure black — reduces eye strain) |
| `--color-fg-secondary` | `#525252` | Secondary text, labels, captions |
| `--color-fg-muted` | `#737373` | Hints, placeholders, helper text |
| `--color-fg-disabled` | `#a3a3a3` | Disabled control text |
| `--color-border-subtle` | `#f0f0f0` | Hairline between rows / panels |
| `--color-border-default` | `#e5e5e5` | Standard borders (inputs, cards, dividers) |
| `--color-border-strong` | `#d4d4d4` | Emphasis borders (focused inputs, selected rows) |

### Accent — 🟢 LOCKED 2026-05-26 via `/design-consultation`

**Construction safety orange.** Grounds in the buyer's actual work context (orange cones, hard hats, conduit warning bands, eletroduto markers). Distinct from the SaaS-default-blue convergence (Linear / Vercel / Notion / Stripe / Kreo all hover the same blue-violet range). Warm — reads "work tool" not "tech product." Controlled by reserving it for primary actions / links / active states / focus rings ONLY (never overlaid on PDF — overlay palette is separate).

| Token | Value | Role |
|---|---|---|
| `--color-accent` | `#ea580c` *(Tailwind orange-600)* | Primary CTAs, links, active states, focus rings |
| `--color-accent-hover` | `#c2410c` *(Tailwind orange-700)* | Hover/active state of accent |
| `--color-accent-soft-bg` | `#fff7ed` *(Tailwind orange-50)* | Subtle accent-tinted background (selected row, info panel) |
| `--color-accent-soft-fg` | `#9a3412` *(Tailwind orange-800)* | Text on `accent-soft-bg` |

**Why this over the safer blueprint blue (`#0c4a6e`):** the memorable thing is "scale 3-5 → 10+ proposals/month" — differentiation through throughput claim. Visual differentiation should match. Looking like every other tool undercuts the claim. Orange escapes the SaaS-blue convergence in screenshots, instantly distinct.

**Risk acknowledged:** orange reads "consumer" if used widely. Controlled by USAGE DISCIPLINE — one primary CTA per screen, focus rings, hover states. Never decorative; never overlaid on PDF.

### Semantic Status

| Token | Value | Role |
|---|---|---|
| `--color-success` | `#16a34a` | Resolved omissos, integrated quotes, completed tier exports |
| `--color-success-soft-bg` | `#f0fdf4` | Success banners / row tints |
| `--color-warning` | `#d97706` | Stale dispatches, MD vagueness flags, "force send" overrides |
| `--color-warning-soft-bg` | `#fffbeb` | Warning banners |
| `--color-warning-soft-border` | `#fed7aa` *(Tailwind amber-200)* | Warning banner border, focus ring on warning state |
| `--color-danger` | `#dc2626` | Missing required field, omissos blocking send, schema validation failure |
| `--color-danger-soft-bg` | `#fef2f2` | Error banners |
| `--color-info` | `#0284c7` | Hints, secondary CTAs, "what's this?" callouts |
| `--color-info-soft-bg` | `#f0f9ff` | Info banners |
| `--color-info-soft-border` | `#bae6fd` *(Tailwind sky-200)* | Info banner border, focus ring on info state |

### Data Visualization (overlay colors on PDF)

Used by S9 (Planta count workspace) to differentiate layer kinds visually on top of the PDF. All chosen for sufficient contrast against white CAD backgrounds + each other.

| Token | Value | Layer kind |
|---|---|---|
| `--color-overlay-eletroduto` | `#2563eb` | Eletroduto runs |
| `--color-overlay-eletrocalha` | `#16a34a` | Eletrocalha runs |
| `--color-overlay-perfilado` | `#ca8a04` *(amber-700, yellow-shifted to avoid clash with safety-orange accent)* | Perfilado runs |
| `--color-overlay-leito` | `#7c3aed` | Leito runs |
| `--color-overlay-busway` | `#db2777` | Busway runs |
| `--color-overlay-device-pin` | `#dc2626` | Device pins (tomada, AC, etc.) |
| `--color-overlay-region` | `rgba(37, 99, 235, 0.15)` | Region polygons (semi-transparent) |
| `--color-overlay-omisso` | `#f59e0b` | Omissos pins (warning-yellow, distinct from device pins) |

---

## 3. Typography Rules

### Type Stack — 🟢 LOCKED 2026-05-26 via `/design-consultation`

```css
--font-sans: "Bricolage Grotesque Variable", "Bricolage Grotesque", -apple-system, "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", sans-serif;
--font-mono: "Iosevka Variable", "Iosevka", "SF Mono", ui-monospace, "Cascadia Code", monospace;
```

> **Font family names — empirical (locked 2026-05-27 during S1 Astro port):**
> - `@fontsource-variable/bricolage-grotesque` registers family `"Bricolage Grotesque Variable"` (the package exposes weight + width axes via this name). Lead with the Variable alias; fall through to the static `"Bricolage Grotesque"` for any future static-package context.
> - `@fontsource-variable/iosevka` **does NOT exist on npm** as of 2026-05-27. The static `@fontsource/iosevka` registers family `"Iosevka"` (no variable axis support). The stack still prepends `"Iosevka Variable"` as a forward-compatible alias — falls through to static `"Iosevka"` until/unless a variable Iosevka package ships.

**Sans — Bricolage Grotesque** (Google Fonts, SIL OFL, variable axes: weight + grade + width)
- Mathieu Triay design with subtle industrial / measurement-annotation character — drafted, not eccentric
- Variable axes let us tune optical correction per size (smaller cells get slightly looser, headings tighter)
- Tabular-nums via OpenType
- Distinct from Inter / Geist / IBM Plex Sans (the AI-default monoculture) — reads as deliberate, not template
- Self-host via `@fontsource/bricolage-grotesque` (variable file ~70KB)

**Mono — Iosevka** (free OFL, variable, condensed)
- Engineering-tool DNA — drafted CAD/measurement feel, not "code editor" mono
- Condensed: ~30% more characters per row than JetBrains/Geist Mono → dense BOM tables read better
- Distinctive without decorative — fits the throughput-tool memorable-thing
- Tabular-nums first-class
- Distinct from Geist Mono / JetBrains Mono / Fira Code (AI-default mono trio)
- Self-host via `@fontsource/iosevka` (variable file ~80KB)

**Why this pairing works:**

Both fonts share a quiet industrial character. Bricolage is the working-engineer sans (not luxe like Söhne, not generic like Inter); Iosevka is the drafting-CAD mono (condensed enough that a SINAPI table fits without horizontal scroll). Together they read as "made by an engineer, for engineers" — matches the buyer posture.

**Rejected (preserved for traceability):**
- Geist / Geist Mono — Vercel default, now overplayed
- Inter — overused everywhere; AI-default
- JetBrains Mono / Fira Code — every code editor + AI tool
- IBM Plex Sans — getting overplayed in tech docs
- Söhne / Untitled Sans / GT America / Berkeley Mono — paid; rejected on cost

**Safer alternative documented (if Bricolage proves too distinct for stakeholders):** Manrope (sans) + DM Mono (mono). Same productivity-tool DNA, less character. Trade: distinctive feel for zero learning curve.

### Type Scale

Tight, productivity-oriented scale. No display sizes — airio doesn't have hero sections.

| Token | Size | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-xs` | 11px | 16px (1.45) | 500 | Tags, badges, metadata, chips |
| `--text-sm` | 13px | 18px (1.4) | 400 | Table cells, labels, helper text, captions |
| `--text-base` | 14px | 20px (1.43) | 400 | Body text (default UI text) |
| `--text-md` | 15px | 22px (1.47) | 400 | Slightly emphasized body, primary form inputs |
| `--text-lg` | 16px | 24px (1.5) | 500 | Section headers, modal titles |
| `--text-xl` | 18px | 26px (1.44) | 600 | Page subtitles, prominent labels |
| `--text-2xl` | 22px | 30px (1.36) | 600 | Page titles |
| `--text-3xl` | 28px | 36px (1.29) | 600 | Project name / hero label (max heading size) |

### Weight Scale (Geist variable axis)

| Token | Value | Usage |
|---|---|---|
| `--font-weight-regular` | 400 | Body, table cells |
| `--font-weight-medium` | 500 | Buttons, emphasized labels, badges |
| `--font-weight-semibold` | 600 | Headings, section titles |
| `--font-weight-bold` | 700 | Rare emphasis (totals, alerts) — used sparingly |

### Numeric Tabular Lining

Tables (BOM, Quadro, rollup) use `font-variant-numeric: tabular-nums` so columns of numbers align — critical for an estimator tool. Set on `--font-mono` and on any `<td>` that holds quantities, prices, or totals.

---

## 4. Component Stylings

### Buttons

```css
/* Primary — used for the single dominant action per screen */
.btn-primary {
  background: var(--color-accent);
  color: #ffffff;
  border-radius: 4px;
  padding: 8px 14px;
  font: 500 14px/20px var(--font-sans);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 120ms ease-out;
}
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Secondary — neutral default; coexists with one primary */
.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-fg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  padding: 8px 14px;
  font: 500 14px/20px var(--font-sans);
  cursor: pointer;
}
.btn-secondary:hover { background: var(--color-bg-surface); }

/* Ghost — tertiary actions, low emphasis */
.btn-ghost {
  background: transparent;
  color: var(--color-fg-secondary);
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font: 500 14px/20px var(--font-sans);
  cursor: pointer;
}
.btn-ghost:hover {
  background: var(--color-bg-surface);
  color: var(--color-fg-primary);
}

/* Danger — destructive actions only (force send, drop omisso, delete project) */
.btn-danger {
  background: var(--color-danger);
  color: #ffffff;
  border-radius: 4px;
  padding: 8px 14px;
  font: 500 14px/20px var(--font-sans);
  border: 1px solid transparent;
  cursor: pointer;
}
```

### Inputs

```css
.input {
  background: var(--color-bg-input);
  color: var(--color-fg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  padding: 8px 10px;
  font: 400 14px/20px var(--font-sans);
  width: 100%;
}
.input:hover { border-color: var(--color-border-strong); }
.input:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft-bg);
}
.input[aria-invalid="true"] { border-color: var(--color-danger); }
.input::placeholder { color: var(--color-fg-muted); }
```

### Tables (BOM / Quadro / Rollup — the most critical surface)

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font: 400 13px/18px var(--font-sans);
  font-variant-numeric: tabular-nums;
}
.table thead th {
  text-align: left;
  font: 500 11px/16px var(--font-sans);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-fg-secondary);
  background: var(--color-bg-surface);
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-default);
  position: sticky; top: 0;
}
.table tbody td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: top;
}
.table tbody tr:hover { background: var(--color-bg-surface); }
.table tbody tr[aria-selected="true"] {
  background: var(--color-accent-soft-bg);
}
/* Right-align numerics + use mono for codes / SINAPI / quantities */
.table td.numeric, .table th.numeric { text-align: right; }
.table td.mono { font-family: var(--font-mono); }
```

### Cards / Panels

```css
.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  padding: 16px;
}
.card-header {
  font: 600 15px/22px var(--font-sans);
  color: var(--color-fg-primary);
  margin: 0 0 4px;
}
.card-subtle {
  font: 400 13px/18px var(--font-sans);
  color: var(--color-fg-secondary);
}
```

### Chips / Badges (system tags, status, omissos state, layer-kind)

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-bg-surface);
  color: var(--color-fg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  padding: 2px 6px;
  font: 500 11px/16px var(--font-sans);
}
.chip-success { background: var(--color-success-soft-bg); color: var(--color-success); border-color: transparent; }
.chip-warning { background: var(--color-warning-soft-bg); color: var(--color-warning); border-color: transparent; }
.chip-danger  { background: var(--color-danger-soft-bg);  color: var(--color-danger);  border-color: transparent; }
.chip-info    { background: var(--color-info-soft-bg);    color: var(--color-info);    border-color: transparent; }
```

### Modal / Popover overlays

```css
.overlay-backdrop {
  position: fixed; inset: 0;
  background: rgba(10, 10, 10, 0.4);
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  box-shadow: var(--shadow-modal);
  padding: 20px;
  max-width: 560px;
  width: 100%;
}
.popover {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  box-shadow: var(--shadow-popover);
  padding: 8px;
}
```

---

## 5. Layout Principles

### Spacing Scale

Base unit: **4px**. All gaps and paddings are multiples.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight inline gaps (chip-icon, badge padding) |
| `--space-2` | 8px | Standard inline (label-icon, button-padding-y) |
| `--space-3` | 12px | Form-row spacing, table cell padding |
| `--space-4` | 16px | Card padding, modal inner padding |
| `--space-5` | 20px | Section internal spacing |
| `--space-6` | 24px | Card-to-card gap, section gap |
| `--space-8` | 32px | Top-of-page padding, major section divides |
| `--space-12` | 48px | Page margins (desktop) |
| `--space-16` | 64px | Rare wide gutters |

### Layout grid

- Max content width: 1440px (centered)
- Sidebar (nav tree S10, omissos drawer S11): 280px fixed
- Main content area: fluid up to 1440px minus sidebar
- Per-screen: define max content width if denser is better (BOM workspace S15: full width; project intake S1: 720px max)

### Density modes

- **Default = dense.** Row height 32px, padding tight. Built for orçamentistas who scan hundreds of rows.
- **Comfortable mode** (per-screen toggle): row height 40px, padding 1.5x. Optional, persists per user.

---

## 6. Border Radius Scale

Productivity-tool sharp side. Default 4px (subtle, not architectural).

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | 0px | Tables, full-bleed sections |
| `--radius-xs` | 2px | Chips, small badges |
| `--radius-sm` | 4px | Inputs, buttons (default radius) |
| `--radius-md` | 6px | Cards, panels |
| `--radius-lg` | 8px | Modals, large surfaces |

> **Don't:** use radius > 8px. The marketing-rounded-bubble aesthetic doesn't fit a takeoff tool.

---

## 7. Depth & Elevation

Minimal shadow system. Most surfaces are flat with borders. Shadows reserved for floating overlays.

| Token | Value | Usage |
|---|---|---|
| `--shadow-popover` | `0 4px 12px rgba(10, 10, 10, 0.08), 0 0 0 1px rgba(10, 10, 10, 0.04)` | Dropdowns, popovers, tooltips |
| `--shadow-modal` | `0 16px 48px rgba(10, 10, 10, 0.12), 0 0 0 1px rgba(10, 10, 10, 0.04)` | Modals, dialog overlays |

No chromatic tint. No more than 2 shadow levels. Cards rely on borders, not shadows.

---

## 8. Motion

| Token | Value | Usage |
|---|---|---|
| `--ease-default` | `cubic-bezier(0.2, 0, 0, 1)` | Standard transitions |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entrances |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `--motion-fast` | 120ms | Button hover, input focus |
| `--motion-normal` | 200ms | Panel slide, modal appear |
| `--motion-slow` | 300ms | Page transitions, large layout shifts |

Avoid animation on data updates (S10 live rollup) — instant updates feel faster + don't distract. Only animate UI chrome (hover, focus, panel open/close).

---

## 9. Do's and Don'ts

### Do
- ✅ Use `#ffffff` / `#fafafa` as the dominant surfaces — light is correct for all-day data work
- ✅ Use Geist for all UI text; Geist Mono for codes (SINAPI), quantities, item numbers, file paths
- ✅ Use `font-variant-numeric: tabular-nums` on any column of numbers
- ✅ Default to dense layouts; offer comfortable toggle per-screen
- ✅ Use the accent color sparingly — one primary CTA per screen, links, active states only
- ✅ Use 4px-multiple spacing everywhere
- ✅ Reserve shadows for floating overlays only
- ✅ Use chip color (success/warning/danger/info) consistently for system state
- ✅ Use overlay colors (`--color-overlay-*`) ONLY on PDF overlays, never on UI chrome

### Don't
- ❌ Don't introduce dark backgrounds in MVP (single-theme — half the design surface)
- ❌ Don't use pure black `#000` for text — use `#0a0a0a`
- ❌ Don't use pure white shadows / chromatic shadows — productivity tools don't decorate
- ❌ Don't use radius > 8px
- ❌ Don't use display-size fonts (>32px) — no hero sections in a working tool
- ❌ Don't pair Geist with a second sans-serif — single family across the app
- ❌ Don't use color outside this palette without justification (especially saturated brights)
- ❌ Don't animate data updates (rollup totals, BOM line edits) — instant feels faster
- ❌ Don't inherit Tagsmith's old design system (`.claude/rules/_legacy/design-system.md`)

---

## 10. Responsive Behavior

airio is primarily a **desktop tool** (orçamentista uses a laptop / dual monitor for PDF work). Mobile = read-only / status-check only.

| Breakpoint | Width | Strategy |
|---|---|---|
| Mobile | < 640px | Read-only views of BOM totals, omissos list, supplier status; no counting / editing |
| Tablet | 640–1024px | Limited editing (BOM row edit, omissos response paste); no S9 planta-count (too tight) |
| Desktop | 1024–1440px | Full functionality |
| Wide | > 1440px | Center content at 1440px max; sidebar + main + optional inspector panel |

Touch targets: 44×44px minimum on mobile, 32×32px desktop.

---

## 11. Agent Prompt Guide (for AI-paired build)

When asking Claude / another agent to build a screen, anchor on these phrases:

### Quick reference

```
Theme:       Light productivity-tool (Linear / Vercel / Figma DNA)
Type:        Geist sans + Geist Mono for codes
Color:       Neutral grays + one accent (TBD) + semantic status (success/warning/danger/info)
Spacing:     4px base; multiples (4, 8, 12, 16, 24, 32)
Radius:      4px default; 0 for tables, 6 for cards, 8 for modals
Shadow:      Only on overlays (popovers, modals); no chromatic tint
Density:     Dense default; comfortable toggle per-screen
```

### Example prompts

1. "Build the BOM workspace (S15) as a dense table — Geist Mono for SINAPI codes and quantities, tabular-nums, sticky header, hover row state. Use `--text-sm` for cells, `--space-3` for padding."

2. "Build the dispatch screen (S13) as a multi-supplier comparison table — 1 left column for items, 2 columns per supplier slot (unit + total), winner per row highlighted with `chip-success`."

3. "Build the omissos board (S11) as a card grid (3-column desktop, 2-column tablet, stacked mobile). Each card uses `.card` style, header with `--text-lg`, body with `--text-sm`."

4. "Build the project intake form (S1) at `max-width: 720px`, single column, label-above-input, `--space-4` between fields. Submit button uses `.btn-primary`."

### Iteration sequence (when building a screen)

1. Start with layout structure (sections, grid, sidebar/main split)
2. Apply colors from the palette — surface bg first, text second, accent last
3. Apply typography — body `--text-base`, headings from the scale
4. Add components — buttons, inputs, tables, cards using the specs above
5. Apply radius consistently (4 / 6 / 8 only)
6. Add shadows only on overlay layers
7. Test density at dense + comfortable
8. Verify keyboard focus indicators (visible focus rings = accessibility baseline)
9. Verify color contrast WCAG AA minimum (4.5:1 for body, 3:1 for large text)

---

## 12. CSS Custom Properties (consolidated)

Drop into `src/styles/tokens.css` and `@import` from `src/layouts/Layout.astro`.

```css
:root {
  /* Colors — Neutrals */
  --color-bg-app: #ffffff;
  --color-bg-surface: #fafafa;
  --color-bg-elevated: #ffffff;
  --color-bg-input: #ffffff;
  --color-bg-disabled: #f5f5f5;

  --color-fg-primary: #0a0a0a;
  --color-fg-secondary: #525252;
  --color-fg-muted: #737373;
  --color-fg-disabled: #a3a3a3;

  --color-border-subtle: #f0f0f0;
  --color-border-default: #e5e5e5;
  --color-border-strong: #d4d4d4;

  /* Colors — Accent (LOCKED 2026-05-26: construction safety orange) */
  --color-accent: #ea580c;
  --color-accent-hover: #c2410c;
  --color-accent-soft-bg: #fff7ed;
  --color-accent-soft-fg: #9a3412;

  /* Colors — Semantic */
  --color-success: #16a34a;
  --color-success-soft-bg: #f0fdf4;
  --color-warning: #d97706;
  --color-warning-soft-bg: #fffbeb;
  --color-warning-soft-border: #fed7aa;
  --color-danger: #dc2626;
  --color-danger-soft-bg: #fef2f2;
  --color-info: #0284c7;
  --color-info-soft-bg: #f0f9ff;
  --color-info-soft-border: #bae6fd;

  /* Colors — PDF Overlays */
  --color-overlay-eletroduto: #2563eb;
  --color-overlay-eletrocalha: #16a34a;
  --color-overlay-perfilado: #ca8a04; /* amber-700 — yellow-shifted to avoid clash with #ea580c accent */
  --color-overlay-leito: #7c3aed;
  --color-overlay-busway: #db2777;
  --color-overlay-device-pin: #dc2626;
  --color-overlay-region: rgba(37, 99, 235, 0.15);
  --color-overlay-omisso: #f59e0b;

  /* Typography — LOCKED 2026-05-26 via /design-consultation */
  --font-sans: "Bricolage Grotesque Variable", "Bricolage Grotesque", -apple-system, "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", sans-serif;
  --font-mono: "Iosevka Variable", "Iosevka", "SF Mono", ui-monospace, "Cascadia Code", monospace;

  --text-xs: 11px;   --lh-xs: 16px;
  --text-sm: 13px;   --lh-sm: 18px;
  --text-base: 14px; --lh-base: 20px;
  --text-md: 15px;   --lh-md: 22px;
  --text-lg: 16px;   --lh-lg: 24px;
  --text-xl: 18px;   --lh-xl: 26px;
  --text-2xl: 22px;  --lh-2xl: 30px;
  --text-3xl: 28px;  --lh-3xl: 36px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-none: 0px;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Shadow */
  --shadow-popover: 0 4px 12px rgba(10, 10, 10, 0.08), 0 0 0 1px rgba(10, 10, 10, 0.04);
  --shadow-modal: 0 16px 48px rgba(10, 10, 10, 0.12), 0 0 0 1px rgba(10, 10, 10, 0.04);

  /* Motion */
  --ease-default: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --motion-fast: 120ms;
  --motion-normal: 200ms;
  --motion-slow: 300ms;
}

/* Reset / base */
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font: var(--font-weight-regular) var(--text-base)/var(--lh-base) var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Numeric column tabular alignment */
.tabular { font-variant-numeric: tabular-nums; }
```

---

## 13. Logo / Mark — 🟢 LOCKED 2026-05-26

### Mark direction: Tier 2 — wordmark with subtle detail

```
ai·rio
```

**Construction:**
- Set in **Bricolage Grotesque SemiBold (600)**, weight axis tuned down slightly for optical balance at small sizes
- Lowercase throughout
- Center-dot (·) — Unicode `U+00B7 MIDDLE DOT` — sits between `ai` and `rio`
- Letter-spacing: -0.01em (subtly tightened for wordmark feel)
- Color: `--color-fg-primary` (#0a0a0a) on light surfaces; can invert for any future dark contexts

**Symbolic reading (orçamentista context):**
- The center-dot reads as a measurement point / outlet / circuit node — engineering-drawing primitive
- Echoes the `ai.rio.br` domain structure (dot between `ai` and `rio`) without being literal
- Hints at the engineering-drawing-DNA anchor thesis without needing a separate icon

**Sizing scale:**
- Display: 28–32px (page-level branding, login screen)
- Navigation: 16–18px (top-left of app chrome)
- Favicon source: center-dot motif scaled up (16×16 PNG + SVG)

### Deferred to phase 2 — Tier 3 brand identity

Once airio has 3+ paying orçamentistas dogfooding:
- Optional mark derived from electrical symbology (simplified tomada glyph, three-bar cable cores F+N+T, measurement-tick icon)
- Brand-designer engagement (~1 day session)
- Pairs with refined wordmark; both ship together if Tier 3 is pursued
- Until then, Tier 2 wordmark stands alone — sufficient, distinct, not a brand-sprint blocker

### Anti-pattern guardrails

- ❌ Don't add a gradient to the wordmark
- ❌ Don't outline / stroke the letters
- ❌ Don't add a "tagline" lockup ("airio · the takeoff tool" etc.) — wordmark stands alone
- ❌ Don't pair with stock construction icons (hard hat, crane, blueprint clip-art)
- ❌ Don't render the center-dot as a glyph emoji (📍 or ⭕ etc.) — it stays as the `·` character

---

## 14. Open Items

- ✅ **Accent color** — `#ea580c` (construction safety orange) locked 2026-05-26
- ✅ **Typography** — Bricolage Grotesque (sans) + Iosevka (mono) locked 2026-05-26
- ✅ **Logo / mark direction** — Tier 2 wordmark: `ai·rio` with center-dot (locked); brand-designer Tier 3 deferred to phase 2
- ✅ **Semantic border tokens** — `--color-warning-soft-border: #fed7aa` + `--color-info-soft-border: #bae6fd` promoted to canonical 2026-05-27 (7-preview consensus surfaced during Astro port).
- ✅ **Font-sans stack** — leads with `"Bricolage Grotesque Variable"` (the family name `@fontsource-variable/bricolage-grotesque@5.2.10` registers). Empirical fix landed 2026-05-27 during S1 port.
- ✅ **Font-mono stack** — leads with `"Iosevka Variable"` as forward-compatible alias; current install is `@fontsource/iosevka@5.2.5` (static, family `"Iosevka"`) because `@fontsource-variable/iosevka` does not exist on npm as of 2026-05-27.
- ☐ **Favicon** — derive from `ai·rio` wordmark center-dot motif
- ☐ **Font hosting** — Installed: `@fontsource-variable/bricolage-grotesque` (variable, ~70KB) + `@fontsource/iosevka` (static, weights 400/500/600 ~50KB total). Self-hosted (no Google Fonts CDN — privacy + perf). Switch Iosevka to variable when `@fontsource-variable/iosevka` ships.
- ☐ **Dark mode** — explicitly deferred from MVP; revisit if Carlos requests after dogfooding
- ☐ **Component library choice** — do we hand-roll all components from these tokens (more control, more work) or layer on shadcn/ui + retheme (faster, less custom)? TBD before S1 build
- ☐ **Per-screen density default** — confirm dense default vs comfortable default per screen during wireframing

---

*Last updated: 2026-05-26 (first-pass token system, productivity-tool DNA).*
