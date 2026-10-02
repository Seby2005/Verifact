# Verifact

An open-source verification engine designed to assist critical thinking by cross-referencing public claims against documented records, accredited fact-checkers, news archives, and institutional evidence.

[![CI](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)

---

## Mission & Principles

Misinformation rarely spreads because people are gullible. It spreads because social media is engineered for emotional velocity, while factual investigation is tedious and time-consuming. In the few seconds between encountering an alarming claim and sharing it, most people do not have time to cross-examine journalistic archives or consult official records.

**Verifact is not a "ministry of truth" and does not claim infallible authority.** We believe no single algorithm or entity should hand down dogmatic verdicts from on high.

Instead, Verifact functions as an empowering research assistant:
1. **Input**: A user submits a claim via text, web link, screenshot, or audio clip.
2. **Triangulation**: The engine retrieves documented evidence across accredited fact-checking registries, mainstream news archives, institutional records, and academic databases.
3. **Synthesis**: Contextual synthesis identifies points of consensus, documented refutations, or omitted context, presenting verifiable sources so users can judge the evidence for themselves.

---

## The Verification Engine & Pipeline

```text
  User Input (Text / URL / Screenshot / Audio Clip)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
  Image OCR                     In-Browser Speech
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
             Bayesian Credibility Scoring
                       │
                       ▼
             Contextual Synthesis
           (Gemini 2.5 Flash via LLM)
                       │
                       ▼
        Transparent Report with Primary Citations
```

### 1. Ingestion & Pre-Processing
- **Text & URLs**: Evaluates raw text or extracts the primary narrative from article URLs.
- **Screenshots**: Passes user-uploaded images through OCR to extract on-image text and metadata without storing images permanently.
- **Client-Side Speech-to-Text**: Transcribes spoken claims directly inside the user's browser using `@huggingface/transformers` and an int8-quantized Whisper model running via WebAssembly (`onnxruntime-web`). The audio never leaves the client device.
- **Claim Normalization**: Isolates the central testable hypothesis from surrounding commentary and transforms rhetorical queries into testable assertions.

### 2. Multi-Layer Source Retrieval
Rather than relying on model training memory (which can hallucinate or become outdated), Verifact retrieves live external records in parallel:
- **Layer 1: Accredited Fact-Checks**: Queries the Google Fact Check Tools API for prior reviews published by certified IFCN signatories.
- **Layer 2: News Coverage & Reporting**: Searches reputable press indices and journalistic databases via Tavily Search API and NewsAPI.
- **Layer 3: Institutional & Official Records**: Searches official government gazettes, legislative registries, and public institutional archives via Google Custom Search Engine (`cx`).
- **Layer 4: Academic & Biomedical Repositories**: When claims involve medical, clinical, or scientific assertions, the engine cross-references open biomedical literature (Europe PMC, OpenAlex, ClinicalTrials.gov, and openFDA).

### 3. Bayesian Credibility Scoring & Evidence Status
The scoring engine combines evidence weights probabilistically across all responsive layers:
- **Evidence Status**: Maps findings to clear statuses:
  - *Confirmat de documente / surse multiple* (Corroborated by primary sources)
  - *Contrazis de sursele oficiale / presă* (Contradicted by documented facts)
  - *Lipsit de context verificabil* (Missing critical context)
  - *Fără surse credibile identificate* (No credible evidence found)
- **Signal Coloration**: False or unsubstantiated claims carry prominent signal red warnings (`Informație falsă` / `Informație posibil falsă / neverificată`).

### 4. Contextual Synthesis & Hallucination Prevention
- Gathered articles and official quotes are synthesized into a coherent dossier.
- A language model evaluates consensus, highlights missing context, and writes an executive explanation.
- **Strict Citation Integrity**: Every assertion in the synthesis must link directly to an existing source in the retrieved evidence set. The engine rejects ungrounded or hallucinated citations.

---

## Tech Stack

- **Frontend & Routing**: [Next.js 16](https://nextjs.org/) (App Router), [React 18](https://react.dev/), Strict [TypeScript](https://www.typescriptlang.org/) (`strict: true`).
- **Styling**: Native CSS Modules (mobile-first, zero utility-framework overhead, shared design tokens).
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, email/password, and Google OAuth).
- **Language Models & AI**: OpenRouter (defaulting to Google Gemini 2.5 Flash, with fallbacks) or direct Google AI Studio.
- **Client-Side ML**: `@huggingface/transformers` with ONNX Runtime Web for local, in-browser speech transcription.
- **Testing**: Jest (`ts-jest`), Playwright (E2E), and ESLint 9.

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

## Guiding Principles & Privacy

- **Transparent Verification**: All evidence sources, search queries, and confidence breakdowns are visible to the user. No opaque black boxes.
- **Strict Data Privacy**: Screenshots uploaded for OCR are processed in memory and discarded; they are never kept on disk or sold. Audio transcription runs entirely inside the user's browser without uploading audio files to remote servers.
- **Political Neutrality**: Verifact does not take editorial stances or political positions. It surfaces what documented records show, cross-referenced from independent and accredited sources.
- **Open Source**: The code is licensed under the [MIT License](LICENSE).

---

## License

This project is open-source under the [MIT License](LICENSE).
