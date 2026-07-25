# Verifact

**Paste a claim. Get a verdict, a confidence score, and the sources it came from.**

Verifact is an open-source fact-checking tool for news and social media, built
first for the Romanian information space. It is not a black box that tells you
what to believe — every report shows its work.

[![CI Status](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The problem

A false claim travels through a group chat in minutes. Checking it takes half
an hour of searching, and by then it has already been forwarded on. The
asymmetry is the whole problem: producing misinformation is cheap, refuting it
is expensive.

Verifact tries to close that gap. You hand it a screenshot, a paragraph, or a
link. It searches the same places a careful person would — existing
fact-checks, news coverage, official institutional sources, and the original
social media accounts — and returns a verdict with the evidence attached.

**The evidence is the point.** A score you cannot audit is just another thing
to take on faith. Every Verifact report links the sources it used, names the
ones it could not reach, and says plainly when the evidence is insufficient
rather than guessing.

Read more about why this project exists: [Mission](/mission).

---

## How verification works

A submission runs through four independent research layers **in parallel**,
then through a synthesis step.

| # | Layer | What it looks for | Weight |
|---|---|---|---|
| 1 | Existing fact-checks | Prior human fact-checks of the same or a similar claim, via Google Fact Check Tools (Snopes, PolitiFact, AFP Fact Check, …) | 35% |
| 2 | News coverage | Whether and how accredited outlets reported it, weighted by source credibility | 30% |
| 3 | Official sources | Government and institutional publications (`.gov.ro`, `.europa.eu`, WHO, UN) for policy, statistics and official statements | 25% |
| 4 | Social media | Whether a quote attributed to a public figure actually came from their account | 10% |

Each layer has its own timeout and **fails independently**. If a source is
unreachable, its weight is redistributed across the layers that did respond,
and the report states that the layer was unavailable rather than quietly
pretending it was checked.

The layer scores are combined into a weighted score from 0 to 100, which maps
to a verdict:

| Score | Verdict |
|---|---|
| 85–100 | Likely true |
| 60–84 | Partially true / missing context |
| 40–59 | Unclear — insufficient evidence |
| 0–39 | Likely false |

Confidence is reported separately from the score, based on how many layers
actually returned data. **The score is computed before any AI is involved.** An
AI model (Gemini) then writes the plain-language summary, instructed not to
invent sources, not to take editorial positions, and to state when evidence is
thin. If the model is unavailable, the report is still produced from the
sources — the narrative degrades, the verdict does not.

The full scoring logic lives in [`src/lib/verification/`](./src/lib/verification)
and is deliberately readable. There is also a
[`/transparency`](./src/app/transparency) page in the app explaining it to
non-technical users.

---

## Features

- **Three ways to submit** — screenshot upload (OCR via Google Cloud Vision), pasted text, or a URL.
- **Cited reports** — every verdict carries its sources, deduplicated and ordered official → fact-check → news → social.
- **Accounts and tiers** — Supabase Auth (email/password and OAuth); Free 10 checks/month, Pro 200, Business 2,000.
- **Public report feed** — reports marked public are searchable, so the same claim is not re-checked from scratch by everyone who meets it.
- **Shareable, indexable reports** — server-rendered pages with `ClaimReview` JSON-LD and generated Open Graph images.
- **GDPR tooling** — data export and account deletion, which anonymises public reports instead of orphaning them.
- **Bilingual** — Romanian and English.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript strict, CSS Modules |
| Backend | Next.js Route Handlers |
| Database & auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| AI | Gemini |
| OCR | Google Cloud Vision |
| Research sources | Google Fact Check Tools, Google Custom Search, Tavily, NewsAPI, Twitter/X (optional) |
| Testing | Jest (unit), Playwright (E2E) |
| CI/CD | GitHub Actions, Vercel |

No component library — the design system is hand-built on CSS Modules, on
purpose, to keep it dependency-free and fully under the project's control.

---

## Running it locally

### Prerequisites

- **Node.js 22+** and npm 10+ (`@supabase/supabase-js` requires Node 22)
- A free [Supabase](https://supabase.com) project, or the Supabase CLI for a local stack
- API keys for the research layers — see the table below

### Setup

```bash
git clone https://github.com/Seby2005/Verifact.git
cd Verifact
npm install
cp .env.example .env.local
npm run dev
```

Then fill in `.env.local` and restart. The app runs at http://localhost:3000.

### Environment variables

Copy `.env.example` and fill it in. **Never commit `.env.local`** — it is
gitignored, and it should stay that way.

| Variable | Required | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL. Also used to build the CSP `connect-src`, so **restart the dev server after changing it**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public, RLS-scoped key. Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Bypasses all Row Level Security.** Server-side only — never expose it to the browser. |
| `GEMINI_API_KEY` | yes | Report summaries. Without it the app still returns verdicts, with a source-derived summary. |
| `GOOGLE_FACT_CHECK_API_KEY` | yes | Layer 1. |
| `TAVILY_API_KEY` | yes | Layer 2 news search and the layer 4 fallback. Free tier: 1,000 credits/month. |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | yes | Layer 3. |
| `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID` | yes | Layer 3 **search engine id (`cx`)** — a short token from Programmable Search Engine, *not* an API key. Easy to mix up; layer 3 fails silently if you do. |
| `GOOGLE_CLOUD_API_KEY` | yes | Cloud Vision OCR for screenshots. |
| `NEWS_API_KEY` | no | Additional layer 2 source. Romanian coverage is sparse. |
| `TWITTER_BEARER_TOKEN` | no | Layer 4. Falls back to Tavily when unset. |
| `NEXT_PUBLIC_APP_URL` | yes | Canonical URL, used for OG images and auth redirects. |

### Local Supabase (recommended)

Avoids depending on a hosted project while developing:

```bash
npm install -g supabase
supabase start        # Postgres, Auth, Storage, Studio — needs Docker (~2 GB on first run)
supabase db reset     # applies supabase/migrations/ and seed data
supabase stop
```

Point `NEXT_PUBLIC_SUPABASE_URL` at the local URL `supabase start` prints, and
restart `npm run dev`. After a schema change, regenerate types:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

### Checks

```bash
npm run type-check   # TypeScript
npm run lint         # ESLint
npm test             # Jest unit tests
npm run test:e2e     # Playwright
npm run build        # production build
```

---

## Project structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # login, register, password reset, email confirm
│   ├── (dashboard)/          # dashboard, settings — auth-gated
│   ├── api/                  # route handlers
│   │   ├── verify/           # the main verification endpoint
│   │   ├── ocr/              # screenshot → text
│   │   ├── reports/          # public report read/update
│   │   └── user/             # profile, usage, history
│   ├── reports/[id]/         # public report page + OG image
│   ├── transparency/         # how the algorithm works, for readers
│   └── pricing/
├── components/
│   ├── ui/                   # design-system primitives (Button, Input, Modal…)
│   ├── verify/               # VerifyForm, ScreenshotUpload, ProgressTracker
│   ├── report/               # verdict header, score breakdown, source list
│   ├── home/  layout/  dashboard/  auth/
├── lib/
│   ├── verification/         # ← the algorithm
│   │   ├── orchestrator.ts   # runs the layers, aggregates, builds the report
│   │   ├── layer1-factcheck.ts … layer4-social.ts
│   │   ├── scoring.ts        # weights, score → verdict, confidence
│   │   ├── report-builder.ts # assembles and deduplicates sources
│   │   └── cache.ts          # 7-day result cache
│   ├── ai/                   # Gemini client and prompts
│   ├── ocr/  supabase/  auth/  usage/  seo/  utils/
│   ├── i18n/  context/  hooks/  types/
supabase/migrations/          # SQL schema, RLS policies
tests/unit/  tests/e2e/
docs/                         # architecture, PRD, audits, troubleshooting
```

Start with `src/lib/verification/orchestrator.ts` — it is the shortest path to
understanding what the product actually does.

---

## Project status

Actively developed, pre-launch. The core product is implemented: submission,
the four-layer pipeline, report generation, accounts, tiers and the public
feed. **It is not deployed publicly and there is no live demo.**

Being straight about the current state: there are known issues that affect
verification quality, and they are written up rather than hidden.
`docs/VERIFICATION-AUDIT.md` is an end-to-end audit of the algorithm —
including which layers currently return no usable signal, and why — and
`docs/TROUBLESHOOTING.md` covers setup problems worth knowing before you file a
bug. If you are evaluating the project, read the audit first.

> Those two files land with the `fix/hydration-verifyform` and `fix/db-signup`
> branches; they are not on this branch yet.

---

## Contributing

Contributions are welcome, and the audit documents mentioned above are a good
source of real, well-scoped work.

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, commit style and the PR template.
2. Open an issue before starting anything substantial, so effort is not duplicated.
3. Branch from `dev`, not `main`.
4. Make sure `npm run type-check`, `npm run lint`, `npm test` and `npm run build` all pass.
5. Open a PR against `dev` describing what you changed and how you verified it.

Especially welcome: improvements to stance detection and claim-keyword
extraction (see the audit), Romanian-language test fixtures, accessibility
fixes, and additions to the credible-source and official-domain lists.

Found a security issue? Do not open a public issue — report it privately through
GitHub Security Advisories on this repository (`SECURITY.md` has the details).

---

## Disclaimer

Verifact's reports are AI-assisted and are not a substitute for editorial
judgment. When in doubt, follow the citations rather than the verdict.

## License

[MIT](./LICENSE)
