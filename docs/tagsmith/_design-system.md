# Tagsmith — Design System v1

## Reference fusion

| Source | What we take | What we drop |
|--------|-------------|--------------|
| **brainlabs-digital** | Warm cream surface, agency-grid composition, generous whitespace, yellow-as-CTA energy | Roboto stack (too generic), `#ffe733` yellow (taken), expressive springs |
| **pictify** | Bold sans display, dev-tooling clarity, JetBrains Mono for code blocks, contained max-width, hard CTA shape | Dark theme, neo-brutalist offset hard shadows, coral+lime accents (taken), Manrope+Inter pair (generic) |
| **opengraph.xyz** | Negative ref — feature breadth signaling | Purple gradient, dense feature lists, dated trust badges |

Tagsmith = warm + technical + AI-signaled. Light primary. Distinctive ember accent. Code-first because schema/JSON-LD output is the deliverable.

## Brand axis

| Axis | Position |
|------|----------|
| Tone | Expert, opinionated, never apologetic |
| Energy | Calm precision, not playful spring |
| Audience | SEO consultants + indie founders + non-tech bloggers (3 personas, EN/PT-BR/ES) |
| Visual archetype | Forge/smith — craftsman tooling, not generic SaaS |
| Voice template (EN) | Active verbs, present tense, short sentences. "Paste a URL. Get schema in 6 seconds." |
| Voice template (PT-BR) | Formal-warm, technical. "Cole a URL. Gere schema em 6 segundos." |
| Voice template (ES) | Technical, direct. "Pega una URL. Genera schema en 6 segundos." |

## 1. Color palette

| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#FAF7F2` | Page background — warm cream parchment (forge/smith feel, not sterile white) |
| `--surface` | `#FFFFFF` | Card + panel — pure white for content contrast |
| `--surface-2` | `#F1ECE3` | Secondary panels (sidebars, subtle group bg) |
| `--text` | `#0F172A` | Primary text — slate-950 near-black for max readability |
| `--text-muted` | `#64748B` | Captions, helper text — slate-500 |
| `--text-subtle` | `#94A3B8` | Disabled, placeholder — slate-400 |
| `--border` | `#E2E8F0` | Default divider — slate-200 |
| `--border-strong` | `#0F172A` | Emphatic outlines (forge edge) — text color reused |
| `--accent` | `#EA580C` | Ember orange — primary CTAs, links, focus rings |
| `--accent-hover` | `#C2410C` | Hover state |
| `--accent-soft` | `#FFEDD5` | Tinted bg (selected items, badges) |
| `--accent-2` | `#80DBFF` | Sky blue — chart strokes, data viz, secondary illustration |
| `--accent-2-soft` | `#CAF0FF` | Tinted bg for info callouts, viz fills |
| `--accent-2-deep` | `#0693E3` | High-contrast sky on cream — info text, link-on-tint |
| `--success` | `#16A34A` | Schema valid, monitor healthy |
| `--warning` | `#D97706` | Schema warnings, soft errors |
| `--danger` | `#DC2626` | Validation errors, broken state |
| `--info` | `#0693E3` | Info hints, pro-tip callouts (alias of --accent-2-deep) |
| `--code-bg` | `#0F172A` | Code block background — dark slot in light theme |
| `--code-text` | `#E2E8F0` | Code base text |
| `--code-key` | `#A3E635` | JSON-LD keys highlight |
| `--code-string` | `#FCD34D` | JSON-LD string values |
| `--code-comment` | `#64748B` | Comment lines in code |

## 2. Typography

| Role | Font | Size | Weight | Line-height |
|------|------|------|--------|-------------|
| Display XL | Geist Sans | 56-72px | 700 | 1.05 |
| Display L | Geist Sans | 40-48px | 700 | 1.1 |
| Heading 1 | Geist Sans | 32px | 600 | 1.2 |
| Heading 2 | Geist Sans | 24px | 600 | 1.25 |
| Heading 3 | Geist Sans | 20px | 600 | 1.3 |
| Body | Geist Sans | 16px | 400 | 1.6 |
| Small | Geist Sans | 14px | 400 | 1.5 |
| Caption | Geist Sans | 12px | 500 | 1.4 |
| Code / JSON-LD | Geist Mono | 14px | 400 | 1.6 |

**Why Geist**: free (Vercel + Google Fonts), distinctive vs Roboto/Inter/Manrope used by competitors, paired Mono is best-in-class for JSON code display (critical UX for schema tool). Single family pair = tight + brandable.

**Letter-spacing**:
- Display: `-0.02em` (tight)
- Body: `0` (default)
- Caption + nav uppercase: `0.06em`

## 3. Spacing & layout

- **Base unit**: 4px
- **Scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
- **Max content width**: 1200px (marketing) · 1440px (dashboard)
- **Container side gutter**: 24px mobile / 48px desktop

| Spacing | Use |
|---------|-----|
| 4-8 | Within a component (icon-text, badge padding) |
| 12-16 | Between related items |
| 24-32 | Section internals |
| 48-64 | Section breaks |
| 96-128 | Hero / footer breathing |

## 4. Radius

- `--r-sm` 6px — inputs, small buttons
- `--r-md` 12px — cards, primary buttons
- `--r-lg` 16px — feature cards, modals
- `--r-xl` 24px — hero panels
- `--r-full` 9999px — pills, badges, avatars

## 5. Shadow / elevation

Soft, layered. Avoid pictify's hard offset (too brutalist for SEO trust audience). Avoid blur backdrops.

```
--shadow-sm: 0 1px 2px rgb(15 23 42 / 0.04);
--shadow-md: 0 4px 12px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04);
--shadow-lg: 0 12px 28px rgb(15 23 42 / 0.08), 0 2px 6px rgb(15 23 42 / 0.04);
--shadow-pop: 0 0 0 4px rgb(234 88 12 / 0.18);  /* focus ring */
```

## 6. Motion

Calm precision. No spring physics. Trust > delight.

- Micro: 120ms ease-out
- Component: 200ms cubic-bezier(0.2, 0, 0, 1)
- Page: 280ms cubic-bezier(0.2, 0, 0, 1)
- Always honor `prefers-reduced-motion: reduce`

## 7. Components — distinctive shape rules

### Button (primary)
- BG `--accent`, text white, 12px radius, 14px×24px padding, weight 500
- Hover: `--accent-hover` + `--shadow-md`
- Focus: `--shadow-pop` ring
- Active: translateY(1px) — subtle press

### Button (secondary)
- BG `--surface`, border 1px `--border-strong`, text `--text`, 12px radius
- Hover: bg `--surface-2`

### Input / textarea (primary URL paste)
- BG `--surface`, border 1px `--border`, 6px radius, 12px×16px padding
- Focus: border `--accent` + `--shadow-pop`
- Big variant: 56px height for hero URL paste box

### Card
- BG `--surface`, border 1px `--border`, 16px radius, 24px padding
- Hover lift (when actionable): `--shadow-md` + translateY(-1px)

### Code block (output JSON-LD)
- BG `--code-bg`, text `--code-text`, font Geist Mono 14px, 12px radius, 20px padding
- Copy button overlay top-right
- Syntax highlight tokens via `--code-key`, `--code-string`, `--code-comment`

### Badge / pill
- BG `--accent-soft`, text `--accent`, weight 600, 12px size, full radius, 6px×10px

### Nav
- Light bar, no border, 64px height, brand left, links center, CTA right
- CTA always primary button — never plain link

### Pricing card
- 3-card row, middle elevated (`--shadow-lg` + `--accent` border)
- Tier name caps + tracked, price hero size, feature list with check icons in `--accent`

## 8. Page archetypes

- **Marketing hero**: cream bg, brand top-left, big display headline, supporting paragraph, URL paste input as primary CTA (paste = activate the tool, not "sign up")
- **Tool page** (schema/og/citation): two-pane layout — input left (40%), live output right (60%) on desktop; stacked mobile
- **Pricing**: 3-card row + LTD callout banner above
- **Dashboard home**: sidebar nav (220px), main content cards in 2-col grid, monitor status row top
- **Empty state**: centered illustration (smith hammer/anvil mark), one-sentence guidance, primary CTA

## 9. Iconography

- **Library**: Lucide (free, consistent stroke weight, fits Geist's geometry)
- **Stroke**: 1.5px default, 2px for accent icons
- **Color**: `currentColor` so icons inherit text color
- **No emoji** in dashboard UI; only acceptable in marketing copy as data-type cues

## 10. Brand mark (placeholder direction)

Wordmark + symbol. Symbol = stylized hammer-on-anvil monogram or "T+S" forge stamp glyph. Single color (`--text` or `--accent`). Avoid gradients, AI-generated mascots, isometric scenes.

Defer to a /svg-logo-designer skill run before week 2 ship.

## 11. Locale considerations

- Latin scripts only v1 (EN/PT-BR/ES), no RTL
- PT/ES copy ~25% longer than EN — design layouts with overflow tolerance, not pixel-fixed widths
- Number formats via `Intl` API (`pt-BR`: 1.234,56; `es-ES`: 1.234,56; `en-US`: 1,234.56)
- Currency: USD primary, with locale-aware formatting

## 12. Do's

- Use `--accent` ember orange ONLY for primary action surfaces (CTAs, focus, link, brand)
- Use `--accent-2` sky blue ONLY for data viz / charts / info — never as a CTA (orange owns action)
- Pair Geist Sans with Geist Mono — no third family
- Cream `--bg` everywhere on marketing; pure white `--surface` only for cards
- Use 12px radius default; only escalate to 16/24 for hero/feature cards
- JSON-LD output gets dark code block — let it stand out as the deliverable

## 13. Don'ts

- Don't use yellow (Brainlabs), coral (Pictify), purple (OpenGraph.xyz), green (Yoast)
- Don't use `Inter` or `Manrope` (Pictify pair) or `Roboto` (Brainlabs)
- Don't use neo-brutalist hard offset shadows (Pictify's `4px 4px #1f2937` look)
- Don't use backdrop-blur or glass effects
- Don't use spring/bounce motion
- Don't use AI-mascot illustrations or 3D blob hero shapes
- Don't drop dark mode in v1 — light only, ship later if requested
- Don't use icons + emoji together — one or the other per surface

## 14. Implementation map

Drop `_tokens.css` into both:
- `apps/airio/site/app/globals.css` (marketing)
- `apps/airio/dashboard/app/globals.css` (dashboard)

Wrap Tailwind config to extend with these CSS variables (single source of truth). Lock Geist via `next/font/google` (or self-host) in `app/layout.tsx`.

Component scaffolding work (week 1):
1. Replace airio's existing globals.css with `_tokens.css`
2. Bootstrap Geist via `next/font` in both `site/` and `dashboard/` layouts
3. Build base primitives: `<Button>`, `<Input>`, `<Card>`, `<CodeBlock>`, `<Badge>` per Section 7
4. Refit existing dashboard pages (sites, monitoring, billing, settings) to new tokens
5. Rewrite marketing hero with new headline + URL-paste-CTA pattern

Ship gate: every UI surface uses ONLY tokens from this doc. Zero hex literals in component code.
