---
applyTo: "app/**/*.css,components/**/*.tsx,app/**/*.tsx"
description: "Hostlive design system — palette, typography, shape, component inventory. Owner of all visual decisions."
---

# Hostlive — design system

Read this before touching any CSS, class name, or JSX that renders UI. The look was refreshed on 2026-11-15 (Public Sans + Source Serif 4 via `next/font`, larger small-text scale, bottom nav bar on phones). Keep to this refreshed look; do not redesign again without the owner asking.

## Identity

Studio logbook for a live-commerce broadcast floor. Paper stock, ink, tally lights. Not a SaaS dashboard.

- One accent: tally-light red `--onair` (#C43A2F), signalling "on air". Never use it for decoration.
- Deep green `--signal` (#14624F) = success, finance, confirmation.
- Amber `--amber` = waiting / pending / warning.
- Serif for headline and numerals with gravitas. Sans for controls and dense data.
- Flat panels, hairline rules, low radii. No glassmorphism, no gradients as decoration, no soft shadows.

## Palette — tokens only

Every color comes from `app/tokens.css`. A hex literal outside `tokens.css` is a bug.

| group | tokens |
|---|---|
| surface | `--paper` `--paper-deep` `--panel` `--field` |
| text | `--ink` `--ink-soft` `--muted` `--on-ink` `--on-ink-law` `--on-ink-dim` `--on-accent` |
| border | `--rule` `--rule-strong` |
| success/finance | `--signal` `--signal-deep` `--signal-wash` `--signal-rule` |
| on air/danger | `--onair` `--onair-deep` `--onair-wash` `--onair-rule` `--onair-rule-soft` |
| pending | `--amber` `--amber-deep` `--amber-wash` `--amber-rule` |
| dark slab | `--slab` |

Dark mode is `@media (prefers-color-scheme: dark)` re-declaring the same token names. Add a new color by adding it to **both** blocks; never by writing a media query at the usage site.

To invent a shade, either promote it to a token pair (light + dark) or derive it with `color-mix(in srgb, var(--token) 12%, transparent)`. No raw hex.

## Typography

- `--font-sans` for body, labels, controls, tables. `--font-serif` for `h1`/`h2`, `.serif`, and money figures.
- Sizes in `rem`. Smallest readable size is `.75`. Existing small sizes after the 2026-11-15 refresh: `.75 .8 .82 .84`, then `.85 .95 1 1.15 1.35 1.6`. Do not add sizes below `.75`.
- Fonts are loaded in `app/layout.tsx` (`Public_Sans`, `Source_Serif_4`) and exposed through `--font-sans` / `--font-serif` in `tokens.css`. Do not hardcode font names elsewhere.
- Body line-height ≥ 1.55 for sans, 1.6+ for serif. Line length < 80ch.
- Labels are sentence case. Two sanctioned exceptions already exist: `.nav-group-label` and `.auth-note-label` (uppercase, `letter-spacing: 0.07em`). Do not add a third. No letter-spaced eyebrow text on new components, no `01 / 02 / 03` numbering unless the content is genuinely a sequence (slot order qualifies; feature lists do not).
- Numeric columns get `font-variant-numeric: tabular-nums`.

## Shape

Radius tokens only: `--r-xs` 2 / `--r-sm` 5 / `--r-md` 6 / `--r-base` 7 / `--r-lg` 8 / `--r-xl` 10 / `--r-2xl` 12 / `--r-pill` 999.

Hierarchy shows through the step: panel `--r-xl`, card `--r-2xl` only for the hero live card, control `--r-base`, badge `--r-pill`, swatch/track `--r-xs`.

Borders are `1px solid var(--rule)`, emphasis `--rule-strong`. Shadows: none. If something must lift, use `--slab` background, not a shadow.

Layout grid uses `var(--sidebar-w)`. Never hardcode `232px`.

## Component inventory — reuse, never re-invent

React primitives, `components/ui.tsx`: `Panel`, `Stat`, `Empty`, `StatusBadge`, `VerifyBadge`, `FlashBox`.
`components/`: `ConfirmButton`, `SubmitButton`, `LiveTimer`, `NavLink`.

Class vocabulary — use these names. New component = new `.css` rules in the matching file, not inline `style={{}}`.

- `app/ui.css` — `.panel .panel-head .panel-body .stack .row .grid-stats .stat* .btn(.btn-primary/.btn-danger/.btn-sm/.btn-ghost) .field .field-hint .form-grid .flash(.flash-ok/.flash-err) .badge(.badge-live/-wait/-done/-mute/-onair) .dot(.dot-pulse) .table-wrap .empty .muted .small .serif`
- `app/widgets.css` — `.split .live-card* .live-clock .slot-list .matrix-scroll .matrix* .cell* .icon-btn .picker* .chart* .swatch .alert* .studio-grid .studio-card .filter-bar`
- `app/auth.css` — login/shell only. `app/loading.css` — skeletons only. `app/globals.css` — resets, shell, sidebar, typography, focus ring.

Inline `style={{}}` is only acceptable for a value computed at runtime (a width, a delay). Static styling belongs in CSS.

## Rules that keep it coherent

1. New UI that repeats an existing pattern → reuse the class. Do not fork a second look-alike class.
2. New color, radius, size, or shadow → add a token first, then use it. No magic numbers.
3. One accent per screen. If red appears twice for different meanings, one of them is wrong.
4. Motion: only in response to a user action, or one page-load reveal. `transition: 120ms ease` on interactive state. `@media (prefers-reduced-motion: reduce)` must disable pulses and slides.
5. Focus is always visible: `outline: 2px solid var(--onair); outline-offset: 2px` (already in `globals.css`, do not remove).
6. Text on `--paper` and `--panel` must hit 4.5:1. `--muted` is the floor.
7. Empty and error states carry direction, not mood: say what happened and what to do next. Indonesian, sentence case, no apology.
8. All user-facing copy is Indonesian. No lorem ipsum, no English placeholder.
9. Tables: `<th scope="col">`, `tabular-nums` on numeric cells, sticky head inside `.matrix-scroll`.
10. Responsive down to 360px. Sidebar collapses to a bar; tables scroll in `.table-wrap` / `.matrix-scroll`, never the page.

## Before you ship

- [ ] `grep -n '#[0-9a-fA-F]\{3,6\}' app/*.css components` → hits only `tokens.css`
- [ ] `grep -n 'border-radius: [0-9]' app/*.css components` → no hits
- [ ] No new `style={{}}` for static values
- [ ] Dark mode checked (`prefers-color-scheme: dark`)
- [ ] Keyboard tab-through, focus ring visible
- [ ] `npm run build` clean
