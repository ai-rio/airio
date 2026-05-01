# Tagsmith — Brand Concept (Logo / Favicon / OG)

Spec for external generators (Recraft / Midjourney / Stitch / human designer).
**Source of truth**: `_design-system.md` + `_tokens.css`. Every asset MUST use only tokens listed there.

---

## 1. Brand essence (one paragraph)

Tagsmith forges structured data for AI search. Craftsman tooling for SEO consultants, indie founders, and non-tech bloggers who need schema, OG images, and citation tracking that just works. **Forge, not factory.** Warm, technical, opinionated, never apologetic. Light cream surface + ember orange spark + sky blue data slot. Geist Sans + Geist Mono. Zero gradients, zero AI mascots, zero glassmorphism.

Three keywords for any prompt: **Forge. Precision. Light.**

---

## 2. Color reference (paste into prompts verbatim)

| Token | Hex | When to use in asset |
|---|---|---|
| Cream bg | `#FAF7F2` | Primary background — every asset |
| Slate text | `#0F172A` | Wordmark, primary stroke |
| Ember | `#EA580C` | Spark / accent dot / single highlight |
| Ember soft | `#FFEDD5` | Tinted shape behind mark (optional) |
| Sky | `#80DBFF` | Data-flavor variant only (rare) |
| Sky deep | `#0693E3` | Info / link tint variant |
| White surface | `#FFFFFF` | Card slot inside OG image |

**Never** in any asset: gradients, neon glows, drop-shadow blurs, isometric 3D, photorealism, mascots, hands holding phones, generic SaaS purple/teal.

---

## 3. Logo

### 3.1 Direction (chosen)

**Wordmark + symbol lock-up**, horizontal primary, stacked secondary.

- **Wordmark**: `tagsmith` — lowercase, Geist Sans, weight 600, letter-spacing `-0.02em`. Single-word, no camelCase.
- **Symbol**: anvil-stamp glyph that reads as a stylized `</>` schema bracket pair. Forge meets code. Square-ish proportions for favicon viability.

### 3.2 Symbol concept (for prompt)

> A minimalist geometric mark: an anvil silhouette where the flat striking surface and the horn together form an opening angle bracket `<` on the left and a closing bracket `>` on the right. Single weight stroke 2px on a 24px grid. One small ember-orange dot (#EA580C) inside the negative space where a hammer would strike — represents the "spark" of structured data activation. Otherwise pure slate `#0F172A` on cream `#FAF7F2`. No outlines, no shadows, no gradients. Square bounding box. Geometric, not illustrative.

**Alt concept** (if anvil reads too literal): T+S monogram where the crossbar of T extends to form the top of S, suggesting a hammer striking. Same color rules.

### 3.3 Construction rules

- Grid: 24×24 px symbol cell
- Min stroke: 2px at 24px scale
- Wordmark cap-height = symbol height
- Symbol-wordmark gap: 12px (1× of symbol's quarter)
- Min lock-up height: 24px digital, 12mm print
- Clear space: 0.5× symbol height all sides

### 3.4 Color variants (deliver all)

| Variant | Use | Spec |
|---|---|---|
| Primary | Light surfaces | Slate symbol + slate wordmark + ember dot |
| Inverse | Dark surfaces (code blocks, footer) | Cream symbol + cream wordmark + ember dot |
| Single-color slate | Print, fax | All `#0F172A`, no ember |
| Single-color ember | Stamp / sticker / brand badge | All `#EA580C` |
| Single-color cream | Watermark on dark photography | All `#FAF7F2` at 60% opacity |

### 3.5 Don'ts

- No tilted/dynamic angles — anvil sits flat
- No skeuomorphic anvil texture / metal shading
- No hammer included in mark (implied by spark dot)
- No flame, fire, sparks-as-particles — one dot only
- No serif fonts in wordmark
- No emoji-style rounded corners on bracket angles

---

## 4. Favicon

Symbol-only. Must read at 16×16.

### 4.1 Sizes to ship

- `favicon.ico` — 16, 32, 48 multi-res
- `icon-192.png`, `icon-512.png` — PWA
- `apple-touch-icon.png` — 180×180
- `safari-pinned-tab.svg` — single-color slate

### 4.2 Simplification rule

At 16×16, drop the ember dot if it muddies the bracket form. Keep silhouette legible above all else. Test on both cream and white tab backgrounds.

### 4.3 Background variants

| Surface | Recommended favicon |
|---|---|
| Cream / white tab | Slate symbol, optional ember dot |
| Dark tab (Safari pinned) | Cream symbol mask |
| Branded touch icon (180×180) | Ember `#EA580C` square + cream symbol centered |

---

## 5. OG image

1200×630 px. One template, three variants (Schema / OG-Image-Tool / Citation).

### 5.1 Layout grid

```
┌──────────────────────────────────────────────────────┐
│  [logo]                                  [tool tag]  │  ← 80px top pad
│                                                      │
│                                                      │
│   Big headline goes here.                            │  ← 96px Geist Sans 700
│   Two lines max.                                     │  ← tracking -0.02em
│                                                      │
│   Supporting subline in muted slate.                 │  ← 28px Geist Sans 400
│                                                      │
│                                                      │
│  ─────────────────────────────────────────           │  ← hairline divider
│  tagsmith.io                          [ember dot]   │  ← 18px Geist Mono
└──────────────────────────────────────────────────────┘
```

- Bg: `#FAF7F2` cream
- Side padding: 80px
- Hairline divider: 1px `#E2E8F0`
- Logo top-left, tool tag pill top-right (`SCHEMA`, `OG`, `CITATION` — Geist Mono 14px uppercase, ember-soft bg, ember text)
- Big headline: slate `#0F172A`
- Subline: `#64748B` muted slate
- URL bottom-left in Geist Mono small caps
- Single ember dot bottom-right as visual full-stop

### 5.2 Per-tool variant headlines (placeholders — copywriter to refine)

| Variant | Headline | Subline |
|---|---|---|
| Schema | "Schema. In six seconds." | "Paste a URL. Get production JSON-LD. Free." |
| OG | "OG images that don't lie." | "Render branded link previews from any URL." |
| Citation | "See where AI cites you." | "Track Perplexity, ChatGPT, and Gemini answer mentions." |

### 5.3 Optional accent zones

- For data-heavy pages (citation): swap top-right tool tag bg from ember-soft to `--accent-2-soft` sky tint, keep ember dot bottom-right (one ember per asset rule).
- Never use both tool tag tints simultaneously.

### 5.4 Don'ts

- No screenshots inside OG image
- No drop shadows on text
- No background patterns / dot grids / gradients
- No more than one ember accent surface per OG image
- No sans-serif other than Geist
- Headline never exceeds 2 lines

---

## 6. Tool prompts (copy-paste into generators)

### 6.1 Logo (Recraft / Midjourney v6)

> Minimalist vector logo for a developer tool called "tagsmith". A geometric anvil-stamp glyph where the silhouette reads as opening and closing angle brackets `< >`. One small orange dot (#EA580C) inside the negative space. Pure slate (#0F172A) on cream (#FAF7F2) background. Single weight 2px stroke. Geometric, flat, no gradient, no shadow, no texture, no outline, no 3D. Square aspect. Style: Swiss design, agency precision, Geist typography era. Lockup with the wordmark "tagsmith" set in Geist Sans 600, lowercase, tight tracking, sitting to the right of the symbol with 12px gap.

### 6.2 Favicon (Recraft / svg-logo-designer skill)

> 16×16 pixel-perfect favicon: simplified version of the tagsmith anvil-bracket glyph. Pure slate `#0F172A` silhouette, no ember dot, on transparent background. Crisp at small sizes. SVG, 24×24 viewBox.

### 6.3 OG image template (Stitch / Recraft)

> 1200×630 OG image, cream `#FAF7F2` background, 80px padding all sides. Top-left: tagsmith logo. Top-right: small uppercase tag pill in Geist Mono 14px, ember-soft `#FFEDD5` background, ember text `#EA580C`, label "{TOOL_LABEL}". Center-left: Geist Sans 96px weight 700 headline in slate `#0F172A`, max 2 lines, letter-spacing -0.02em, "{HEADLINE}". Below: Geist Sans 28px subline in muted slate `#64748B`, "{SUBLINE}". 1px hairline divider in `#E2E8F0` near bottom. Bottom-left: "tagsmith.io" in Geist Mono 18px slate. Bottom-right: 12px ember `#EA580C` filled circle. No gradients, no shadows, no patterns, no photography.

---

## 7. Asset inventory (what to ship)

| File | Format | Size | Source |
|---|---|---|---|
| `logo-primary.svg` | SVG | viewBox 200×48 | Designer |
| `logo-inverse.svg` | SVG | viewBox 200×48 | Designer |
| `logo-symbol.svg` | SVG | viewBox 24×24 | Designer |
| `logo-stacked.svg` | SVG | viewBox 96×96 | Designer |
| `favicon.ico` | ICO | 16/32/48 | Generator |
| `icon-192.png` | PNG | 192×192 | Generator |
| `icon-512.png` | PNG | 512×512 | Generator |
| `apple-touch-icon.png` | PNG | 180×180 | Generator |
| `safari-pinned-tab.svg` | SVG mono | viewBox 24×24 | Designer |
| `og-default.png` | PNG | 1200×630 | Template |
| `og-schema.png` | PNG | 1200×630 | Template |
| `og-citation.png` | PNG | 1200×630 | Template |

Drop everything into `apps/airio/site/public/brand/` and `apps/airio/dashboard/public/brand/`.

---

## 8. Open decisions (block before ship)

1. **Anvil-bracket vs T+S monogram** — pick one before generating. Anvil = stronger forge metaphor; T+S = safer at favicon scale. Recommend: prototype both, keep the one that survives 16×16.
2. **Domain confirmation** — is `tagsmith.io` correct in OG footer? If `.com` / `.dev` / `.br`, update Section 5.1 + 6.3.
3. **Stacked logo necessity** — only ship if dashboard sidebar collapses below 200px. Otherwise drop.
4. **Dark-surface usage** — code blocks use `--code-bg #0F172A`. Confirm inverse logo gets used on these or skip dark variant in v1.
