# Verifact API v1 + Extension — Frozen Contract

**Status:** Frozen v1.0 — 2026-08-20. This is the shared interface all three
work tracks build against. Do not change request/response shapes or auth rules
without updating this file first and notifying the other tracks. Everyone builds
in parallel against this document; the Chrome extension mocks these responses
until the real endpoint lands.

This document is the single source of truth for two features that share one
foundation:

1. **Business API keys** — programmatic access for Business-tier customers.
2. **Chrome extension** — mirrors the website: anonymous users get 3 checks per
   30 days; logged-in Pro/Business users get their normal tier limit.

Both consume the same endpoint and the same Bearer-auth foundation. They differ
only in which *kind* of token they send.

---

## 1. The endpoint

```
POST /api/v1/verify
Content-Type: application/json
```

Unlike the website's `/api/verify` (which streams newline-delimited JSON for
live progress), `/api/v1/verify` returns a **single JSON response** when the
verification is complete. Programmatic clients and the extension want one
result, not a progress stream.

### Request body

```jsonc
{
  "text": "string, 10..2000 chars (required unless inputType=url)",
  "inputType": "text" | "url" | "screenshot",   // default "text"
  "language": "ro" | "en" | "fr" | "unknown",   // default "unknown"
  "isPublic": false                              // default false
}
```

- For `inputType: "url"`, `text` is the URL; the server fetches the article.
- Input over 2000 chars is truncated, not rejected (matches the website).

### Success response — `200`

```jsonc
{
  "success": true,
  "report": { /* the full VerificationReport object, identical to /api/verify's terminal `report` event */ },
  "usage": {
    "tier": "free" | "pro" | "business",
    "remaining": 34,        // slots left this month. See rule below.
    "resetsAt": "2026-09-01T00:00:00.000Z"
  }
}
```

`usage.remaining` rule (honors the product's "never print the Pro cap" invariant
in `TIER_CONFIG`): a number for `business` and `free`; `null` for `pro` and for
anonymous. `tier` and `resetsAt` are always present.

The `report` shape is **not redefined here** — it is exactly what
`verifyContent()` already returns and what the website renders. Reuse the
existing `VerificationReport` type from `@/types/verification`. Do not fork it.

### Error responses

Every error is `{ "success": false, "error": "<human message>", "code": "<CODE>" }`
with an HTTP status. Codes are stable — the extension and SDK switch on them.

| HTTP | code | Meaning |
|------|------|---------|
| 400 | `INPUT_INVALID` | Bad/missing body, text too short, bad URL |
| 401 | `AUTH_INVALID` | Bearer token present but invalid/expired/revoked |
| 403 | `USAGE_LIMIT` | Monthly (or anonymous) cap reached |
| 403 | `FORBIDDEN` | Valid key, but scope/tier not allowed here |
| 422 | `URL_UNREADABLE` | URL given but article could not be fetched |
| 429 | `RATE_LIMIT` | Too many requests (per-IP or per-key throttle) |
| 500 | `SERVER_ERROR` | Internal failure |
| 502 | `ALL_LAYERS_FAILED` | Verification sources unreachable |

Anonymous `USAGE_LIMIT` message names the number ("3 free checks"); Pro/Business
`USAGE_LIMIT` message is number-free (existing product rule — the Pro cap is
never printed).

---

## 2. Authentication — one header, three modes

```
Authorization: Bearer <token>
```

The server resolves the token in this order. **All three converge on the same
`verifyContent()` call**; they differ only in how the caller is identified and
how the usage slot is metered.

### Mode A — Supabase session JWT (extension: logged-in Pro/Business)

The extension logs the user in against the website, obtains the Supabase
**access token**, and sends it as the Bearer token. The token is a normal
Supabase JWT.

- Resolve with a new helper `createClientFromToken(accessToken)` — a Supabase
  server client whose `global.headers.Authorization` is set to the Bearer token
  (instead of reading cookies). `supabase.auth.getUser()` then returns the user.
- Metering: **unchanged.** Call the existing `reserve_usage_slot()` RPC — its
  `auth.uid()` reads this same JWT, so the atomic monthly cap works exactly as
  on the website. No new RPC, no `p_user_id`.
- This is the ONLY path that touches `reserve_usage_slot()`. Do not add a
  `p_user_id` argument to it — that reopens the tampering hole migration 002
  closed.

### Mode B — Verifact API key (business programmatic)

Format: `vf_live_<32+ url-safe base62 chars>`. The full key is shown to the user
**exactly once** at creation and never stored in plaintext.

- Storage: `api_keys` table stores only `sha256(key)`, plus a short `key_prefix`
  (e.g. `vf_live_a1b2…`) for display/lookup. Never store the raw key.
- Resolve: `authenticateApiKey(rawKey)` → look up by hash → returns `{ userId,
  tier, scopes }` or `null`. Reject revoked (`revoked_at` set) keys with
  `AUTH_INVALID`.
- Tier gate: only `business` tier may create/use keys. A key belonging to a
  downgraded account returns `FORBIDDEN`.
- Metering: the key is **not** a JWT, so `auth.uid()` is null and
  `reserve_usage_slot()` cannot be used. Use a **new** RPC:

  ```
  reserve_usage_slot_for(p_user_id uuid) RETURNS ...   -- SECURITY DEFINER
  GRANT EXECUTE ... TO service_role;   -- NEVER to anon or authenticated
  ```

  It is the same check-and-increment logic as `reserve_usage_slot()` but takes
  the user id explicitly. It is safe *only* because it is callable solely with
  the service-role key from trusted server code after the key has been
  authenticated — it must never be reachable by a client JWT. Call it through a
  service-role Supabase client (`createAdminClient()`), not the request-scoped one.

  Migration 018 must also ship the matching rollback RPC
  `release_usage_slot_for(p_user_id uuid)` (SECURITY DEFINER, service_role only),
  the `p_user_id` twin of `release_usage_slot()`. The v1 route needs it to
  refund a slot on a cache hit / failed save, exactly as the website's stream
  path calls `release_usage_slot()`.
- Update `last_used_at` on each successful auth (best-effort, non-blocking).

### Mode C — no token (extension: anonymous, and public calls)

- No `Authorization` header → anonymous path.
- Metering: existing `checkAnonymousLimit(ip, userAgent)` — 3 per 30 days by
  IP+UA hash. Unchanged.
- `usage.remaining` in the response may be `null` for anonymous.

### Precedence & failure rules

- If a Bearer token is present but resolves to nothing (bad JWT AND not a valid
  key), return `401 AUTH_INVALID`. Do **not** silently fall back to anonymous —
  a client that thinks it is authenticated must be told its token is bad.
- No header at all → anonymous. That is the only anonymous trigger.

---

## 3. CORS (extension only)

`/api/v1/*` must answer cross-origin calls from the extension.

- Handle `OPTIONS` preflight → `204` with:
  - `Access-Control-Allow-Origin`: the extension origin (`chrome-extension://<id>`).
    Keep an allowlist; do not reflect arbitrary origins.
  - `Access-Control-Allow-Headers: Authorization, Content-Type`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
- The website's own same-origin calls are unaffected.
- The existing `/api/verify` stream endpoint is **not** made CORS-open; the
  extension uses `/api/v1/verify` only.

---

## 4. Track boundaries (who owns which files — no overlaps)

**Track A — Bearer auth foundation** (owner: Gemini; reviewer: lead)
- `supabase/migrations/018_api_keys.sql` — `api_keys` table + RLS +
  `reserve_usage_slot_for(p_user_id)` RPC (SECURITY DEFINER, service_role only).
- `src/lib/auth/api-keys.ts` — generate / hash / `authenticateApiKey`.
- `src/lib/supabase/from-token.ts` — `createClientFromToken(accessToken)`.
- `src/app/cont/api/*` — dashboard UI: create key (show once), list, revoke.
- Owns nothing under `src/app/api/v1/` — that is the lead's glue.

**Track B — v1 endpoint** (owner: lead)
- `src/app/api/v1/verify/route.ts` — parse, resolve token (A's helpers),
  meter (A's RPCs), call `verifyContent`, single-JSON response, CORS.
- Depends on A's exported helpers; until they exist, code against their
  documented signatures above.

**Track C — Chrome extension** (owner: Hy3)
- New top-level folder `extension/` — MV3 manifest, service worker, content
  script, popup. Zero files inside `src/`.
- Calls `POST /api/v1/verify`. Anonymous by default; a "Login" action opens the
  website, retrieves the Supabase access token, stores it, and sends it as
  Bearer (Mode A). Mirrors the website's tier limits — no separate quota logic.
- Build against mocked responses matching Section 1 until B ships.

**Merge order:** A → B → C. C is verified end-to-end against the real endpoint
last.

---

## 5. Non-negotiables (the lead will reject a diff that breaks these)

1. Raw API keys are never logged, never stored, never returned after creation.
2. `reserve_usage_slot()` keeps its zero-argument, `auth.uid()`-only signature.
3. `reserve_usage_slot_for(p_user_id)` is granted to `service_role` only.
4. A present-but-invalid Bearer token is a `401`, never an anonymous fallback.
5. CORS uses an allowlist, never `Access-Control-Allow-Origin: *` with
   `Authorization`.
6. The `report` object is the existing `VerificationReport` — not a new shape.
