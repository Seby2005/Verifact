# Verifact

**AI-powered fact-checking for news and social media content — open source, transparent, and free for everyday use.**

[![CI Status](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is Verifact?

Misinformation spreads faster than the corrections that follow it. Verifact gives anyone — a curious reader, a journalist, a researcher — a fast, transparent way to check whether a claim, article, or social media post holds up, without needing to manually chase down sources.

You give it a screenshot, a piece of text, or a URL. It gives you back a verdict, a truthfulness score, and — critically — the actual sources it used to get there, so you can verify the verifier instead of just trusting a black box.

**Core principles the project is built around:**

- **Transparency.** The code is open source and the verification algorithm is documented, not hidden behind a proprietary API.
- **Neutrality.** Verifact checks facts, not opinions, and is designed to avoid taking editorial or political positions.
- **Accessibility.** Free for personal use, with paid tiers only for high-volume use (newsrooms, researchers, organizations).
- **Accountability.** Every report cites its sources — no verdict is delivered without evidence attached.
- **Privacy.** Uploaded screenshots are processed for text extraction and not stored permanently.

The project's initial focus is the Romanian information space (news, social media, and public discourse in Romanian), with English supported as a second language.

---

## How verification works

A submission goes through four independent research layers, run in parallel, followed by an AI synthesis step:

1. **Existing fact-checks** — searches Google Fact Check Tools (aggregating outlets like Snopes, PolitiFact, AFP Fact Check) for prior human fact-checks of the same or a similar claim.
2. **Mainstream news coverage** — searches accredited news sources (Romanian and international) to see whether and how the claim was reported.
3. **Official sources** — checks government and institutional sources (`.gov.ro`, `.europa.eu`, WHO, UN) for claims involving public policy, statistics, or official statements.
4. **Social media** — verifies whether a quote or claim attributed to a public figure or institution actually originates from their verified accounts.

Each layer has a timeout and can fail independently without blocking the others — if a source is unavailable, the report says so rather than pretending it wasn't checked. Once the layers return, results are combined into a weighted truthfulness score (0–100%) and handed to an AI model (Gemini) that writes a plain-language summary, **explicitly instructed not to invent sources, not to take editorial positions, and to say clearly when the evidence is insufficient.**

The score bands: 85–100% *Likely True*, 60–84% *Partially True / Missing Context*, 40–59% *Unclear / Insufficient Evidence*, 0–39% *Likely False*.

---

## Features

- **Three ways to submit a claim:** screenshot upload (with OCR via Google Cloud Vision), pasted text, or a URL.
- **Four-layer verification pipeline** described above, run through an orchestrator with per-layer timeouts and graceful degradation.
- **AI-generated report** (Gemini) with a cited, source-backed summary — not a bare percentage.
- **Accounts and usage tiers:** email/password and OAuth sign-in via Supabase Auth, with Free (10 checks/month), Pro (200/month), and Business (2,000/month) tiers.
- **Public report feed** — verifications marked public are searchable and filterable by language, verdict, and date, so the same claim isn't re-checked from scratch by everyone who encounters it.
- **Transparency page** — a plain-language explanation of the algorithm, the data sources used, and the project's known limitations.
- **SEO-ready report pages** — server-rendered, with `ClaimReview` JSON-LD schema and dynamically generated Open Graph images, so reports are indexable and shareable.
- **GDPR tooling** — users can export their data and request account deletion, which anonymizes public verifications rather than silently orphaning them.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript (strict mode), CSS Modules |
| Backend | Next.js API Routes (serverless) |
| Database & Auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| AI | Gemini API |
| OCR | Google Cloud Vision API |
| Research sources | Google Fact Check Tools API, Google Custom Search API, NewsAPI |
| Testing | Jest (unit), Playwright (E2E) |
| CI/CD | GitHub Actions, Vercel |

No UI framework beyond CSS Modules — this is a deliberate choice to keep the design system dependency-free and fully under the project's control.

---

## Getting started

### Prerequisites

- Node.js 20+ and npm 10+
- A free [Supabase](https://supabase.com) project
- API keys: Google Cloud Vision, Google Fact Check Tools, Google Custom Search, Gemini (see `.env.example` for the full list)

### Setup

```bash
git clone https://github.com/Seby2005/Verifact.git
cd Verifact
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Running against a local Supabase instance

Recommended for development so you're not depending on a hosted project:

```bash
npm install -g supabase
supabase start          # spins up Postgres, Auth, Storage, Studio locally
supabase db reset       # applies migrations in supabase/migrations/ + seed data
supabase stop           # when you're done
```

`supabase start` downloads Docker images on first run (~2 GB) — make sure Docker is installed and running. If you change the schema, regenerate types with:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

### Testing

```bash
npm run type-check   # TypeScript
npm run lint          # ESLint
npm test              # Jest unit tests
npm run test:e2e      # Playwright end-to-end tests
npm run build          # production build
```

---

## Project status

This is an actively developed, pre-launch project. The core product — submission, the four-layer verification pipeline, AI report generation, accounts, tiers, and the public report feed — is implemented and passes its automated checks locally. It has **not yet been deployed publicly**; there is no live demo at this time. If you're evaluating the code, `npm run build` from a clean checkout (with your own `.env.local`) is the most reliable way to see current state — treat any status claims in older commits or docs as unverified until you've confirmed them yourself.

---

## Disclaimer

Verifact's reports are AI-assisted and are not a substitute for editorial judgment. Every report links to the sources it relied on — when in doubt, follow the citations rather than the verdict alone.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose changes or report issues.

## License

[MIT](./LICENSE)
