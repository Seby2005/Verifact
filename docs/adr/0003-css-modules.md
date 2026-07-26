# ADR-0003: CSS Modules instead of Tailwind/styled-components

**Status:** Accepted

## Context

The UI needed a styling approach with real isolation between components
(no class-name collisions as the component count grows) and no build-time
dependency on a utility-class framework's specific conventions.

Alternatives considered: Tailwind CSS, styled-components/Emotion (CSS-in-JS).

## Decision

Use CSS Modules (built into Next.js, no extra dependency) — one
`Component.module.css` file per component, imported as a scoped `styles`
object.

## Consequences

- No utility-class vocabulary to learn or keep consistent across
  contributors; styling is plain CSS, which is also the lowest-friction
  option for open-source contributors who don't already know a specific
  framework's conventions.
- Design tokens (color, spacing, type scale) have to be maintained by hand
  as CSS custom properties in `globals.css` rather than coming from a
  framework's generated scale — see `globals.css`'s "Shared utility
  classes" section and the `:root` variable block.
- No automatic dead-CSS-class removal the way Tailwind's JIT compiler
  provides; unused module classes accumulate silently rather than being
  purged.
