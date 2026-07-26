# ADR-0001: Next.js App Router as the application framework

**Status:** Accepted

## Context

Verifact needs to serve a public, marketing-style homepage and public
fact-check report pages that must be indexable and shareable (Open Graph
previews, `ClaimReview` JSON-LD for search engines), alongside an
interactive verification tool and authenticated user pages. It also needs
a backend for orchestrating multiple external API calls per verification
without standing up a separate server process.

Alternatives considered: a Vite + React SPA with a separate API server (Express/Fastify).

## Decision

Use Next.js 14 with the App Router for both the frontend and the backend
(API Routes), written in TypeScript.

- Server-side rendering gives public report pages real HTML on first
  response, which a client-rendered SPA can't offer without extra
  infrastructure (a separate SSR/prerender step) — required for the
  `ClaimReview` structured data to be crawlable.
- API Routes remove the need for a second deployable service; the
  verification orchestrator, OCR endpoint, and auth callbacks all live in
  the same project and deploy together.
- Vercel is built by the same team and is a zero-config deploy target for
  this stack (see ADR-0004).

## Consequences

- The whole app is coupled to Next.js's conventions (file-based routing,
  Route Handlers, the App Router's server/client component split) —
  migrating off it later would touch nearly every file.
- API Routes run as Vercel serverless functions: no long-lived in-process
  state survives between invocations, which is exactly what forced the
  usage counter and rate limiter off in-memory storage and onto Postgres
  (ADR-0008, ADR-0009) once the app ran on more than one instance.
- Next.js's dev-mode Hot Module Replacement evaluates code via `eval()`,
  which has to be accounted for when writing a Content-Security-Policy
  (see the `next.config.mjs` history) — a static-export or SPA setup
  wouldn't have this specific interaction.
