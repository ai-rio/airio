# Design System Inspired by SEOABLE

> Auto-extracted from `https://seoable.dev/` on 2026-04-27

## 1. Visual Theme & Atmosphere

Refined dark mode with muted tones — cinematic and premium.

The hero section leads with "Ditch the $5K/mo agency.Enter your domain.Get everything." followed by "Instant SEO audit, brand positioning, keyword roadmap, AEO visibility check, and 100 AI-generated bl".

**Key Characteristics:**
- Bebas Neue as the heading font
- DM Sans as the body font for all running text
- Heading weight 400, letter-spacing -2.7528px
- Dark background (#09090b) as the primary canvas
- Primary accent `#ffe03d` used for CTAs and brand highlights
- 1 shadow level(s) detected — tinted shadows
- Sharp corners (0-2px) for a precise, technical aesthetic
- Tags: dark, sharp, accented, bold-typography, monospace, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#ffe03d`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#ff3b3b`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#09090b`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#ffe03d`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#f4f4f5`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#999999`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#252528`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#09090b` | `--palette-1` | block | large | text-light |
| 2 | `#ffe03d` | `--palette-2` | text-accent | large | text-dark |
| 3 | `#252528` | `--palette-3` | badge | large | text-light |
| 4 | `#111113` | `--palette-4` | block | medium | text-light |
| 5 | `#f4f4f5` | `--palette-5` | badge | medium | text-dark |
| 6 | `#ff3b3b` | `--palette-6` | text-accent | small | text-light |

## 3. Typography Rules

- **Heading Font:** `Bebas Neue`, sans-serif
- **Body Font:** `DM Sans`, sans-serif

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Bebas Neue | 110.112px | 400 | 94.6963px | -2.7528px |
| H2 | Bebas Neue | 108px | 400 | 92.88px | -2.7px |
| Body | DM Sans | 16px | 400 | 25.6px | normal |
| Code | Space Mono | 17px | 700 | 27.625px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `267.84px` | headings |
| H1 | `148.8px` | headings |
| H2 | `112px` | headings |
| H3 | `111.6px` | headings |
| H4 | `110.112px` | headings |
| Body L | `108px` | body / supporting text |
| Body | `96px` | body / supporting text |
| Small | `88px` | body / supporting text |
| XS | `80px` | body / supporting text |
| Caption | `72px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #f4f4f5;
  border-radius: 0px;
  padding: 20px 20px;
  font-size: 15px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #ffe03d;
  color: #09090b;
  border-radius: 0px;
  padding: 0px 32px;
  font-size: 20px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #f4f4f5;
  border-radius: 0px;
  padding: 32px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

## 5. Layout Principles

- **Base spacing unit:** `32px` — use multiples (64px, 96px, 128px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `32px` | card |
| spacing-2 | `6px` | element |
| spacing-3 | `16px` | element |
| spacing-4 | `24px` | card |
| spacing-5 | `40px` | card |
| spacing-6 | `96px` | section |
| spacing-7 | `8px` | element |
| spacing-8 | `20px` | element |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(255, 224, 61, 0.016) 0px 0px 0px 0.33044px` | Cards, subtle elevation |

> **Note:** This site uses chromatic (color-tinted) shadows rather than pure black — this is a deliberate brand choice that adds warmth to elevation.

## 7. Do's and Don'ts

### Do
- Use `#09090b` as the primary background color
- Use `Bebas Neue` for all headings and `DM Sans` for body text
- Use `#ffe03d` as the single dominant accent/CTA color
- Maintain `32px` as the base spacing unit — all gaps should be multiples
- Keep the overall feel dark — use dark surfaces throughout
- Keep corners sharp (0-2px radius) for a precise, technical feel
- Make headlines large and bold — typography is the hero element
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 400 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Bebas Neue/DM Sans with generic alternatives
- Don't use irregular spacing — stick to 32px grid
- Don't introduce bright white surfaces — they break the dark palette
- Don't use large border-radius — keep everything crisp and geometric
- Don't use pure black (#000000) for text — use `#f4f4f5` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 32px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #09090b
Text:        #f4f4f5
Accent:      #ffe03d
Secondary:   #ff3b3b
Border:      #252528
```

### Example Prompts

1. "Build a hero section with a `#09090b` background, `Bebas Neue` heading in `#f4f4f5`, and a `#ffe03d` CTA button with 0px radius."
2. "Create a pricing card using background `#ffe03d`, border `#252528`, `DM Sans` for text, and 96px padding."
3. "Design a navigation bar — `#09090b` background, `#f4f4f5` links, `#ffe03d` for active state."
4. "Build a feature grid with 3 columns, 96px gap, each card using the card component style."
5. "Create a footer with `#ffe03d` background, `#f4f4f5` text, and 64px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct
