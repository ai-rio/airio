# Design System Inspired by Brainlabs

> Auto-extracted from `https://www.brainlabsdigital.com/` on 2026-04-29

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "What's your next best move to maximize revenue through media?" followed by "Brainlabs is a full-service media agency built to answer that question. People, agents, and processe".

**Key Characteristics:**
- Kanit as the heading font
- Roboto as the body font for all running text
- Heading weight 400
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#ffdd33` used for CTAs and brand highlights
- Rounded corners (7px+) creating a friendly, approachable feel
- Tags: light, rounded, colorful, bold-typography, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#ffdd33`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#0066cc`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#000000`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#1b1b1b`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#fffceb`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | block | large | text-dark |
| 2 | `#000000` | `--palette-2` | button | large | text-light |
| 3 | `#80dbff` | `--palette-3` | block | large | text-dark |
| 4 | `#fffceb` | `--palette-4` | button | large | text-dark |
| 5 | `#ebf9ff` | `--palette-5` | block | large | text-dark |
| 6 | `#caf0ff` | `--palette-6` | section | large | text-dark |
| 7 | `#fff5c2` | `--palette-7` | block | large | text-dark |
| 8 | `#ffdd33` | `--palette-8` | button | large | text-dark |
| 9 | `#ffe770` | `--palette-9` | block | large | text-dark |
| 10 | `#0066cc` | `--palette-10` | button | medium | text-light |
| 11 | `#fff95f` | `--palette-11` | button | medium | text-dark |
| 12 | `#ffd64f` | `--palette-12` | text-accent | medium | text-dark |
| 13 | `#f4f4f4` | `--palette-13` | badge | small | text-dark |

## 3. Typography Rules

- **Heading Font:** `Kanit`, sans-serif
- **Body Font:** `Roboto`, sans-serif

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Kanit | 74px | 400 | 64px | normal |
| H2 | Kanit | 48px | 600 | 48px | normal |
| H3 | Kanit | 36px | 500 | 40px | normal |
| H4 | Kanit | 26px | 500 | 32px | normal |
| Body | Kanit | 16px | 300 | 24px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `74px` | headings |
| H1 | `48px` | headings |
| H2 | `36px` | headings |
| H3 | `28px` | headings |
| H4 | `26px` | headings |
| Body L | `25px` | body / supporting text |
| Body | `24px` | body / supporting text |
| Small | `20px` | body / supporting text |
| XS | `18px` | body / supporting text |
| Caption | `16px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: #000000;
  color: #ffffff;
  border-radius: 0px;
  padding: 5px 10px;
  font-size: 20px;
  font-weight: 700;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #ffd64f;
  border-radius: 7px;
  padding: 7px 7px;
  font-size: 20px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #000000;
  border-radius: 0px;
  padding: 12px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #ffdd33;
  color: #000000;
  border-radius: 68px;
  padding: 11px 20px;
  font-size: 16px;
  font-weight: 500;
  border: 0.8px solid rgb(0, 0, 0);
  cursor: pointer;
}
```

### Filled Button 2

```css
.btn-filled-2 {
  background: #fffceb;
  color: #1b1b1b;
  border-radius: 0px;
  padding: 36px 36px;
  font-size: 20px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 3

```css
.btn-ghost-3 {
  background: transparent;
  color: #1b1b1b;
  border-radius: 0px;
  padding: 36px 36px;
  font-size: 20px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #ffffff;
  border-radius: 28px;
  padding: 0px;
}
```

## 5. Layout Principles

- **Base spacing unit:** `36px` — use multiples (72px, 108px, 144px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `36px` | card |
| spacing-2 | `7px` | element |
| spacing-3 | `24px` | card |
| spacing-4 | `30px` | card |
| spacing-5 | `12px` | element |
| spacing-6 | `50px` | card |
| spacing-7 | `28px` | card |
| spacing-8 | `100px` | section |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-button | `7px` | button |
| radius-card | `28px` | card |
| radius-card | `68px` | card |
| radius-card | `50px` | card |
| radius-button | `10px` | button |
| radius-card | `60px` | card |

## 6. Depth & Elevation

No prominent box-shadows detected. This design likely uses flat surfaces with borders or background color changes for depth.

## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `Kanit` for all headings and `Roboto` for body text
- Use `#ffdd33` as the single dominant accent/CTA color
- Maintain `36px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`7px`+) consistently for all interactive elements
- Make headlines large and bold — typography is the hero element
- Embrace bold color combinations — playful energy is the point
- Use weight 400 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Kanit/Roboto with generic alternatives
- Don't use irregular spacing — stick to 36px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#1b1b1b` instead
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
- Maintain 36px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #1b1b1b
Accent:      #ffdd33
Secondary:   #0066cc
Border:      #fffceb
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `Kanit` heading in `#1b1b1b`, and a `#ffdd33` CTA button with 0px radius."
2. "Create a pricing card using background `#000000`, border `#fffceb`, `Roboto` for text, and 108px padding."
3. "Design a navigation bar — `#ffffff` background, `#1b1b1b` links, `#ffdd33` for active state."
4. "Build a feature grid with 3 columns, 108px gap, each card using the card component style."
5. "Create a footer with `#1b1b1b` background, `#ffffff` text, and 72px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Check responsive behavior — test mobile and tablet layouts
7. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 96 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--wp--preset--color--black` | `#000000` |
| `--wp--preset--color--cyan-bluish-gray` | `#abb8c3` |
| `--wp--preset--color--white` | `#ffffff` |
| `--wp--preset--color--pale-pink` | `#f78da7` |
| `--wp--preset--color--vivid-red` | `#cf2e2e` |
| `--wp--preset--color--luminous-vivid-orange` | `#ff6900` |
| `--wp--preset--color--luminous-vivid-amber` | `#fcb900` |
| `--wp--preset--color--light-green-cyan` | `#7bdcb5` |
| `--wp--preset--color--vivid-green-cyan` | `#00d084` |
| `--wp--preset--color--pale-cyan-blue` | `#8ed1fc` |
| `--wp--preset--color--vivid-cyan-blue` | `#0693e3` |
| `--wp--preset--color--vivid-purple` | `#9b51e0` |
| `--wp--preset--gradient--vivid-cyan-blue-to-vivid-purple` | `linear-gradient(135deg,rgb(6,147,227) 0%,rgb(155,81,224) 100%)` |
| `--wp--preset--gradient--light-green-cyan-to-vivid-green-cyan` | `linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)` |
| `--wp--preset--gradient--luminous-vivid-amber-to-luminous-vivid-orange` | `linear-gradient(135deg,rgb(252,185,0) 0%,rgb(255,105,0) 100%)` |
| `--wp--preset--gradient--luminous-vivid-orange-to-vivid-red` | `linear-gradient(135deg,rgb(255,105,0) 0%,rgb(207,46,46) 100%)` |
| `--wp--preset--gradient--very-light-gray-to-cyan-bluish-gray` | `linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)` |
| `--wp--preset--gradient--cool-to-warm-spectrum` | `linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)` |
| `--wp--preset--gradient--blush-light-purple` | `linear-gradient(135deg,rgb(255,206,236) 0%,rgb(152,150,240) 100%)` |
| `--wp--preset--gradient--blush-bordeaux` | `linear-gradient(135deg,rgb(254,205,165) 0%,rgb(254,45,45) 50%,rgb(107,0,62) 100%)` |
| `--wp--preset--gradient--luminous-dusk` | `linear-gradient(135deg,rgb(255,203,112) 0%,rgb(199,81,192) 50%,rgb(65,88,208) 100%)` |
| `--wp--preset--gradient--pale-ocean` | `linear-gradient(135deg,rgb(255,245,203) 0%,rgb(182,227,212) 50%,rgb(51,167,181) 100%)` |
| `--wp--preset--gradient--electric-grass` | `linear-gradient(135deg,rgb(202,248,128) 0%,rgb(113,206,126) 100%)` |
| `--wp--preset--gradient--midnight` | `linear-gradient(135deg,rgb(2,3,129) 0%,rgb(40,116,252) 100%)` |
| `--wp--preset--shadow--natural` | `6px 6px 9px rgba(0, 0, 0, 0.2)` |
| `--wp--preset--shadow--deep` | `12px 12px 50px rgba(0, 0, 0, 0.4)` |
| `--wp--preset--shadow--sharp` | `6px 6px 0px rgba(0, 0, 0, 0.2)` |
| `--wp--preset--shadow--outlined` | `6px 6px 0px -3px rgb(255, 255, 255), 6px 6px rgb(0, 0, 0)` |
| `--wp--preset--shadow--crisp` | `6px 6px 0px rgb(0, 0, 0)` |
| `--bricks-color-primary` | `#ffd64f` |
| ... | *(45 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--wp--preset--aspect-ratio--square` | `1` |
| `--wp--preset--spacing--20` | `0.44rem` |
| `--wp--preset--spacing--30` | `0.67rem` |
| `--wp--preset--spacing--40` | `1rem` |
| `--wp--preset--spacing--50` | `1.5rem` |
| `--wp--preset--spacing--60` | `2.25rem` |
| `--wp--preset--spacing--70` | `3.38rem` |
| `--wp--preset--spacing--80` | `5.06rem` |
| `--bricks-vh` | `1vh` |
| `--bricks-border-radius` | `4px` |

### Typography Variables

| Variable | Value |
|---|---|
| `--wp--preset--font-size--small` | `13px` |
| `--wp--preset--font-size--medium` | `20px` |
| `--wp--preset--font-size--large` | `36px` |
| `--wp--preset--font-size--x-large` | `42px` |

### Other Variables

| Variable | Value |
|---|---|
| `--wp--preset--aspect-ratio--4-3` | `4/3` |
| `--wp--preset--aspect-ratio--3-4` | `3/4` |
| `--wp--preset--aspect-ratio--3-2` | `3/2` |
| `--wp--preset--aspect-ratio--2-3` | `2/3` |
| `--wp--preset--aspect-ratio--16-9` | `16/9` |
| `--wp--preset--aspect-ratio--9-16` | `9/16` |
| `--bricks-transition` | `all 0.2s` |
