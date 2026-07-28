# Verifact CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes, based on Andrej Karpathy's observations and adapted for this project.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Design Principles (from "A Philosophy of Software Design", John Ousterhout)

These extend the behavioral rules above with architecture-quality guidance — where the rules above are about not overreaching as an LLM, these are about what "good design" actually looks like once you're implementing.

- **Information hiding, not leakage.** A design decision (a data format, a config detail, an algorithm choice) should live inside one module. If two or more files need to agree on the same detail to make a change, that's information leakage — a sign the boundary is in the wrong place. When you find the same piece of logic decided in two places (e.g. one place filters/decides relevance, another place re-derives it for scoring), consolidate it into one, don't just patch both.
- **Deep modules over shallow ones.** A good module has a simple interface hiding real complexity; a shallow module's interface is nearly as complicated as its implementation. Prefer fewer, more capable functions/classes over many thin wrappers. This can be in tension with "no flexibility that wasn't requested" above — a slightly more general interface is fine, and often better, if it makes the module deeper; what to avoid is speculative *features*, not reasonable generality in an interface.
- **Pull complexity downward.** A module should absorb complexity internally rather than pushing configuration or edge-case handling onto every caller. If callers all need to pass the same extra parameter or all need to handle the same edge case themselves, that logic probably belongs inside the module instead.
- **Define errors out of existence.** Prefer redesigning an interface so a whole class of error can't occur, over adding another try/catch around it. Reach for this before reaching for more error handling.
- **Write the interface comment/docstring before the implementation.** If you can't describe a function's contract in a sentence or two without restating its code, the abstraction likely isn't clear yet — that's worth noticing before writing the body.
- **Tests confirm correctness, not design quality.** Passing tests don't mean the abstraction is good — you can have full coverage over a shallow, leaky design. Use the "verify" step to check behavior, but judge the design itself against the points above, separately.

---

## Project-Specific Guidelines

### Verifact Core Principles

- **Misinformation detection first** — All changes should support the core mission of identifying and verifying claims
- **Design system consistency** — Follow the established font loading and accessibility patterns (24px minimum, 44px touch targets)
- **Test UI changes in the browser** — Don't assume styling works; verify in preview before marking complete
- **Evidence-based iteration** — Check the /verify endpoint behavior and evidence layer rendering

### Tech Stack Notes

- **Next.js 14** with React for UI
- **TypeScript strict mode** — All code must be type-safe
- **Responsive design** — Mobile-first approach with 375px, 768px, and 1280px breakpoints
- **Dark mode support** — Use CSS variables for theming with no Flash of Wrong Theme (FWOT)
- **Accessibility** — WCAG compliance for touch targets and readability

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

**Reference:** Based on [Karpathy-Inspired Claude Code Guidelines](https://github.com/multica-ai/andrej-karpathy-skills)
