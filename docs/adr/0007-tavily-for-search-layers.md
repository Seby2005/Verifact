# ADR-0007: Tavily instead of Google Custom Search for layers 2-4

**Status:** Accepted (supersedes the Google Custom Search plan in `docs/ARCHITECTURE.md` §2.5, which was never updated to reflect this)

## Context

`docs/ARCHITECTURE.md` and `docs/TASKS.md` originally specified Google
Custom Search JSON API, domain-restricted via a Programmable Search Engine
`cx` config, for layer 2 (news, supplementing NewsAPI), layer 3 (official/
government sources), and layer 4 (social media, as a fallback when the
Twitter API isn't configured).

In practice, per the comments left in `src/lib/verification/layer3-official.ts`
and `layer2-news.ts`: the Google Custom Search API was blocked at the
Google Cloud project level (HTTP 403), and the configured
`GOOGLE_OFFICIAL_SEARCH_ENGINE_ID` held an API key rather than a valid
Programmable Search Engine `cx` id — layer 3 returned nothing, ever, under
the originally-planned setup.

## Decision

Use Tavily's search API instead, for all three layers that need general
web search:

- Layer 2 (news): full web-wide search, no domain allowlist — ranked by
  Tavily's own relevance score rather than a hand-maintained list.
- Layer 3 (official): Tavily's `include_domains` parameter restricts
  results server-side to the same official-domain allowlist
  (`INCLUDE_DOMAINS` in `layer3-official.ts`) that a Custom Search Engine's
  `cx` config would have enforced.
- Layer 4 (social): `include_domains` restricted to
  `twitter.com`/`x.com`/`facebook.com`/`youtube.com`, used as the fallback
  when `TWITTER_BEARER_TOKEN` isn't configured or the Twitter API call
  fails.

## Consequences

- One `TAVILY_API_KEY` covers three layers instead of needing a working
  Google Cloud Search project — simpler to configure correctly, which
  matters for an open-source project where contributors set up their own
  API keys.
- `docs/ARCHITECTURE.md` §2.5's API cost table and `docs/TASKS.md`'s S2-3/
  S2-4/S2-5 task descriptions still describe the original Google Custom
  Search plan and were not updated when this migration happened — a reader
  following those docs literally would set up credentials this codebase no
  longer uses. This ADR is the record of what's actually true; the
  original docs are not corrected as part of this pass (out of scope for
  the hardening task that produced this ADR) but should be reconciled.
- Tavily has its own free-tier credit limit (1000 credits/month, 1 credit
  per `basic` search call, per the comment in `layer2-news.ts`) — the same
  class of quota-exhaustion risk as Gemini's (ADR-0005), and the same
  retry/circuit-breaker treatment (ADR-0010) applies to it.
- All three layers share one circuit breaker key (`'tavily'`, see
  ADR-0010) rather than one each, since they're the same underlying
  account and quota.
