# Best Practices, Architectural Patterns & Academic Reference Guide
**Application:** Fact-Checker AI (AI-Powered Misinformation Verification Web App)  
**Target Stack:** Next.js 14 App Router · TypeScript (Strict) · Supabase (PostgreSQL + RLS + Auth) · Gemini 2.0 Flash API · Vercel  
**Related Documents:** [DEVELOPMENT_MASTER_GUIDE.md](file:///c:/Users/sebii/Desktop/work/misinformation%20web%20app/fact-checker-ai/docs/DEVELOPMENT_MASTER_GUIDE.md) (Concrete Code & Architecture Guide) | [TECHNICAL_BIBLIOGRAPHY.md](file:///c:/Users/sebii/Desktop/work/misinformation%20web%20app/fact-checker-ai/docs/TECHNICAL_BIBLIOGRAPHY.md) (Technical Library)

---

## Part 1: Production Web & AI SaaS Engineering Best Practices

### 1. Next.js 14 App Router & TypeScript Production Best Practices

#### 1.1 Server Components (RSC) vs Client Components (`'use client'`)
- **Default to React Server Components (RSC):** Keep data fetching, database access, heavy computations, and SDK calls (e.g. Gemini SDK, Supabase admin client) exclusively on the server. Server components reduce JavaScript bundle sizes and prevent sensitive API keys from leaking to the client.
- **Push Client Boundaries to the Leaves:** Mark only interactive nodes (e.g., file upload dropzones, interactive copy buttons, tab switchers) with `'use client'`. 
- **Composition Pattern (Children Injection):** When wrapping interactive layouts (like collapsible sidebars or auth providers), pass Server Components as `children` into Client Components to avoid forcing entire subtrees into client-side rendering.
- **Streaming with Suspense:** Use `<Suspense fallback={<LoadingSkeleton />}>` around heavy server components (such as report details or user dashboard metrics). This prevents slow external API calls from blocking initial page HTML delivery (TTFB).

#### 1.2 Route Caching & Data Revalidation Strategies
- **Granular Tag-Based Revalidation:** Prefer `revalidateTag('user-reports')` and `revalidatePath('/dashboard')` over aggressive global cache invalidation.
- **Explicit `fetch` Cache Controls:** In Next.js 14, explicitly pass caching options to `fetch()` calls:
  - `{ cache: 'force-cache' }` for static metadata and historical public reports.
  - `{ next: { revalidate: 3600 } }` (Time-to-Live caching) for external search API queries that update infrequently.
  - `{ cache: 'no-store' }` for dynamic verification requests (`/api/verify`).
- **Request Deduplication with `React.cache`:** Wrap custom data access functions (such as fetching user profile data from Supabase inside Server Components) with `React.cache()` to automatically deduplicate redundant queries across the same render tree.

#### 1.3 Strict TypeScript Patterns
- **Zero-`any` Standard:** Enable `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, and `"noUncheckedIndexedAccess": true` in `tsconfig.json`.
- **Runtime Type Safety with Zod:** Validate all API request payloads and external API responses (e.g. Gemini JSON output) using Zod schemas (`schema.parseAsync()`). Infer TypeScript types directly from schemas via `z.infer<typeof Schema>` to keep contract definitions single-source-of-truth.
- **Explicit Return Types:** Require explicit return types on all public functions, custom hooks, and API Route handlers (`Promise<NextResponse<VerificationResponse>>`).

#### 1.4 Production Error Handling & Graceful Degradation
- **Granular Route Errors (`error.tsx` & `global-error.tsx`):** Implement `error.tsx` at route segment levels to isolate localized failures (e.g., failure loading a specific verification report) without breaking the root layout or application shell.
- **API Failover & Timeout Controls:** Enforce a strict 10-second timeout on all external API requests (Google Vision, Custom Search, Gemini) using `AbortController`. If a non-essential layer fails or times out, degrade gracefully by setting layer status to `'unavailable'` rather than failing the entire request.
- **Safe Error Boundaries for API Routes:** Wrap API handler logic in centralized try/catch blocks that log full diagnostic stack traces to internal logging tools while returning clean, sanitized localized error responses to the client (never expose raw internal stack traces or database schema errors).

---

### 2. AI SaaS App Design Patterns (Gemini 2.0 Integration)

#### 2.1 Multi-Layer Aggregation & Resilience Architecture
- **Parallel Layer Execution:** Run multi-source retrieval layers (Fact Check Tools API, News search, Official gov registries, Social search) concurrently using `Promise.allSettled()`. This guarantees that slow or rate-limited third-party endpoints do not block faster data layers.
- **Circuit Breakers & Degradation Handling:** Implement circuit breakers around high-latency APIs. If external search services fail, supply the Gemini prompt with available data layers and explicitly instruct the model to evaluate claims based solely on surviving evidence layers.

#### 2.2 Cost Control & Rate Limiting Algorithms
- **Two-Tier Rate Limiting:**
  - **IP-based Rate Limiting (Anonymous users):** Use a sliding-window rate-limiter stored in Upstash Redis / Vercel KV (e.g., 5 requests / hour per IP).
  - **User Tier Quota Enforcement (Authenticated users):** Track verification consumption directly in PostgreSQL / Supabase profiles (`verifications_count`). Check quotas prior to triggering expensive OCR or LLM pipeline calls.
- **SHA-256 Content Deduplication Cache:** Before invoking OCR or multi-layer search, generate a SHA-256 hash of normalized user input. Query `cached_results` in Supabase; on cache HIT, return cached reports instantly (0 cost, <100ms latency).

#### 2.3 Transparent AI Scoring Architecture
- **Deterministic Weighting + LLM Summarization:** Separate claim scoring into two distinct steps:
  1. **Algorithmic Math Engine (`scoring.ts`):** Compute an objective verdict score (0–100) using a deterministic formula based on domain authority, source consensus, and claim matching.
  2. **LLM Explainer (`gemini.ts`):** Feed the score and underlying source data into Gemini 2.0 Flash to synthesize human-readable explanations.
- **Score Breakdown Transparency:** Always display granular sub-scores (e.g., Official Sources Score, News Consensus Score, Fact-Check Database Match) alongside the final score to explain *how* the verdict was reached.

#### 2.4 Prompt Engineering & AI Safety Guidelines
- **Structured Output Enforcement:** Use Gemini 2.0 Flash's native `responseSchema` (Structured JSON output) to ensure reliable parsing without markdown wrapper tags.
- **Strict Grounding System Instructions:** Include mandatory constraints in system instructions for Gemini:
  1. *Strict Null Hypothesis:* "Do NOT invent citations or URLs. Cite ONLY from the provided structured context."
  2. *Neutral Tone:* "Do NOT take political, subjective, or editorial stances."
  3. *Probabilistic Language:* "Use probabilistic terms ('indicates', 'suggests', 'is consistent with') rather than absolute declarations."
  4. *Unverifiable Fallback:* "If provided context is insufficient or conflicting, explicitly state that the claim cannot be conclusively verified."
  5. *Language Matching:* "Always generate the summary in the primary language of the input text (e.g., Romanian or English)."
- **Prompt Injection Defense:** Wrap user-submitted claims inside strict delimiter blocks (e.g. `<user_claim>...</user_claim>`) and sanitize control characters to prevent prompt hijacking.

---

### 3. Web Application Performance & Accessibility (WCAG 2.1 AA)

#### 3.1 Core Web Vitals Optimization
- **Largest Contentful Paint (LCP < 2.5s):** 
  - Preload primary hero typography using `next/font/google` with `display: 'swap'`.
  - Optimize initial server HTML rendering via SSR so verdict summaries load immediately without layout jumps.
- **Interaction to Next Paint (INP < 200ms):** 
  - Keep Client Components lightweight.
  - Disable heavy JS execution during user input handling; defer non-critical operations (like analytics reporting) using `requestIdleCallback` or background execution.
- **Cumulative Layout Shift (CLS < 0.1):** 
  - Explicitly define height and width placeholders or CSS skeletons for async sections (e.g., ProgressTracker, ReportCard loading states).
  - Use CSS Modules for isolated scoping, avoiding CSS recalculation churn.

#### 3.2 Dynamic Code Splitting
- **Lazy Load Heavy Components:** Use `next/dynamic` to load heavy UI elements (e.g., image croppers, OCR preview modals, dynamic chart visualizers) only when invoked by user interactions.
- **Tree-Shaking External Dependencies:** Avoid importing monolithic helper packages; import modular sub-paths (e.g., `date-fns/format`).

#### 3.3 WCAG 2.1 AA Accessibility Compliance
- **Contrast Ratios:** Ensure contrast ratio exceeds 4.5:1 for standard body text and 3:1 for large display headers/verdict badges (e.g., Verified True green `#16A34A`, False red `#DC2626`, Partial yellow `#D97706`).
- **Keyboard Navigation & Focus Management:**
  - Ensure all interactive cards, dropzones, and buttons feature visible focus outlines (`:focus-visible`).
  - Support keyboard shortcuts (e.g., `Enter` and `Space` for drag-and-drop file uploaders).
- **Accessible Form Controls:** Pair all `<input>`, `<textarea>`, and `<select>` controls with explicit `<label>` tags or `aria-label` / `aria-labelledby` attributes. Include dynamic live regions (`aria-live="polite"`) for real-time verification progress tracking updates.

---

### 4. Security & Data Protection in SaaS Web Apps

#### 4.1 API Route Hardening & Input Protection
- **Strict Input Validation:** Validate every incoming payload using Zod before processing. Restrict input text to maximum character lengths (e.g. 5,000 chars) and check uploaded screenshot MIME types/sizes (e.g. max 5MB, PNG/JPEG only).
- **HTML & XSS Sanitization:** Sanitize text extracted from external web scraping or user submissions using DOMPurify / sanitize-html before rendering or passing to AI engines.
- **Environment Variable Boundary Isolation:**
  - `NEXT_PUBLIC_*` variables are strictly reserved for non-sensitive public configuration (e.g., Supabase Project URL, Supabase Public Anon Key).
  - Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_API_KEY`) must **never** carry the `NEXT_PUBLIC_` prefix and must only be accessed within Server Components or API Routes.

#### 4.2 Supabase Row Level Security (RLS) Best Practices
- **Default Deny Strategy:** Enable RLS on all PostgreSQL tables (`ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;`).
- **Granular Policy Rules:**
  ```sql
  -- Public verifications viewable by anyone
  CREATE POLICY "Public verifications are viewable by everyone" 
  ON verifications FOR SELECT 
  USING (is_public = true);

  -- Authenticated users view their own private/public verifications
  CREATE POLICY "Users can view own verifications" 
  ON verifications FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

  -- Users can insert verifications bound to their auth UID
  CREATE POLICY "Users can insert own verifications" 
  ON verifications FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

  -- Users can delete only their own verifications
  CREATE POLICY "Users can delete own verifications" 
  ON verifications FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);
  ```

---

## Part 2: Academic & University Textbook Research (10 Key Works)

### Category A: Web Development & Web Services Architecture

#### 1. *Distributed Systems: Principles and Paradigms (4th Edition)*
- **Authors / Institution:** Maarten van Steen & Andrew S. Tanenbaum | VU Amsterdam & University of Twente (Open-Access Edition)
- **Key Takeaways:** 
  - **Stateless Application Tiers:** Offload all session state to low-latency key-value stores (Redis) to allow horizontal auto-scaling.
  - **Circuit Breakers & Bulkheads:** Protect downstream microservices from cascading failures using timeout thresholds and isolation pools.
  - **Tunable Consistency:** Choose appropriate consistency models (Eventual vs Strong) depending on domain needs.

#### 2. *Software Engineering at Google: Lessons Learned from Programming Over Time*
- **Authors / Institution:** Titus Winters, Tom Manshreck, Hyrum Wright | Google / O'Reilly (Open Edition)
- **Key Takeaways:**
  - **Hyrum's Law:** Internal APIs will inevitably be depended on by users; strictly encapsulate state and explicitly version interfaces.
  - **Shift-Left Testing:** Run hermetic, environment-independent unit and integration tests before merging code to catch bugs early.
  - **Long-Term Maintainability:** Evaluate architectural choices by operational cost over a 5–10 year horizon, prioritizing simple, readable abstractions over clever tricks.

#### 3. *Architectural Styles and the Design of Network-based Software Architectures*
- **Author / Institution:** Roy Thomas Fielding | University of California, Irvine (PhD Dissertation)
- **Key Takeaways:**
  - **Uniform Interface & Resource Decoupling:** Expose URIs as domain resources using standard HTTP verbs rather than revealing database schemas.
  - **Stateless HTTP Design:** Self-contain client requests with full authorization context, allowing edge nodes to route requests freely.
  - **Layered Caching:** Utilize HTTP `Cache-Control` and `ETag` headers to let proxy networks and CDNs handle high-frequency reads.

#### 4. *The Architecture of Open Source Applications (AOSA)*
- **Editors / Organization:** Amy Brown & Greg Wilson | Open Source Community
- **Key Takeaways:**
  - **Non-Blocking Asynchronous I/O (Nginx Pattern):** Use event-driven loops to handle high concurrency efficiently.
  - **Producer-Consumer Queues:** Offload heavy tasks (OCR, multi-layered search) to asynchronous background workers (Celery/RabbitMQ).
  - **Pluggable Architecture:** Build modular layers with swappable adapters (e.g. switching search or database providers cleanly).

#### 5. *Site Reliability Engineering: How Google Runs Production Systems*
- **Authors / Organization:** Betsy Beyer et al. | Google / O'Reilly (Open Edition)
- **Key Takeaways:**
  - **SLOs & Error Budgets:** Drive release speed using objective availability metrics (99.9% SLO); freeze non-critical releases when error budgets drop.
  - **Load Shedding & Exponential Backoff:** Gracefully drop non-essential traffic under heavy load while forcing clients to retry with random jitter.
  - **Distributed Tracing:** Inject global Trace IDs into request headers to track latencies across services.

---

### Category B: AI-Powered Applications & LLM Systems Engineering

#### 6. *Dive into Deep Learning (D2L)*
- **Authors / Institution:** Aston Zhang, Zachary C. Lipton, Mu Li, Alexander J. Smola | UC Berkeley, Amazon, CMU / Cambridge University Press
- **Key Takeaways:**
  - **Transformer Self-Attention:** Process context in parallel across input tokens for semantic representation.
  - **Mixed-Precision Quantization (FP16/INT8):** Reduce memory bandwidth and double inference speed with minimal loss in precision.
  - **Computational Graph Optimization:** Use static compiled graphs for production LLM inference endpoints.

#### 7. *Machine Learning Systems Design (Stanford CS 329S)*
- **Author / Institution:** Chip Huyen | Stanford University
- **Key Takeaways:**
  - **Feature Store Pattern:** Separate ultra-low latency serving lookups from offline columnar training data.
  - **Shadow Deployment:** Mirror real-world traffic to new AI models in parallel to evaluate accuracy before user exposure.
  - **Deterministic Fallbacks:** Provide static rule-based backups if AI models hit timeouts or rate limits.

#### 8. *Rules of Machine Learning: Best Practices for ML Engineering*
- **Author / Institution:** Martin Zinkevich | Google Research
- **Key Takeaways:**
  - **Rule #1: Start Without Machine Learning:** Build a fully working rule-based heuristic baseline before introducing ML/AI models.
  - **Pipeline Invariant Validation:** Run strict schema assertions between pipeline stages to catch bad data upstream.
  - **Metric Alignment:** Ensure model evaluations directly map to user experience and product metrics.

#### 9. *Full Stack LLM BootCamp / Building LLM Applications*
- **Authors / Institution:** Sergey Karayev, Charles Frye, Josh Tobin | UC Berkeley / Full Stack Deep Learning
- **Key Takeaways:**
  - **RAG Architecture:** Combine dense vector search over specialized databases (Pgvector) with prompt context injection.
  - **Hybrid Search (Dense + Sparse):** Combine vector embeddings with keyword search (BM25) using Reciprocal Rank Fusion.
  - **Semantic Caching:** Cache prompt embedding pairs to return instant responses for semantically identical user queries.

#### 10. *Large Language Model Agents (UC Berkeley CS 294/194-196)*
- **Authors / Institution:** Dawn Song et al. | UC Berkeley RDI
- **Key Takeaways:**
  - **ReAct (Reasoning + Acting) Loops:** Structure agents into *Thought -> Action -> Observation* loops for multi-step reasoning.
  - **Structured Tool Calling:** Expose microservices and databases to LLMs via strictly typed JSON Schemas.
  - **Hierarchical Agent Memory:** Maintain short-term context buffers, task working memory, and long-term vector stores.

---

## Part 3: Cross-Domain Architecture Blueprint

```
[ Client App / Frontend ]
          │
          ▼ (HTTPS / REST / Server-Sent Events)
[ Layer 1: Edge & API Gateway ] ◄── Rate Limiting, WAF, Auth, Route Management
          │
          ▼
[ Layer 2: Web Service Application Tier ]
  ├── Stateless API Controllers (Next.js 14 App Router)
  ├── Task Queue Producer (Redis / Vercel KV) ──► [ Async Worker Pool ]
  └── Circuit Breaker & Load Shedder
          │
          ├───────────────────────────────┐
          ▼                               ▼
[ Layer 3: AI Orchestration & Guardrails ] [ Layer 4: Data & Memory Tier ]
  ├── Input Sanitizer & Injection Guard   ├── Relational DB (Supabase / Postgres)
  ├── Semantic Cache (SHA-256 / Vector)   ├── Vector Database (Pgvector)
  ├── Multi-Layer Search (Google/News/Gov)├── Feature Store / Cache (Redis)
  ├── Prompt Assembler & JSON Validator   └── User Profiles & Quotas
  └── Scoring Engine (Deterministic Math)
          │
          ▼
[ Layer 5: Foundation Model API ]
  └── Primary Model (Gemini 2.0 Flash API)
          │
          ▼
[ Layer 6: Observability & Logging ]
  └── Sanitized Centralized Error Logging & Latency Tracing
```

---

## Part 4: Summary Blueprint Checklist

| Category | High-Impact Practice | Key Metric & Verification |
|---|---|---|
| **App Router** | Server Components by default; client leaves for interactive forms | Reduced client bundle size (<100KB initial JS) |
| **Caching** | SHA-256 hash deduplication cache in Supabase | 0ms LLM cost on repeated claims |
| **TypeScript** | `"strict": true` + Zod schemas for external API outputs | Zero runtime dynamic type errors |
| **AI Resilience** | `Promise.allSettled()` across retrieval layers + 10s timeouts | 100% graceful response rate despite third-party API outage |
| **AI Transparency** | Deterministic score formula + Gemini structured JSON explanation | Publicly auditable scoring methodology |
| **Performance** | SSR for public reports + dynamic imports for heavy modals | LCP < 2.5s, INP < 200ms |
| **Security** | Supabase RLS enabled + server-only environment keys | Zero unauthorized DB access / API key leakage |
| **Accessibility** | Semantic HTML, WCAG AA 4.5:1 contrast, `aria-live` status | 100 Accessibility score in Lighthouse |
