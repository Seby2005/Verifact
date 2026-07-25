# Design System — AI Fact-Checker

Single source of truth for the visual language of the app. Tokens live in
[`src/app/globals.css`](src/app/globals.css); primitive components live in
[`src/components/ui`](src/components/ui). A live reference of every component
variant is at the `/design-system` route.

## Principles

This is a fact-checking product — the UI's job is to earn trust, not to look
like a generic AI-startup landing page. Concretely, that means:

- Restrained color: one primary action color, semantic colors reserved for
  verdicts, a dedicated color for source/provenance signals.
- Editorial typography: a serif headline face paired with a sans body face,
  not one font stretched across every size.
- No decoration without purpose: no gradients, no blurred hero blobs, no
  bouncy easing, no emoji standing in for iconography.
- Sources and certainty are always visible, never buried behind a bare
  verdict label.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#2563eb` | Primary actions, links, focus ring |
| `--color-trust` | `#0f766e` | Verified-source / provenance signals — deliberately distinct from the verdict palette so "this source is credible" is never confused with "this claim is true" |
| `--color-success` | `#16a34a` | Verdict: adevărat |
| `--color-error` | `#dc2626` | Verdict: fals |
| `--color-warning` | `#d97706` | Verdict: parțial adevărat |
| `--color-unclear` | `#ea580c` | Verdict: neclar |
| `--color-gray-50 … 900` | `#f8f9fa … #0f172a` | Neutrals — text, borders, surfaces |

Each semantic color has a paired `-hover` and `-light` (tint, used as a
badge/alert background) variant, e.g. `--color-success-hover`,
`--color-success-light`.

## Typography

Two font families, loaded via `next/font` in `src/app/layout.tsx`:

- `--font-family-sans` (Inter) — body copy, UI labels, buttons, inputs.
- `--font-family-serif` (Source Serif 4) — `h1`/`h2`/`h3` headings by default
  (see the base styles in `globals.css`), plus anywhere else editorial
  emphasis is wanted (e.g. the hero's sample-claim text).

Six-step type scale, each with a matching line-height token:

| Token | Size | Typical use |
|---|---|---|
| `--font-size-display` | 48px | Hero headline |
| `--font-size-h1` | 36px | Page title |
| `--font-size-h2` | 28px | Section title |
| `--font-size-h3` | 20px | Card/subsection title |
| `--font-size-body` | 16px | Default body text, inputs |
| `--font-size-body-sm` | 14px | Secondary text, labels |
| `--font-size-caption` | 12px | Helper text, timestamps, captions |

Font weights: `--font-weight-normal` (400), `-medium` (500), `-semibold`
(600), `-bold` (700).

## Spacing

4px-based scale — every padding/gap/margin in the design system should come
from this list, not an arbitrary rem value:

`--space-1` (4px) · `--space-2` (8px) · `--space-3` (12px) · `--space-4`
(16px) · `--space-5` (20px) · `--space-6` (24px) · `--space-8` (32px) ·
`--space-10` (40px) · `--space-12` (48px) · `--space-16` (64px) ·
`--space-20` (80px)

## Layout

- `--container-max-width` (1180px) — the max width for header/footer/page
  content wrappers.
- Verified breakpoints: **375px** (mobile), **768px** (tablet), **1024px**
  (laptop), **1440px** (desktop). CSS custom properties can't be referenced
  inside `@media` queries, so components repeat these as literal values.
- The root layout renders an `.app-shell` (`Header` → `<main>` → `Footer`)
  as a column flexbox with `min-height: 100vh`, so the footer pins to the
  bottom on short pages instead of floating mid-viewport.

## Radius, shadow, motion

- Radius: `--radius-sm` (4px, inputs/buttons) · `--radius-md` (8px, cards) ·
  `--radius-lg` (12px, modals) · `--radius-full` (pills/badges). No
  uniform "everything is 16px" rounding — radius scales with how
  prominent the element is.
- Shadow: `--shadow-sm` through `--shadow-xl`, used sparingly (cards use
  `sm`/`md`; modals use `xl`).
- Motion: `--transition-fast` (150ms) / `--transition-normal` (250ms), both
  `ease-in-out`. No spring/bounce easing anywhere.

## Components (`src/components/ui`)

| Component | Variants | Notes |
|---|---|---|
| `Button` | `primary` / `secondary` / `danger` / `ghost` / `outline`, sizes `sm`/`md`/`lg` | Renders an `<a>` instead of a `<button>` when given an `href` prop, for link-styled-as-button CTAs |
| `Input` | default / error / disabled | Label, helper text, and error text are all part of the component, not free-floating markup |
| `Card` | `default` / `bordered` / `flat`, padding `none`/`sm`/`md`/`lg` | |
| `Badge` | `true` / `false` / `partial` / `unclear` / `trust` / `primary` / `secondary` | Verdict and `trust` variants render a matching SVG icon automatically (see `icon` prop to opt out) |
| `Modal` | — | ESC to close, click-outside to close, focus stays trapped to the dialog |
| icons (`ui/icons/VerdictIcons.tsx`) | check-circle, x-circle, alert-triangle, help-circle, shield-check | Hand-drawn, stroke-based, single icon family — not a mixed stock icon set |

`Header` and `Footer` (`src/components/layout`) compose these primitives and
are not meant to be used outside the root layout.

## What this pass did **not** touch

Scoped deliberately to the design system, shell, and homepage. The
following pages don't exist in the codebase yet and were **not**
fabricated as part of this redesign — they still need real product
requirements before they're built:

- `/login`, `/signup` (auth currently has a known backend issue — tracked
  separately)
- The verification-flow screen (claim/screenshot input → AI analysis →
  report)
- `/mission`, `/open-source`, legal pages

When those are built, they should draw only from the tokens and
components documented here — no new one-off colors, font sizes, or
spacing values without adding them to this file first.
