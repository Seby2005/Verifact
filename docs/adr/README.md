# Architecture Decision Records

Formal record of the significant technical decisions behind Verifact —
both the original choices from `docs/ARCHITECTURE.md` §8 and the ones made
during the hardening pass that added rate limiting, the atomic usage
counter, and circuit breakers.

Each ADR follows the same three-section format: **Context** (the
situation and constraints), **Decision** (what was chosen), and
**Consequences** (what that costs or enables, including what we
deliberately did *not* do).

| ADR | Decision |
|---|---|
| [0001](0001-nextjs-app-router.md) | Next.js App Router as the application framework |
| [0002](0002-supabase.md) | Supabase for database, auth, and storage |
| [0003](0003-css-modules.md) | CSS Modules instead of Tailwind/styled-components |
| [0004](0004-vercel-hosting.md) | Vercel as the hosting platform |
| [0005](0005-gemini-api.md) | Gemini API instead of OpenAI GPT-4 |
| [0006](0006-typescript-strict.md) | TypeScript in strict mode |
| [0007](0007-tavily-for-search-layers.md) | Tavily instead of Google Custom Search for layers 2-4 |
| [0008](0008-atomic-usage-counter.md) | Atomic usage counter via a Postgres RPC |
| [0009](0009-postgres-rate-limiting.md) | Postgres-backed distributed rate limiting |
| [0010](0010-circuit-breaker-design.md) | In-memory, per-service circuit breakers |

New decisions get a new file, `NNNN-short-title.md`, numbered
sequentially. Superseding an earlier decision adds a new ADR and marks the
old one's Status as `Superseded by ADR-NNNN` rather than editing history.
