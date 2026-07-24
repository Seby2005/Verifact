# Master Engineering & Technical Implementation Guide
**Project:** Fact-Checker AI (AI-Powered Misinformation Verification Platform)  
**Target Stack:** Next.js 14 (App Router) · TypeScript (Strict) · Supabase (PostgreSQL + RLS + Auth) · Gemini 2.0 Flash API · CSS Modules · Vercel

---

## 1. UX/UI & Product Design Systems

### 1.1 Atomic Component Hierarchy & Design Tokens
Establish design tokens as immutable CSS custom properties in `globals.css`. Never use hardcoded hexadecimal colors, static pixel margins, or ad-hoc inline styles inside React components.

```css
/* src/app/globals.css */
:root {
  /* Color Palette - Modern Dark/Light Glassmorphism */
  --bg-primary: #0b0f19;
  --bg-secondary: #111827;
  --bg-surface: #1f2937;
  --bg-surface-hover: #374151;
  
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;

  /* Accent Colors */
  --brand-primary: #2563eb;
  --brand-hover: #1d4ed8;
  --status-true: #16a34a;
  --status-false: #dc2626;
  --status-partial: #d97706;

  /* Spacing Scale (8pt Grid) */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */

  /* Borders & Shadows */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.18);
  --shadow-glow: 0 0 15px rgba(37, 99, 235, 0.25);
}
```

### 1.2 WCAG 2.1 AA Accessibility & Keyboard Trapping
- Every interactive element must be keyboard accessible (`Tab`, `Shift+Tab`, `Enter`, `Space`).
- Interactive elements must maintain explicit `:focus-visible` styles with a minimum contrast ratio of 4.5:1.

```css
/* Accessible Focus Ring Utility */
button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
  box-shadow: var(--shadow-glow);
}
```

### 1.3 Form Controls & Live ARIA Regions
Dynamic asynchronous progress indicators must announce changes to screen readers using `aria-live` containers.

```tsx
// Example: Accessible Verification Progress Tracker
import React from 'react';
import styles from './ProgressTracker.module.css';

interface ProgressTrackerProps {
  status: string;
  progress: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ status, progress }) => {
  return (
    <div className={styles.container} role="region" aria-label="Stadiu verificare">
      <div 
        className={styles.progressBar} 
        role="progressbar" 
        aria-valuenow={progress} 
        aria-valuemin={0} 
        aria-valuemax={100}
      >
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
      {/* Live Region for Screen Readers */}
      <p className={styles.statusText} aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </div>
  );
};
```

---

## 2. Computer Networking & Web Protocols

### 2.1 HTTP/2 & HTTP/3 Protocol Tuning
- **Multiplexing:** Use a single persistent TCP/QUIC connection for API requests and static assets to eliminate connection handshake overhead.
- **Header Compression (HPACK/QPACK):** Minimize custom request headers on micro-requests.

### 2.2 Security & Cache-Control Headers in Next.js
Configure explicit headers in `next.config.mjs` to force HTTPS, prevent clickjacking, and enforce tight Content Security Policies (CSP).

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
            ].join('; '),
          },
        ],
      },
      {
        // Immutable cache for static assets
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 3. Frontend Architecture & Performance

### 3.1 Server Components vs. Client Components Boundaries
- **Server Components (Default):** Route handlers, page layouts, static text, data fetching from Supabase or Gemini API.
- **Client Components (`'use client'`):** Drag-and-drop file dropzone, interactive charts, copy-to-clipboard buttons, tab state managers.

```tsx
// src/app/report/[id]/page.tsx (Server Component)
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getVerificationReport } from '@/lib/db/reports';
import { ReportCard } from '@/components/ReportCard';
import { ReportSkeleton } from '@/components/ReportSkeleton';

interface PageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: PageProps) {
  const report = await getVerificationReport(params.id);

  if (!report) {
    notFound();
  }

  return (
    <main className="container">
      <Suspense fallback={<ReportSkeleton />}>
        <ReportCard report={report} />
      </Suspense>
    </main>
  );
}
```

### 3.2 Dynamic Import for Heavy Client Libraries
Lazy load non-critical client dependencies (e.g. image crop tool, chart visualizer) using `next/dynamic`.

```tsx
// src/components/OCRScanner/index.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';

const DynamicImageCropper = dynamic(
  () => import('@/components/ImageCropper').then((mod) => mod.ImageCropper),
  {
    loading: () => <p>Se încarcă modulul de procesare imagine...</p>,
    ssr: false,
  }
);

export const OCRScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      {file && <DynamicImageCropper file={file} />}
    </div>
  );
};
```

---

## 4. Backend Engineering & API Systems

### 4.1 Resilient Parallel Retrieval (`Promise.allSettled`)
Never execute external API dependencies sequentially when they can be run in parallel. Wrap calls with strict 10-second timeouts.

```typescript
// src/lib/verification/aggregator.ts
export interface LayerResult<T> {
  name: string;
  status: 'fulfilled' | 'rejected' | 'unavailable';
  data?: T;
  error?: string;
  latencyMs: number;
}

export async function executeLayersInParallel(claimText: string) {
  const startTime = Date.now();

  const results = await Promise.allSettled([
    fetchWithTimeout('/api/layers/factcheck', claimText, 10000),
    fetchWithTimeout('/api/layers/news', claimText, 10000),
    fetchWithTimeout('/api/layers/social', claimText, 10000),
  ]);

  return results.map((res, index) => {
    const layerNames = ['FactCheckTools', 'NewsAPI', 'SocialSearch'];
    const name = layerNames[index] || `Layer_${index}`;
    const latencyMs = Date.now() - startTime;

    if (res.status === 'fulfilled') {
      return { name, status: 'fulfilled', data: res.value, latencyMs } as LayerResult<any>;
    } else {
      console.error(`[Layer Error] ${name} failed:`, res.reason);
      return { name, status: 'unavailable', error: String(res.reason), latencyMs } as LayerResult<any>;
    }
  });
}

async function fetchWithTimeout(url: string, payload: any, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: payload }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 5. Database Engineering & SQL Optimization

### 5.1 Database Schema & Indexing (PostgreSQL / Supabase)
Every production table must have Row Level Security enabled, foreign key indexes, and created_at timestamps.

```sql
-- supabase/migrations/20260723_init_schema.sql

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Verifications
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claim_text TEXT NOT NULL,
    claim_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash for deduplication
    verdict_score INT NOT NULL CHECK (verdict_score BETWEEN 0 AND 100),
    verdict_label VARCHAR(20) NOT NULL CHECK (verdict_label IN ('verified_true', 'verified_false', 'partially_true', 'unverifiable')),
    explanation_json JSONB NOT NULL,
    sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B-Tree Indexes for High-Frequency Queries
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_claim_hash ON public.verifications(claim_hash);
CREATE INDEX IF NOT EXISTS idx_verifications_is_public_created ON public.verifications(is_public, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Anyone can read public verifications
CREATE POLICY "Public verifications are viewable by anyone"
ON public.verifications FOR SELECT
USING (is_public = true);

-- RLS Policy 2: Users can view their own private or public verifications
CREATE POLICY "Users can view own verifications"
ON public.verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy 3: Authenticated users can create verifications
CREATE POLICY "Users can insert own verifications"
ON public.verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 5.2 Deduplication Cache Strategy (SHA-256 Hash Matching)
Before querying expensive LLM or search APIs, compute a SHA-256 hash of the normalized claim text. If a match exists in Supabase, return cached results instantly.

```typescript
// src/lib/cache/deduplication.ts
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export function computeClaimHash(claimText: string): string {
  const normalized = claimText.trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function getCachedVerification(claimHash: string) {
  const { data, error } = await supabaseAdmin
    .from('verifications')
    .select('*')
    .eq('claim_hash', claimHash)
    .single();

  if (error || !data) return null;
  return data;
}
```

---

## 6. Web Security & Application Hardening

### 6.1 Strict Zod Input Validation
Validate and sanitize all user payloads at the API route boundary before invoking any business logic.

```typescript
// src/app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeClaimHash, getCachedVerification } from '@/lib/cache/deduplication';

const VerifyRequestSchema = z.object({
  claimText: z.string().min(5, 'Textul este prea scurt').max(5000, 'Textul depășește limita de 5000 caractere'),
  isPublic: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = VerifyRequestSchema.parse(body);

    const claimHash = computeClaimHash(parsed.claimText);
    const cached = await getCachedVerification(claimHash);

    if (cached) {
      return NextResponse.json({ source: 'cache', report: cached }, { status: 200 });
    }

    // Proceed with verification pipeline...
    return NextResponse.json({ source: 'live', status: 'processing' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Payload invalid', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Eroare internă de server' }, { status: 500 });
  }
}
```

---

## 7. Software Architecture & AI Prompt Engineering

### 7.1 Deterministic Scoring Engine (`scoring.ts`)
Compute claim scores algorithmically before passing raw evidence to Gemini for explanation generation.

```typescript
// src/lib/verification/scoring.ts
export interface SourceEvidence {
  domain: string;
  reliabilityScore: number; // 0 to 1
  supportsClaim: boolean;
}

export function calculateVerdictScore(evidences: SourceEvidence[]): { score: number; label: string } {
  if (evidences.length === 0) {
    return { score: 50, label: 'unverifiable' };
  }

  let totalWeight = 0;
  let weightedSupport = 0;

  for (const item of evidences) {
    totalWeight += item.reliabilityScore;
    if (item.supportsClaim) {
      weightedSupport += item.reliabilityScore;
    }
  }

  const score = Math.round((weightedSupport / totalWeight) * 100);

  let label = 'unverifiable';
  if (score >= 80) label = 'verified_true';
  else if (score <= 30) label = 'verified_false';
  else label = 'partially_true';

  return { score, label };
}
```

### 7.2 Gemini 2.0 Flash Grounded Prompt Template
Force Gemini to generate structured JSON conforming strictly to the grounded schema, using probabilistic Romanian/English phrasing.

```typescript
// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateReportExplanation(
  claimText: string,
  score: number,
  sources: any[]
) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
Context date verificate: ${JSON.stringify(sources)}
Scor calculat determinist: ${score}/100

Instrucțiuni stricte de redactare:
1. Analizează afirmația transmisă în tag-ul <user_claim>.
2. Folosește EXCLUSIV informațiile din contextul furnizat mai sus. Nu inventa surse sau citate.
3. Nu lua poziții editoriale sau politice.
4. Folosește un limbaj probabilistic ("datele indică", "este consistent cu", "sugerează").
5. Scrie raportul în aceeași limbă ca afirmația utilizatorului (Română / Engleză).

<user_claim>
${claimText}
</user_claim>

Returnează un obiect JSON cu următoarea structură:
{
  "summary": "Rezumat sintetic al verificării",
  "keyPoints": ["Punctul 1", "Punctul 2"],
  "confidenceAssessment": "Evaluarea gradului de certitudine"
}
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

---

## 8. Summary Engineering Checklist

| Component | Standard | Enforcement Method |
|---|---|---|
| **TypeScript** | Strict mode, zero `any`, Zod validation | `tsc --noEmit` on CI pipeline |
| **Styling** | Vanilla CSS Modules + CSS Custom Properties | No hardcoded colors/pixels in JSX |
| **API Caching** | SHA-256 deduplication in Supabase | 0ms / 0 token cost on repeated claims |
| **Security** | Row Level Security (RLS) on all PostgreSQL tables | Default deny policy in Supabase migrations |
| **Resilience** | `Promise.allSettled()` with 10s `AbortController` | Graceful degradation on layer timeout |
| **Accessibility** | WCAG 2.1 AA compliant, 4.5:1 text contrast | Lighthouse Accessibility Score = 100 |
