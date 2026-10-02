# Verifact

An open-source web application designed to help people unpack online claims, cross-reference sources, and exercise critical thinking in an era of information overload.

[![CI](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)

---

## Why Verifact Exists

Misinformation rarely spreads because people are gullible. It spreads because the modern social web is engineered around velocity and emotional intensity, while careful verification is tedious and time-consuming. In the few seconds between seeing an alarming headline and tapping "Share", most people simply don't have the time to search academic papers, consult public records, or read through conflicting journalistic reports.

**Verifact is not a "ministry of truth" and does not claim to be an infallible oracle.** We believe that no single algorithm or institution should hand down definitive verdicts from on high.

Instead, Verifact acts as a structured research assistant:
1. You provide a claim — whether pasted as text, linked via a web URL, or uploaded as a screenshot.
2. The system pulls relevant coverage from independent fact-checkers, news organizations, public institutional databases, and academic literature.
3. An AI model synthesizes what is currently known, highlights areas of consensus or contradiction, and links directly to the primary sources so you can evaluate the evidence yourself.

The goal is simple: make primary evidence easy to reach, so anyone can think for themselves.

---

## What It Actually Does

```
  User Input (Text / URL / Screenshot / Audio Clip)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
  Image OCR                     In-Browser Whisper
(Google Cloud Vision)         (Transformers.js / WASM)
       │                               │
       └───────────────┬───────────────┘
                       ▼
             Claim Pre-Processing
       (De-noise, normalize interrogatives)
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
  Fact-Check      News & Web     Institutional     Academic /
  Registries        Search          Records        Scientific
 (Google Fact    (Tavily / News)  (Google CSE)   (Europe PMC,
    Check)                                       OpenAlex, etc.)
       └───────────────┬───────────────┴───────────────┘
                       ▼
              Evidence Aggregator
                       │
                       ▼
             Contextual Synthesis
           (Gemini 2.5 Flash via LLM)
                       │
                       ▼
        Transparent Report with Citations
```

### 1. Ingestion & Pre-Processing
- **Text & URLs**: Evaluates plain text statements or extracts the core narrative from shared web articles.
- **Screenshots**: Passes user-uploaded images through Google Cloud Vision API (with OCR.space fallback) to extract on-image text and metadata without storing images permanently.
- **Short Video/Audio Clips**: Transcribes spoken claims directly inside the user's browser using `@huggingface/transformers` and an int8-quantized Whisper model running via WebAssembly (`onnxruntime-web`). The audio never leaves the client device, keeping processing private and avoiding heavy server uploads.
- **Claim Normalization**: Isolates the central factual claim from surrounding social media commentary or transforms interrogative queries ("Did X happen?") into testable hypotheses.

### 2. Multi-Layer Source Retrieval
Rather than relying on LLM memory (which can hallucinate), Verifact queries real-time external indices in parallel:
- **Verified Fact-Checks**: Queries the Google Fact Check Tools API for prior reviews published by IFCN-signatory fact-checking organizations.
- **News Coverage & Web Context**: Searches news media and indexed publications via the Tavily Search API and NewsAPI to capture reporting context and timelines.
- **Institutional & Official Records**: Scopes targeted searches across official government, legislative, and institutional archives via Google Custom Search Engine (`cx`).
- **Academic & Clinical Repositories**: When claims involve medical, health, or scientific topics, the engine cross-references open biomedical literature (Europe PMC, OpenAlex, ClinicalTrials.gov, Crossref retraction checks, and openFDA).

### 3. Synthesis & Transparent Citations
- Retrieved snippets and articles are combined into an evidence dossier.
- A language model (Google Gemini 2.5 Flash via OpenRouter or Google AI Studio) reviews the gathered material, summarizes consensus, notes conflicting accounts, and writes a plain-language summary.
- Every claim in the synthesis must link directly to an existing source in the retrieved evidence set. The code rejects hallucinated citations.

---

## Tech Stack

We keep dependencies intentional, lean, and standard:

- **Frontend & Routing**: [Next.js 16](https://nextjs.org/) (App Router), [React 18](https://react.dev/), Strict [TypeScript](https://www.typescriptlang.org/) (`strict: true`).
- **Styling**: Native CSS Modules. Zero utility-framework overhead; styles are component-scoped and use shared design tokens from `globals.css`.
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, email/password, and Google OAuth).
- **Language Models & AI**: OpenRouter (defaulting to Google Gemini 2.5 Flash, with fallbacks) or direct Google AI Studio.
- **Client-Side ML**: `@huggingface/transformers` with ONNX Runtime Web for local, in-browser speech transcription.
- **Testing**: Jest (`ts-jest`), Playwright (E2E), and ESLint 9.

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 22.0.0`
- **npm**: `>= 10.0.0`
- A free [Supabase](https://supabase.com) project (or a local PostgreSQL instance).

### 1. Clone & Install

```bash
git clone https://github.com/Seby2005/Verifact.git
cd Verifact
npm install
```

### 2. Environment Variables

Copy the sample environment file to `.env.local`:

```bash
cp .env.example .env.local
```

At minimum, you will need the following keys configured in `.env.local` to run core features:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://your-ref.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous Supabase key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret (server-side only, bypasses RLS) |
| `OPENROUTER_API_KEY` | OpenRouter API key for synthesis (default model: `google/gemini-2.5-flash`) |
| `GEMINI_API_KEY` | *(Optional)* Direct Google AI Studio key if not using OpenRouter |
| `GOOGLE_FACT_CHECK_API_KEY` | Google Cloud API key with Fact Check Tools API enabled |
| `TAVILY_API_KEY` | Tavily API key for web and news searches |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Google Custom Search API key for official/institutional searches |
| `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID` | Search engine ID (`cx`) configured for official/institutional domains |
| `GOOGLE_CLOUD_API_KEY` | Google Cloud Vision API key for screenshot OCR |
| `NEXTAUTH_SECRET` | A random 32-character secret string for session security |

*(See [`.env.example`](.env.example) for optional providers such as Mailjet, Resend, Sentry/GlitchTip, and Creem checkout).*

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Quality Checks & Tests

```bash
# Run unit tests
npm test

# Check TypeScript types
npm run type-check

# Compile production build
npm run build
```

---

## Codebase Organization

```text
src/
├── app/                  # Next.js App Router (pages and API route handlers)
│   ├── api/              # Serverless API routes (/api/verify, /api/ocr, etc.)
│   ├── (auth)/           # Authentication flows (login, callback, reset)
│   ├── rapoarte/         # Public and authenticated report views
│   └── ...               # Informational and educational pages
├── components/           # React components with adjacent CSS Modules
│   ├── ui/               # Base primitives (Button, Modal, Input, Callout)
│   ├── verify/           # Verification search input, status streams, report dossier
│   ├── dashboard/        # User history and saved checks
│   └── layout/           # Header, Footer, navigation
├── lib/                  # Application business logic
│   ├── verification/     # 4-layer search orchestrator, scoring algorithm, source filters
│   ├── ai/               # Gemini prompt pipelines, claim decomposition, evidence synthesis
│   ├── transcription/    # In-browser Whisper speech-to-text via Transformers.js
│   ├── supabase/         # Server and client Supabase clients
│   └── utils/            # Structured logging, circuit breakers, retries, and rate limits
└── types/                # Strict TypeScript interfaces and domain schemas
```

---

## Optional Self-Hosted Support Stack

The core web app runs completely standalone on Next.js and Supabase.

For developers seeking complete infrastructure sovereignty, the repository also includes an optional [`docker-compose.yml`](docker-compose.yml) providing open-source operational tooling (workflow orchestration, self-hosted error tracking, and notification webhooks). Full documentation on each supporting tool is available in [`docs/tools/`](docs/tools/).

---

## Guiding Principles & Privacy

- **Transparent Verification**: All evidence sources, search queries, and confidence breakdowns are visible to the user. No opaque black boxes.
- **Strict Data Privacy**: Screenshots uploaded for OCR are processed in memory and discarded; they are never kept on disk or sold. Audio transcription runs entirely inside the user's browser without uploading audio files to remote servers.
- **Political Neutrality**: Verifact does not take editorial stances or political positions. It surfaces what documented records show, cross-referenced from independent and accredited sources.
- **Open Source**: The code is licensed under the [MIT License](LICENSE). Anyone can audit our algorithms, run their own instance, or contribute improvements.

---

## Contributing

We welcome contributions from engineers, researchers, and fact-checkers. Whether you want to improve prompt safety, add new open scientific sources, fix a bug, or improve accessibility, please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## License

This project is open-source under the [MIT License](LICENSE).
