# ADR-0004: Vercel as the hosting platform

**Status:** Accepted

## Context

The app needed a deploy target with zero-config support for Next.js
(App Router, Route Handlers, Middleware, Image Optimization), automatic
preview deployments per pull request, and a free tier viable for an
open-source project without dedicated infrastructure budget.

Alternatives considered: AWS (via a Next.js-compatible adapter) or
DigitalOcean (self-managed App Platform / droplet).

## Decision

Deploy to Vercel, built by the same team as Next.js.

## Consequences

- Every API route runs as an independent, short-lived serverless function
  invocation — no shared in-process memory between requests, and no
  guarantee two requests land on the same instance. This is the direct
  reason the original in-memory rate limiter and usage counter were
  correctness bugs under real concurrent traffic (ADR-0008, ADR-0009),
  not just a scaling concern.
- The in-memory circuit breakers (ADR-0010) inherit the same limitation —
  documented there as an accepted v1 tradeoff rather than a surprise.
- Moving off Vercel later would mean re-implementing preview deployments,
  edge routing, and the build pipeline's Next.js-specific optimizations
  (Image Optimization, ISR) on whatever platform replaces it.
