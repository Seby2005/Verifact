# Verifact

**An open-source AI-assisted fact-checking web application that evaluates claims, news articles, and social media posts through a 4-layer verification engine and AI synthesis.**

[![CI](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

> **Note**: While this user documentation and technical architectural guides ([`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)) are provided in English, the application UI is localized natively in Romanian (`ro`) and English (`en`).

---

## Overview

Verifact allows users to submit text claims, web URLs, or social media screenshots (with automatic OCR text extraction). Rather than acting as an opaque "black-box arbiter of truth", Verifact queries multiple independent research sources in parallel, computes a weighted confidence score, and synthesizes a clear report backed by direct source citations.

---

## Tech Stack

- **Framework & Language**: Next.js 14 (App Router), React 18, Strict TypeScript (`strict: true`)
- **Styling**: Vanilla CSS Modules (zero external UI utility framework, custom design system)
- **Backend & Database**: Next.js Serverless Route Handlers, Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **AI & OCR Engine**: Gemini 2.0 Flash (`@google/generative-ai`), Google Cloud Vision API (with OCR.space fallback)
- **Research Services**: Google Fact Check Tools API, Tavily Search API, Google Custom Search API, optional NewsAPI
- **Testing & Tooling**: Jest (`ts-jest`), ESLint (`eslint-config-next`), Playwright (`@playwright/test`), TypeScript Compiler

---

## How the Algorithm Works

Verifact processes every claim through four independent research layers executed concurrently with fail-open fault tolerance:

1. **Layer 1 — Existing Fact-Checks**: Queries the Google Fact Check Tools API for existing debunkings published by IFCN-accredited organizations.
2. **Layer 2 — Web & News Search**: Searches full-web indices via Tavily Search API (and optional NewsAPI) to discover journalistic coverage and context.
3. **Layer 3 — Official & Institutional Sources**: Restricts search via Google Custom Search Engine (`cx`) to institutional, legislative, and official government domains.
4. **Layer 4 — Social & Original Claims**: Searches for original post contexts (using Tavily fallback).

### AI Synthesis & Scoring
- Results from all four layers are combined into an overall weighted confidence score (0–100%).
- Gemini 2.0 Flash synthesizes a neutral, objective summary in the user's language.
- Outputs are validated against hallucinated sources (all cited URLs must exist in the retrieved evidence set).
- Cached results (TTL 7 days) prevent redundant external API queries for identical claims.

*For complete technical design details, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/PRD.md`](docs/PRD.md).*

---

## Local Setup

### Prerequisites
- **Node.js**: Version `>= 22.0.0` (required by `@supabase/supabase-js`)
- **npm**: Version `>= 10.0.0`
- **Supabase**: A free [Supabase](https://supabase.com) project or local Supabase CLI installation.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Seby2005/Verifact.git
   cd Verifact
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Fill in your API credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous public key (safe for browser).
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only, bypasses RLS).
   - `GEMINI_API_KEY`: API key from [Google AI Studio](https://ai.google.dev/) for AI summaries.
   - `GOOGLE_FACT_CHECK_API_KEY`: API key from Google Cloud Console with Fact Check Tools API enabled.
   - `TAVILY_API_KEY`: API key from [Tavily](https://tavily.com/) for full-web search.
   - `GOOGLE_CUSTOM_SEARCH_API_KEY` & `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID`: Google Custom Search key & engine ID (`cx`).
   - `GOOGLE_CLOUD_API_KEY`: Google Cloud Vision API key for image OCR.
   - `NEWS_API_KEY`: *(Optional)* Additional news source API key.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **(Optional) Local Supabase Database Setup**:
   ```bash
   npm install -g supabase
   supabase start      # Requires Docker
   supabase db reset   # Applies SQL migrations from supabase/migrations/
   ```

---

## Available Scripts

Scripts defined in `package.json`:

- `npm run dev`: Starts the Next.js local development server.
- `npm run build`: Compiles and builds the production application bundle.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint checks across the codebase.
- `npm test`: Runs unit tests via Jest.
- `npm run test:watch`: Runs Jest unit tests in interactive watch mode.
- `npm run test:coverage`: Runs Jest unit tests and generates coverage reports.
- `npm run type-check`: Executes TypeScript type checking without emitting files (`tsc --noEmit`).

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on branch naming, conventional commit standards, and pull request workflows.

---

## License

This project is licensed under the [MIT License](LICENSE).
