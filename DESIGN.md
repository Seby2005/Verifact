# Design System — Verifact („Prim-plan")

Single source of truth for the visual language. Tokens live in
[`src/app/globals.css`](src/app/globals.css); primitives in
[`src/components/ui`](src/components/ui).

## Principles

Verifact asks people to trust what it displays, and it asks them to do one
thing: check a claim. The design follows from those two facts.

1. **One action per screen.** The home page puts the headline and the
   verification tool in the first viewport. Everything else is below it.
2. **Prose is a cost.** A visitor who meets a wall of text leaves before
   reaching the tool. Copy is cut to a lead, three step titles and one closing
   line; structure and motion carry the rest.
3. **Colour means one thing: the verdict.** Chrome is monochrome. The only
   hues in the product are the four semantic verdict colours, so colour is
   never decorative — where you see it, it is telling you something.
4. **Soft, not squishy.** Rounded but restrained geometry (8–16px), hairline
   rules, one focus ring. No heavy shadows, no elevation theatre.
5. **Motion reveals, never performs.** Sections fade up as they enter view and
   the score counts to its value. Nothing bounces, and every effect is skipped
   under `prefers-reduced-motion`.

### Explicitly rejected

Do not reintroduce: emoji used as iconography, gradients, generic AI-startup
blue/violet, colour-coded traffic-light pills for verdicts, bouncy or springy
easing, or a verdict rendered as a filled badge.

## Colour

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#fbfbf9` | Page background |
| `--color-paper-shade` | `#f3f2ec` | Banded sections, hover fills |
| `--color-surface` | `#ffffff` | Raised surfaces: the tool, cards, inputs |
| `--color-ink` | `#16181c` | Headings, primary button fill |
| `--color-ink-secondary` | `#3f424a` | Body copy |
| `--color-ink-muted` | `#62646c` | Captions, metadata |
| `--color-line` | `#e6e5df` | Hairline separators |
| `--color-line-strong` | `#d3d2cb` | Resting field borders |
| `--color-accent` | `#1a6b54` | Focus rings, link hover — chrome, used sparingly |

### The verdict scale

The meaningful colour of the product. Muted and editorial, never neon.

| Token | Value | Band |
|---|---|---|
| `--verdict-true` | `#1a6b54` | Probabil adevărat (teal) |
| `--verdict-partial` | `#986516` | Parțial adevărat (ochre) |
| `--verdict-unclear` | `#4d5866` | Neclar (slate) |
| `--verdict-false` | `#a63a39` | Probabil fals (deep rose) |

`VerdictLabel` and `ScoreRing` set a local `--vc` from the band class, so the
verdict word, the score and the ring arc always agree. Every text/background
pair is at or above **4.5:1** (WCAG AA); the tightest is `--color-ink-muted`
on `--color-paper-shade` at 5.26:1.

## Typography

Three families, loaded via `next/font` in `src/app/layout.tsx`:

- `--font-family-sans` → **Hanken Grotesk** — interface, body, and every
  heading. It carries the page.
- `--font-family-serif` → **Fraunces** — the serif accent, used only for the
  claim under review, pull-quotes, the wordmark and the closing line.
- `--font-family-mono` → **JetBrains Mono** — scores, timestamps, eyebrows and
  data labels. The "instrument" voice.

The type scale is fluid (`clamp()`), so steps stay proportional from 375 to
1440 without breakpoint jumps. Display runs 36→60px, h1 32→44px, h2 24→32px.

Headings are sans and tightly tracked (`--tracking-display`, -0.025em). The
mono eyebrow (`.eyebrow`) is the uppercase tracked label style; it replaced the
old all-caps sans eyebrow.

## Spacing, geometry, motion

4px base: `--space-1` (4px) through `--space-24` (96px).

Radii: `--radius-sm` 8px, `--radius-md` 12px (buttons, fields),
`--radius-lg` 16px (cards, the tool), `--radius-pill` for chips and the
language toggle only.

Motion: `--transition-fast` 140ms, `--transition-normal` 240ms with
`--ease-out`. `Reveal` and `ScoreRing` both check `prefers-reduced-motion` and
render their final state immediately when it is set.

## Layout

- `--container-max-width` 1180px (`.container`).
- `--container-narrow` 940px (`.container-narrow`) — the home page and other
  focus surfaces. Narrower measure keeps the tool central.
- `--measure` 66ch for long-form prose.
- Breakpoints: **375 / 768 / 1024 / 1440px**.

## Components

`src/components/ui`

| Component | Notes |
|---|---|
| `Button` | `primary` (solid ink) / `secondary` / `ghost` / `danger` (verdict rose). Sentence case, 12px radius, 1px press. |
| `Input` / `Textarea` | Soft field on `--color-surface`, ring on focus. Errors use the rose. |
| `Tabs` | Sentence-case text tabs, ink underline on the active one. Full WAI-ARIA pattern with arrow-key navigation. |
| `Callout` | A filled, rounded aside on `--color-paper-shade`. Serif (`quote`) or sans (`plain`). |
| `VerdictLabel` | Verdict word plus score as text, coloured by band. No fill, no pill. |
| `ScoreRing` | The score as a thin ring in the band colour; counts up when scrolled into view. |
| `Reveal` | Fades and lifts children on first scroll into view. Content is always in the DOM — only the transition is gated. |
| `Card` | `default` / `bordered` / `ruled` / `flat`. 16px radius, hairline border, no shadow. |
| `Modal` | ESC to close, click-outside to close, focus trapped and restored. |

`src/components/verify` — `VerifyTool` (Text/Screenshot/URL, plus optional
one-tap example chips) and `ReportView`.
`src/components/layout` — `Header` (sticky, blurred), `Footer`, and
`routes.ts`, the single source of truth for navigation.

### Example claims must stay neutral

The chips under the text field exist so a first-time visitor can run a check
without composing one. They are settled science and folklore only — never
elections, parties, or anyone currently in office. A demo claim that reads as
politically aligned costs the product its credibility.

## Internationalisation

All user-facing copy comes from `src/i18n/dictionaries/{ro,en}.ts` via
`useLanguage().t()`. Never hard-code a visible string in a component; add a key
to both dictionaries instead.

## Routes

`/` · `/rapoarte` · `/transparenta` · `/preturi` · `/cont` · `/misiune` ·
`/open-source` · `/termeni` · `/confidentialitate`

`/transparenta` and `/open-source` are separate on purpose: the first answers
"how was this verdict reached" (method, sources, score weighting), the second
answers "who runs this and what happens to my data" (licence, auditability,
privacy).
