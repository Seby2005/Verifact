# Security

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Report them
privately through GitHub's [Security Advisories][advisories] on this
repository, or by email to the maintainer listed in `package.json`.

Include what you did, what you expected, and what happened. You will get an
acknowledgement within a few days.

[advisories]: https://github.com/Seby2005/Verifact/security/advisories/new

---

## Audit — 2026-07-25

Scope: the whole repository, including all 46 commits across every ref, plus
the built client bundle. This section records what was checked, what was found,
and what changed.

### 1. Secrets in git history

Scanned with **gitleaks 8.28.0** (`gitleaks git --redact`) over all 43 scannable
commits (~1.44 MB), then re-scanned the entire history for the *literal values*
of every credential currently in `.env.local`.

**Result: no real credential has ever been committed.**

gitleaks reported two `generic-api-key` hits, both **false positives** in
`.github/workflows/ci.yml`:

```yaml
NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
SUPABASE_SERVICE_ROLE_KEY:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
```

The high-entropy part is a standard JWT header followed by the literal word
`placeholder`. These are CI build stand-ins, not keys.

The value-level scan covered the Supabase URL, anon key, service-role key, all
Google API keys, the Gemini key, the NewsAPI key and the Tavily key. Every one
of them: **not present in any commit.** The only matches were
`NEXT_PUBLIC_APP_URL` (`http://localhost:3000`) and the Supabase project ref,
neither of which is a credential.

**No key rotation is required as a result of this audit.** (Unrelated to
history: the Gemini key currently has a zero quota and the Google Custom Search
key is blocked — see `docs/VERIFICATION-AUDIT.md`. Those are provisioning
problems, not exposure.)

### 2. Environment file hygiene

- `.gitignore` ignores `.env` and `.env.*`, with `!.env.example` re-included.
  Correct.
- `.env.example` is committed and contains only placeholders
  (`AIzaxxxxx`, `eyJxxxxx`, `tvly-xxxxx`, …). No real values.
- `.env.local` is untracked and has never been tracked.

### 3. Secrets in the built client bundle

Built the app and searched `.next/static` for every credential value.

| Credential | In client bundle | Correct? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes — public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes — public by design, RLS-scoped |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | correct |
| `GEMINI_API_KEY`, all Google keys, `NEWS_API_KEY`, `TAVILY_API_KEY` | **no** | correct |

A first pass appeared to find the service-role key in the bundle. It was a
false positive from the test itself: the anon and service-role JWTs are signed
with the same secret and share their first **110 characters**, so a fragment
taken from that prefix matches both. Re-tested against each token's unique
signature segment, the service-role key is absent from `.next/static` *and*
from `.next/server` (it is read from the environment at runtime, never inlined).

`src/lib/supabase/admin.ts` — the only service-role client — carries a
prominent danger banner, is not a Client Component, and its two consumers
(`lib/usage/anonymous-limit.ts`, `lib/user/gdpr.ts`) are server-only. Good.

### 4. Is the verification algorithm exposed to the browser?

**No.** Everything under `src/lib/verification/` is imported by exactly one
file, `src/app/api/verify/route.ts`, which is a server route handler. Verified
against the compiled output — none of these appear anywhere in `.next/static`:

`RATING_MAP` · `SOURCE_CREDIBILITY` · `ROMANIAN_PUBLIC_FIGURES` ·
`layerScore` · `buildAnalysisPrompt` · `factchecktools.googleapis.com` ·
`api.tavily.com` · the layer weights

The browser only ever sees the finished report. Note this is about the
*runtime*: the source is still fully readable in this public repository — see
`docs/ARCHITECTURE-PRIVACY-PROPOSAL.md` for what to do about that, which is a
separate decision.

### 5. Dependency vulnerabilities

`npm audit --omit=dev`: **2 high severity**, both from a single transitive
dependency — `postcss <= 8.5.17`, pulled in by `next@14.2.35`:

- GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` in stringify output
- GHSA-6g55-p6wh-862q — arbitrary file read via attacker-controlled `sourceMappingURL`
- GHSA-r28c-9q8g-f849 — path traversal in source-map auto-loading

All three require attacker-controlled **CSS input**, which this app does not
accept, so real exposure is low. The only offered fix is `next@16`, a major
upgrade. **Recommendation: do not force it now.** Track it and take the fix
when Next 14 ships a patched postcss or when a Next major upgrade is planned
for other reasons.

### 6. Other hardening notes

- `next.config.mjs` sets HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy` and a CSP. Good baseline.
- The CSP allows `'unsafe-eval'` and `'unsafe-inline'` in `script-src`. Next.js
  dev needs `unsafe-eval`, but both weaken XSS protection in production.
  Consider a nonce-based CSP for production builds.
- RLS is enabled on every table. However migration `0009` contains an infinite
  recursion that makes several policies fail closed — details and the fix are in
  `docs/TROUBLESHOOTING.md` and `supabase/migrations/0010_fix_rls_recursion.sql`
  on the `fix/db-signup` branch. It fails *closed*, so it is a correctness and
  availability problem rather than an exposure one.
- `middleware.ts` exists twice, byte-identical, at the repo root and at
  `src/middleware.ts`. Only one is used; the duplicate should be deleted so a
  future auth change cannot be made to the inactive copy.

### What changed in this audit

Nothing about the running system. No credentials needed rotating, no ignored
files needed adding. The changes on this branch are documentation:
this file, `docs/LICENSE-OPTIONS.md`, and
`docs/ARCHITECTURE-PRIVACY-PROPOSAL.md`.

### Reproducing the scan

```bash
gitleaks git --no-banner --redact --report-format json --report-path leaks.json .
npm audit --omit=dev
npm run build && grep -rlF "<a-secret-value>" .next/static
```
