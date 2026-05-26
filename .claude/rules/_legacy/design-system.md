# Design System Rule — Mandatory for All UI/Frontend Tasks

> **Status: TRANSITIONAL (legacy airio enforcement).**
> Describes tokens currently shipped in `globals.css` (Bebas Neue + Space Mono + `--brand*` vars). Source of truth **only until** `_tokens.css` lands per `docs/tagsmith/_design-system.md` §14 (Geist Sans/Mono migration).
> When that migration ships, **delete this file** and let `docs/tagsmith/_design-system.md` become canonical.
> If you edit tokens here, mirror the change in the Tagsmith doc — or escalate the drift.

**Read this before touching any dashboard component, page, or style.**
Canonical design source: `docs/tagsmith/_design-system.md`. (Pre-pivot wireframe lives in the local gstack workspace; not committed.)

## Typography — Non-negotiable

| Use case | Class |
|---|---|
| Hero titles, section headings, scores, logo | `font-[family-name:var(--font-bebas)]` |
| Metadata, labels, chips, mono values, back links | `font-[family-name:var(--font-mono)]` |
| Body text, descriptions, form labels | `font-sans` (default, no class needed) |

Never use `font-semibold`, `font-bold`, or `text-2xl` for headings. Use Bebas Neue instead.

## Color Tokens — Non-negotiable

Never use hardcoded Tailwind color classes (`text-gray-*`, `bg-green-*`, `text-blue-*`, `bg-black`, `text-red-*`, etc.) in any dashboard file.

| Semantic intent | Token |
|---|---|
| Page background | `bg-background` / `text-foreground` |
| Card / surface | `bg-card` / `text-card-foreground` |
| Muted surface | `bg-muted` |
| Muted text / secondary labels | `text-muted-foreground` |
| Borders | `border-border` |
| Brand yellow (bg) | `bg-[var(--brand)]` |
| Brand yellow fg (text on yellow) | `text-[var(--brand-fg)]` |
| Brand yellow (text on dark bg) | `text-[var(--brand-text)]` |
| Success | `text-[var(--brand-success)]`, `bg-[var(--brand-success-muted)]`, `border-[var(--brand-success-border)]` |
| Warning | `text-[var(--brand-warning)]`, `bg-[var(--brand-warning-muted)]`, `border-[var(--brand-warning-border)]` |
| Danger / critical | `text-[var(--brand-danger)]`, `bg-[var(--brand-danger-muted)]`, `border-[var(--brand-danger-border)]` |
| Blue / info | `text-[var(--brand-blue)]`, `text-[var(--brand-blue-fg)]` |
| Tinted blue surface | `bg-[var(--surface-blue)]` |
| Tinted yellow surface | `bg-[var(--surface-yellow)]` |

## Shape — Zero Radius

`--radius: 0` is set globally. **Never add `rounded-*` classes** — they are banned. All UI is sharp/square.

## Layout Patterns

### Page sections
Each major section: `px-8 py-8 border-b border-border` — no Card wrappers.
Last section omits `border-b`.

### Hero sections
Two-column grid: `grid grid-cols-[1fr_auto] gap-8 items-end px-8 py-16 border-b border-border`
Left: Bebas title + meta. Right: score or CTA.

### Score display
- Large (hero): `font-[family-name:var(--font-bebas)] text-[96px] leading-none`
- Medium (card): `font-[family-name:var(--font-bebas)] text-[48px] leading-none`
- Color by value: ≥70 → `text-[var(--brand-text)]`, ≥40 → `text-[var(--brand-blue)]`, <40 → `text-[var(--brand-danger)]`

### Severity chips
```tsx
// critical
'font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 bg-[var(--brand-danger)] text-white'
// high
'... bg-orange-500 text-white'
// medium
'... bg-[var(--brand-blue)] text-[var(--brand-blue-fg)]'
// low
'... bg-muted text-muted-foreground border border-border'
```

### Back links
```tsx
className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] hover:text-[var(--brand-text)] transition-colors"
```

### Section labels / eyebrow text
```tsx
className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em]"
```

### Buttons — primary
```tsx
className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity"
```

### Buttons — secondary / outline
Use shadcn `<Button variant="outline">` — inherits zero radius from global `--radius: 0`.

### Toggle switches (on/off)
```tsx
<button
  type="button"
  onClick={toggle}
  className={`w-11 h-6 relative border transition-colors ${on ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-muted border-border'}`}
>
  <span className={`absolute top-0.5 w-5 h-5 bg-background transition-all ${on ? 'left-5' : 'left-0.5'}`} />
</button>
```

### Form inputs (native `<select>`, `<input>`)
```tsx
className="w-full border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
```
Shadcn `<Input>` is fine — radius is already 0 globally.

### Grid of cards
```tsx
className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px border border-border"
// each card:
className="bg-card border-r border-border p-8 hover:bg-muted/50 transition-colors"
```

### Charts (recharts)
- Stroke: `"var(--brand-text)"`
- Fill: `"var(--surface-yellow)"`
- No animation: `isAnimationActive={false}`
- No dot: `dot={false}`
- Suppress tooltip: `<Tooltip contentStyle={{ display: 'none' }} cursor={false} />`

### Ticker strip
```tsx
<div className="overflow-hidden bg-[var(--brand)] text-[var(--brand-fg)] py-1.5">
  <div className="inline-flex whitespace-nowrap font-[family-name:var(--font-mono)] text-[11px] font-bold"
       style={{ animation: 'ticker 60s linear infinite' }}>
```
`@keyframes ticker` is defined in `globals.css`.

## Loading / empty states
Use `text-muted-foreground` + Space Mono for loading text. Never `text-gray-500`.

## What NOT to do
- ❌ `rounded-*` anywhere
- ❌ `text-gray-*`, `bg-gray-*`, `text-green-*`, `bg-green-*`, `text-blue-*`, `bg-black`, `text-white` (outside chips)
- ❌ `<Card>` wrappers for page sections — use `border-b border-border` divs
- ❌ Hardcoded `font-semibold`/`font-bold` for headings
- ❌ Inline `style={{ color: '#...' }}` or any hardcoded hex
