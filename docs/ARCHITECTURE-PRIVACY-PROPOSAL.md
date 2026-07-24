# Proposal: separating the verification engine from the public repo

**Status: proposal only. Nothing has been implemented. This is an
architectural change and needs your explicit go-ahead before any code moves.**

---

## The question

Can someone clone this public repo and stand up a working, identical Verifact?

## What is true today

Two things often get conflated. They have different answers.

**Is the algorithm exposed to the browser? No.** Everything under
`src/lib/verification/` is imported by exactly one file — the server route
`src/app/api/verify/route.ts`. Verified against the compiled bundle: none of
`RATING_MAP`, `SOURCE_CREDIBILITY`, `ROMANIAN_PUBLIC_FIGURES`, `layerScore`,
`buildAnalysisPrompt`, the layer weights, or the upstream API hosts appear
anywhere in `.next/static`. A visitor sees only the finished report. The
runtime boundary is already correct, and no change is needed for that.

**Is the algorithm readable in the repo? Yes, completely.** The repo is public,
so the scoring weights, the rating normalisation table, the source-credibility
list, the stance keywords and the Gemini prompt are all there to read — by
design, and consistent with the "Transparență Radicală" positioning on the
landing page.

**Can a cloner run it? Not usefully.** They would get the UI and the logic, but
they would still need their own Supabase project and schema, their own Google
Fact Check / Custom Search / Gemini / Tavily / NewsAPI keys — the paid,
rate-limited part — and they would have none of your accumulated verification
cache. What they would *not* have is anything you are currently keeping secret,
because there is nothing in the repo that is secret.

So today the honest summary is: **the moat is the infrastructure and the data,
not the code.** That may be entirely fine.

---

## What is actually worth protecting

Before moving anything, it is worth being precise about what the "secret sauce"
is, because right now most of the code is not it:

| Asset | Currently | Genuinely differentiating? |
|---|---|---|
| Layer weights (0.35 / 0.30 / 0.25 / 0.10) | public | Barely — it is a weighted average; anyone can guess |
| Rating normalisation table | public | Low — mostly maps public fact-checker vocabularies |
| Source credibility scores per domain | public | **Moderate** — this is a curated editorial judgement and is genuinely yours |
| Stance/sentiment keyword lists | public | Low today — they are keyword lists, and weak ones (see `docs/VERIFICATION-AUDIT.md`) |
| Gemini prompt | public | **Moderate** — prompts are where a lot of tuning lives |
| Verification cache / accumulated reports | private (your DB) | **High** |
| API keys and quota | private | **High** |

The two "moderate" rows are the only parts where hiding buys you much, and both
sit awkwardly against the transparency promise the product makes to users.

---

## If you decide to separate it anyway

A workable shape, in order:

1. **Extract a private service.** New private repository, e.g.
   `verifact-engine`. Move `src/lib/verification/**` and `src/lib/ai/**` into
   it. Deploy it as its own service (Fly.io, Railway, Cloud Run — anywhere the
   public app can reach it).

2. **Give it one endpoint.**
   `POST /verify` taking `{ inputText, inputType, language }` and returning the
   existing `VerificationReport` shape. Keeping the response type identical
   means the UI, the report page and the types package do not change.

3. **Authenticate machine-to-machine.** A shared secret in a header, or mTLS.
   The key lives only in the public app's server environment
   (`VERIFICATION_ENGINE_URL`, `VERIFICATION_ENGINE_TOKEN`) — never in
   `NEXT_PUBLIC_*`.

4. **Reduce the public route to a proxy.** `src/app/api/verify/route.ts` keeps
   input validation, rate limiting, auth and usage limits — all of which are
   about *your* users and belong in the public app — and forwards the validated
   claim to the engine.

5. **Publish the contract, not the implementation.** Keep the request/response
   types and a plain-language description of the four layers in the public
   repo, so `/transparency` stays honest and the project is still auditable at
   the interface level.

6. **Handle engine downtime.** The public app must degrade rather than 500 —
   the same lesson as the Gemini outage in `docs/VERIFICATION-AUDIT.md`.

### What it costs

- A network hop on every verification, plus a second service to deploy,
  monitor, secure and pay for.
- Local development gets harder: contributors either need engine access or a
  stub, so "clone and run" stops working. That is a real hit to contribution.
- The transparency claim weakens. *"Algoritmul de fact-checking, sursele
  interogate și formulele de scoring sunt publice"* on the landing page and the
  whole `/transparency` page would need rewriting — and for a product whose
  pitch is trust, that is a genuine cost, not a formality.
- It does not stop a competitor from writing their own four-layer scorer. It
  only stops them from copying yours verbatim.

---

## Recommendation

**Do not split it yet.** The runtime boundary is already correct, no secrets
leak, and the current moat — keys, quota, cache, and the curated source list —
is not improved much by hiding a weighted average. The split trades away the
transparency the product is explicitly built on, for protection of assets that
are mostly not that valuable.

Two cheaper steps get most of the benefit:

1. Move the **source-credibility list** and the **Gemini prompt** to
   server-side configuration loaded from environment or a private config store,
   rather than committed constants. That protects the two genuinely curated
   assets without splitting the codebase.
2. Revisit the licence (`docs/LICENSE-OPTIONS.md`) if the real concern is
   someone hosting a commercial copy — that is a licensing problem, not an
   architecture one.

Revisit the full split if and when the engine becomes materially more
sophisticated than "weighted average over four public APIs" — at that point
there will be something worth protecting.
