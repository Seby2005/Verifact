# Verification algorithm — audit notes

Date: 2026-07-25. Branch: `fix/hydration-verifyform`.

End-to-end audit of the verification pipeline (the core of the product), run
against the real dev server and the real external APIs with the keys in
`.env.local`.

Ten inputs were exercised through `POST /api/verify`, including the edge cases:
empty input, 9 characters, exactly 10, exactly 2000, 2001, a ~1990-character
claim, Japanese text, emoji/punctuation only, and a URL-type submission.

---

## Summary

The pipeline no longer crashes and every input now returns a well-formed
report. **But the algorithm currently produces the same answer for every
input**: `verdict: "unclear"`, `score: 50` (±3), `confidence: "medium"` — for a
plainly true claim, for known disinformation, and for a string of emoji alike.

That is not a plumbing problem. It is caused by three of the four evidence
layers producing no usable signal, which is documented per-layer below.

---

## A. Fixed in this branch

### A1. The verify flow was broken end-to-end (critical)

The browser posts `{ inputType, inputText, inputUrl, language, isPublic }` —
which matches the declared `VerifyRequest` type — but the route validated
`body.text`. Every submission from the home page returned:

```
HTTP 400 {"success":false,"error":"Textul trebuie sa aiba minim 10 caractere","code":"INPUT_INVALID"}
```

Reproduced with the exact client payload. The route now reads `inputText` and
keeps `text` as an accepted alias.

### A2. The response shape did not match what the client reads (critical)

The route returned `{ success, report }`; `VerifySection` reads `data.reportId`
(as declared by `VerifyAPIResponse`) and throws
*"Raspunsul de la server nu contine un ID de raport valid"* when it is missing.
So even a successful verification failed in the UI. The route now returns
`{ success, reportId, verdict, score, report }`.

### A3. An AI outage discarded all four layers of work (critical)

`generateAIAnalysis()` was awaited unguarded in the orchestrator. The Gemini key
in `.env.local` currently has a **zero free-tier quota**, so every call returns
429 and the whole request became a 500:

```
[429 Too Many Requests] You exceeded your current quota
* Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash
```

The veracity score is computed from the four layers *before* the model is
called, so an AI outage should degrade the narrative, not the verdict. The
orchestrator now falls back to a deterministic, source-derived summary that
states plainly that the AI analysis was unavailable. Degraded reports are
**not** written to the 7-day cache, so a brief outage cannot be served for a
week.

### A4. No verification was ever persisted (critical)

`saveVerification()` inserted a `processing_time` column; the schema
(`0002_verifications.sql`) defines `processing_time_ms`. Every insert failed:

```
[DB] Failed to save verification: Could not find the 'processing_time' column of 'verifications' in the schema cache
```

The error was only `console.error`-ed, so `/api/verify` still answered 200 with
a report id that did not exist in the database. Two related defects in the same
insert: `language` could be `'unknown'`, which the table's CHECK constraint
rejects, and `status` was left at its `'pending'` default even for a finished
verification. All three are fixed; rows now persist with
`status: 'completed'` and a populated `processing_time_ms`.

### A5. Three of the strongest "this is false" keywords never matched

`CONTRADICTION_KEYWORDS_RO` contained `dezminţit`, `dezminţire`, `dezminţeşte`
written with **legacy cedilla** characters (ţ U+0163, ş U+015F). Romanian text
is written with **comma-below** characters (ț U+021B, ș U+0219), so
`'dezminţit'.includes` never fired on `dezmințit`. Matching now normalises
diacritics on both sides (`src/lib/verification/text-match.ts`), so modern,
legacy and diacritic-free spellings all match.

### A6. Layer timeout timers were never cleared

`withTimeout()` left a 10-second timer pending per layer even when the layer
resolved in milliseconds — four dangling timers per request, which keeps a
serverless invocation alive for the full timeout. Now cleared in a `finally`.

---

## B. Found and NOT fixed — these need your decision

### B1. Layer 3 (official sources, 25% of the weight) is permanently dead

```
GET https://www.googleapis.com/customsearch/v1 -> 403
"Requests to this API customsearch method ... are blocked."
```

Two separate problems:

1. `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID` in `.env.local` contains a value starting
   with `AIzaSy…` (39 chars). That is the shape of a **Google API key**, not a
   Programmable Search Engine id (`cx`), which is a short alphanumeric token.
2. The Custom Search API itself is blocked for this project/key.

Effect: layer 3 always returns `status: 'unavailable'`, its 25% weight is
redistributed to the other layers, and every report is missing the most
authoritative category of source (gov.ro, europa.eu, who.int).

### B2. Layer 1 (fact-check databases, 35% of the weight) finds nothing in Romanian

Google Fact Check Tools responds 200 but with zero claims for Romanian:

| query | lang | claims |
|---|---|---|
| full RO sentence (what the app sends) | ro | **0** |
| `vaccin 5G` | ro | **0** |
| `5G coronavirus` | en | 10 |
| full EN sentence (what the app sends) | en | 2 |
| `covid vaccine microchip` | en | 10 |

Two findings: Google's Romanian fact-check corpus is effectively empty, and the
app sends the **entire claim sentence** as the query, which even in English
returns far fewer results than a keyword query (2 vs 10).

The existing English fallback (`if primaryResults.length < 3 && language === 'ro'`)
re-queries with the *Romanian* text against the English corpus, so it finds
nothing either.

Worth considering: extracting keywords instead of sending whole sentences, and
translating the claim before the English fallback.

### B3. Layer 2 (news, 30% of the weight) mathematically cannot move the score

`calculateLayer2Score` returns **exactly 0.5** whenever every article is
classified `neutral`, no matter how many articles were found. The stance
detector is a keyword scan, and:

- confirmation keywords include `real`, `oficial`, `corect`, `official`, `true`
  — everyday words in news copy;
- any article containing *both* a confirmation and a contradiction keyword
  collapses to `neutral`.

A textbook debunk — *"Guvernul a dezmințit… Informația este falsă, potrivit
unui comunicat **oficial**"* — is classified `neutral` for exactly this reason.
There is a test pinning this behaviour
(`tests/unit/sentiment-matching.test.ts`) so any future change is visible.

Also: **NewsAPI returns 0 articles for Romanian queries** (`status: "ok"`,
`articles: 0`), so layer 2 currently runs on Tavily alone.

### B4. Layer 4 (social, 10%) is skipped for almost everything

`extractNamedEntities` matches against a hardcoded list of **17** Romanian
public figures. Any claim not naming one of them returns `status: 'skipped'`.
`TWITTER_BEARER_TOKEN` is also empty, so even when it does run it falls back to
a Tavily search restricted to social domains.

### B5. Confidence is reported as if a skipped layer were evidence

`scoreToConfidence()` is fed `availableLayers`, which counts layer 4 as
available when it was **skipped**. A report backed by three layers can be
labelled `high` confidence. Whether "not applicable" should count as evidence is
a product decision, so it is left as is — but note the current output says
`confidence: medium` while citing 6–12 sources that contributed no
discriminating signal at all, which reads as more certainty than the system
actually has.

### B6. The report page 404s because of an RLS recursion in the migrations

`profiles_select_own` in `0009_rls_policies.sql` selects from `public.profiles`
inside its own SELECT policy:

```sql
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

Postgres rejects this with `42P17 infinite recursion detected in policy for
relation "profiles"`. `verifications_select` also sub-selects from `profiles`,
so **every anonymous read of `verifications` fails**, and `/api/reports/{id}`
turns the error into `404 Report not found`. The rows are written correctly —
verified with the service-role key — they simply cannot be read back.

Consequence for the user: after a successful verification the progress tracker
polls `/api/reports/{id}` for 45 seconds and then shows *"Verificarea a depășit
timpul maxim permis"*. Fixed separately on the database branch
(`fix/db-signup`), since it is a migration change.

### B7. The client aborts before the server can finish

`VerifySection` aborts the `/api/verify` request after **10 s**. The server
budget is 10 s *per layer* plus the Gemini call, and `ProgressTracker` allows
45 s. A verification that takes longer than 10 s surfaces as *"Conexiunea cu
serverul a expirat (10s)"* even though it succeeded server-side. Observed
timings were 0.7–2.5 s with the AI unavailable, so this is currently masked.

### B8. Smaller items

- `tests/e2e/verify-text.spec.ts` targets `[data-testid="tab-text"]` and
  `[data-testid="verify-button"]`; neither attribute exists in `VerifyForm`, so
  the Playwright specs cannot pass as written.
- `ReportBuilderParams.aiAnalysis` allows `{ summary, scoreAdjustment }` but
  `generateAIAnalysis` returns a plain string and `scoreAdjustment` is never
  applied anywhere — dead contract.
- `saveVerification` always writes `input_url: null`, even for `inputType: 'url'`.
- `middleware.ts` exists twice, byte-identical, at the repo root and at
  `src/middleware.ts`.
- `VerifyForm/index.tsx` reads `styles.formContainer`, `styles.tabList`,
  `styles.tabButton`; `VerifyForm.module.css` defines `.container`, `.tabsList`,
  `.tabButton`. The mismatched names render as `class="undefined undefined"`.
  Left untouched — styling belongs to the design branch.

---

## C. Test coverage added

| File | Covers |
|---|---|
| `tests/unit/verifyform-ssr.test.tsx` | the hydration regression: form present in server markup, no render-time `useSearchParams()` |
| `tests/unit/verify-api-contract.test.ts` | request/response contract, all input boundaries (empty, 9, 10, 2000, 2001), language/type fallbacks, malformed JSON, error codes, rate limit |
| `tests/unit/orchestrator-resilience.test.ts` | AI outage degradation, score stability with/without AI, no caching of degraded reports, partial and total layer failure, cache hit path, report shape and source ordering |
| `tests/unit/sentiment-matching.test.ts` | diacritic-insensitive keyword matching, stance detection, layer 2 scoring, plus the two documented weaknesses (B3) |

`npm test` — 50 new tests across these four files; 160 passing in the full
suite (was 110).

---

## D. Reproduction

```bash
npm run dev
curl -s -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"inputType":"text","inputText":"Romania a aderat la Uniunea Europeana in anul 2007.","language":"ro","isPublic":true}'
```
