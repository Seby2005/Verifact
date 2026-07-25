# Design System — Verifact

Single source of truth for the visual language. Tokens live in
[`src/app/globals.css`](src/app/globals.css); primitives in
[`src/components/ui`](src/components/ui).

## Principles

Verifact asks people to trust what it displays, so the interface is built to
look like serious press rather than a software product. Four rules follow from
that, and everything else is downstream of them:

1. **Black on white.** Red is the only accent and it is rationed — an eyebrow
   label, an active tab underline, a callout bar, a "false" verdict. Nothing
   decorative gets color.
2. **Serif headlines, sans everything else.** The contrast between the two
   families *is* the hierarchy; size alone is not enough.
3. **Rules, not elevation.** Sections are separated by 1px lines. There is no
   shadow token — the only `box-shadow` in the system is an inset focus ring.
4. **Squared off.** 2px is the maximum radius. There is no pill radius token
   because nothing here is pill-shaped.

### Explicitly rejected

These were present in an earlier iteration and are gone deliberately. Do not
reintroduce them: emoji used as iconography (a shield in the wordmark, green
checks beside sources), colored rounded badges for verdicts or scores, a blue
primary button, gradients, and a single sans font carrying every level of the
hierarchy.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#ffffff` | Page background |
| `--color-paper-shade` | `#f7f7f5` | Faint banded sections |
| `--color-ink` | `#0a0a0a` | Headings, primary button fill |
| `--color-ink-secondary` | `#3f3f3f` | Body copy |
| `--color-ink-muted` | `#5c5c5c` | Captions, metadata |
| `--color-accent` | `#dc2626` | Eyebrows, active tab rule, callout bar, false verdicts |
| `--color-accent-dark` | `#b91c1c` | Accent text needing more contrast; link hover |
| `--color-rule` | `#0a0a0a` | Structural section rules |
| `--color-rule-hairline` | `#d8d8d4` | Row separators, input borders |

Every text/background pair in the system is at or above **4.5:1** (WCAG AA for
normal text); the lowest is accent-on-paper at 4.83:1.

Verdicts are **not** color-coded on a traffic-light scale. Only "probabil fals"
takes the accent; the other three bands stay in ink. Restricting the accent is
what gives it meaning.

## Typography

Two families, loaded via `next/font` in `src/app/layout.tsx`:

- `--font-family-serif` → **Newsreader** — every `h1`–`h4`, plus quoted claims
  and prices where editorial weight is wanted.
- `--font-family-sans` → **IBM Plex Sans** — body copy, navigation, labels,
  buttons, form fields.

| Token | Size | Use |
|---|---|---|
| `--font-size-display` | 64px | Homepage headline |
| `--font-size-h1` | 44px | Page titles |
| `--font-size-h2` | 30px | Section titles |
| `--font-size-h3` | 20px | Subsection titles |
| `--font-size-lead` | 19px | Standfirst / deck |
| `--font-size-body` | 16px | Body |
| `--font-size-body-sm` | 14px | Secondary text |
| `--font-size-caption` | 12px | Eyebrows, labels, metadata |

Sizes step down at the 640px breakpoint. Weights: 400 / 500 / 600 / 700.

**The uppercase label style** (`--tracking-label`, 0.1em) is used for eyebrows,
nav, buttons and verdict labels. Keep it under ~20 characters — all-caps costs
legibility past a couple of words, which is why the PRD's longer verdict names
are split into a short label plus a sentence-case qualifier (`VERDICT_NOTE`).

## Spacing

4px base: `--space-1` (4px) through `--space-24` (96px). Every padding, gap and
margin comes from this scale.

## Layout

- `--container-max-width` 1140px, applied via the global `.container` class.
- `--measure` 68ch — the reading width for long-form prose.
- Breakpoints: **375 / 768 / 1024 / 1440px**. CSS variables can't be used in
  `@media` queries, so components repeat these literals.
- Root layout renders `.app-shell` (Header → `<main>` → Footer) as a column
  flexbox with `min-height: 100vh`.

## Components

`src/components/ui`

| Component | Notes |
|---|---|
| `Button` | `primary` (solid ink) / `secondary` (outline) / `ghost` / `danger`. Uppercase, tracked, 2px radius. Renders an `<a>` when given `href`. |
| `Input` / `Textarea` | Thin hairline border, square, no shadow. Label, helper and error text are part of the component. |
| `Tabs` | Text tabs with a red active underline. Full WAI-ARIA tab pattern including arrow-key navigation. |
| `Callout` | Editorial callout: thin red left bar, serif body (`quote`) or sans (`plain`). Not a tinted card. |
| `VerdictLabel` | Verdict as a typographic label plus the score as plain text. No fill, no radius. `verdictFromScore` maps a score to a band per PRD §3.2. |
| `Card` | `default` / `bordered` / `ruled` / `flat`. Delimited by rules; carries no shadow. |
| `Modal` | ESC to close, click-outside to close, focus trapped and restored. |

`src/components/verify` — `VerifyTool` (the Text/Screenshot/URL tool) and
`ReportView` (editorial report rendering).
`src/components/auth` — `AuthPanel` (login/signup).
`src/components/layout` — `Header`, `Footer`, and `routes.ts`, the single
source of truth for navigation.

## Routes

`/` · `/rapoarte` · `/transparenta` · `/preturi` · `/cont` · `/misiune` ·
`/open-source`

`/transparenta` and `/open-source` are separate on purpose: the first answers
"how was this verdict reached" (method, sources, score weighting), the second
answers "who runs this and what happens to my data" (licence, auditability,
privacy). Different readers, different questions — merging them buries both.

## Backend status

The verification pipeline described in `docs/PRD.md` §3.2 does not exist yet.
`/api/verify` validates input and returns **501 `not_implemented`** rather than
a placeholder verdict — inventing a score would be indistinguishable from a
real answer to a user, which is the exact failure this product exists to fight.
The full tool UI is built and wired; `TODO(backend)` marks every integration
point. The same applies to the reports list on `/rapoarte`, whose entries are
labelled in the UI as illustrative examples.
