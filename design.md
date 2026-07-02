# Snip – Design System

Visual language borrowed from https://lovable.dev/ (look and feel only — no logo, name, or copy).

## What lovable.dev looks like

- Warm ivory page background (#F6F2EE) that fades into a vivid multicolour gradient glow
  at the bottom of the hero viewport (indigo · pink · coral, heavily blurred).
- One bold centred headline + short muted sub-line.
- The hero's absolute centrepiece is a **large white rounded card** (the "chat input"):
  no visible border, big shadow, borderless text field at the top, action row pinned at the
  bottom with a small dark pill/circle submit button on the right.
- Below the hero: content lives in white **cards** with generous rounding, subtle borders,
  and soft shadows — lots of breathing room.
- Clean geometric sans-serif, near-black text, near-zero decoration.

---

## Color tokens

| Token               | Value                  | Use                                       |
|---------------------|------------------------|-------------------------------------------|
| `--bg`              | `#F6F2EE`              | Page background (warm ivory)              |
| `--surface`         | `#FFFFFF`              | Cards, input card                         |
| `--border`          | `rgba(0, 0, 0, 0.06)`  | Card / row borders                        |
| `--text`            | `#1A1A1A`              | Primary text, headings                    |
| `--text-muted`      | `#6B7280`              | Sub-headings, table headers, meta         |
| `--text-placeholder`| `#9CA3AF`              | Input placeholder                         |
| `--error`           | `#DC2626`              | Validation / API error messages           |
| `--btn-bg`          | `#1A1A1A`              | Primary action button (send circle)       |
| `--btn-text`        | `#FFFFFF`              | Primary action button text                |

## Accent gradient (hero glow)

Three overlapping radial gradients pinned to the bottom of the hero, blurred into a soft
multicolour bloom via a `::after` pseudo-element.

```
radial-gradient(ellipse 90% 55% at 15% 110%, #6366f199, transparent 60%)   /* indigo */
radial-gradient(ellipse 70% 55% at 50% 115%, #ec489999, transparent 55%)   /* pink   */
radial-gradient(ellipse 90% 55% at 85% 110%, #f9731666, transparent 60%)   /* coral  */
filter: blur(48px)
```

## Typography

Font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`

| Scale        | Size                       | Weight | Use                         |
|--------------|----------------------------|--------|-----------------------------|
| Hero title   | `clamp(2.5rem, 5vw, 3.5rem)` | 800  | Page `<h1>`                 |
| Hero sub     | `1.125rem`                 | 400    | Sub-headline under `<h1>`   |
| Section head | `1.125rem`                 | 600    | Card `<h2>`                 |
| Body         | `1rem`                     | 400    | Table cells, labels         |
| Small / meta | `0.875rem`                 | 400    | Timestamps, table headers   |
| Micro        | `0.8125rem`                | 400    | Result pill label           |

## Spacing

Base unit 4 px (0.25 rem). Commonly used steps: 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96 px.

## Border radii

| Token      | Value    | Use                              |
|------------|----------|----------------------------------|
| `--r-sm`   | `8px`    | Small chips / tag-like elements  |
| `--r-md`   | `16px`   | Minor utility surfaces           |
| `--r-lg`   | `24px`   | Input card, links card           |
| `--r-pill` | `9999px` | Buttons, send circle, result tag |

## Borders, shadows, glow

```
--border:       1px solid rgba(0, 0, 0, 0.06)
--shadow-card:  0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)
--shadow-input: 0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)
```

## Snip element → design system mapping

| Snip element        | Design role                                                                   |
|---------------------|-------------------------------------------------------------------------------|
| Page `<h1>` + sub   | **Hero** — centred, bold headline + muted sub, gradient glow behind via `::after` |
| URL `<form>`        | **Chat-style input card** — white, `--r-lg`, `--shadow-input`; borderless field on top, action row + send circle at bottom |
| Send / Shorten btn  | Dark circle (`--btn-bg`, `--r-pill`, 36 × 36 px) with ↑ icon inside the card footer |
| `result` notice     | Pill-shaped surface tag below the card (`--surface`, `--r-pill`, `--shadow-card`) |
| `error` notice      | `--error` inline text below the card, no background                           |
| Links section       | **Card** — `--surface`, `--r-lg`, `--shadow-card`, `--border`; table inside with `--bg` header rows |
