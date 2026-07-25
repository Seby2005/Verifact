# ARCHITECTURE.md
# Arhitectura Tehnică — Verifact

**Stack principal:** Next.js 14 · TypeScript · Supabase · Vercel · Gemini 2.0 Flash

> Acest document descrie ce e construit efectiv în cod, nu planul inițial din
> `docs/PRD.md`. Unde cele două diferă, codul câștigă.

---

## 1. Vizualizare de ansamblu

```
┌────────────────────────────────────────────────────────────────┐
│                        UTILIZATOR                              │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                   VERCEL (Hosting + CDN + Analytics)            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              NEXT.JS 14 (App Router)                     │  │
│  │  ┌─────────────┐   ┌─────────────────────────────────┐  │  │
│  │  │   Frontend  │   │         API Routes              │  │  │
│  │  │  (React +   │   │  /api/verify   /api/ocr         │  │  │
│  │  │  CSS Mod.)  │   │  /api/reports  /api/user/*       │  │  │
│  │  └─────────────┘   └────────────┬────────────────────┘  │  │
│  └─────────────────────────────────┼────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────────────┐
              │                      │                              │
              ▼                      ▼                              ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌──────────────────┐
│   SUPABASE      │    │   GOOGLE APIs            │    │  TAVILY / NEWS   │
│  - Auth         │    │  - Cloud Vision (OCR)    │    │  - Full-web      │
│  - PostgreSQL   │    │  - Fact Check Tools      │    │    search        │
│  - Row Level    │    │  - Custom Search         │    │  - Layer 2 + 4   │
│    Security     │    │  - Gemini 2.0 Flash      │    │                  │
└─────────────────┘    └─────────────────────────┘    └──────────────────┘
```

---

## 2. Stack tehnologic

### 2.1 Frontend
Next.js 14 (App Router) · React 18 · TypeScript strict · CSS Modules, fără
librărie de componente — vezi [`DESIGN.md`](../DESIGN.md) pentru sistemul de
design.

### 2.2 Backend
Next.js Route Handlers, rulate ca funcții serverless pe Vercel. Nu există un
server separat.

### 2.3 Bază de date — Supabase (PostgreSQL)

Un singur fișier de migrare, [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql),
definește trei tabele: `profiles`, `verifications`, `cached_results`, plus
politicile RLS. Autentificarea e email/parolă prin Supabase Auth — fără
login social (Google/GitHub).

### 2.4 Hosting & deployment

| Serviciu | Rol |
|---|---|
| **Vercel** | Hosting Next.js, CDN, deploy pe push în `main`, previews pe PR, Web Analytics (fără cookie-uri) |
| **GitHub Actions** | `ci.yml` — type-check, lint, teste, build la fiecare push/PR pe `dev`/`main` |

### 2.5 API-uri externe

| API | Furnizor | Utilizare |
|---|---|---|
| Cloud Vision API | Google | OCR din screenshot-uri |
| Fact Check Tools API | Google | Strat 1 — fact-check-uri existente |
| Custom Search JSON API | Google | Strat 3 — surse oficiale |
| Gemini 2.0 Flash | Google | Sinteza raportului în limbaj natural |
| Tavily Search API | Tavily | Strat 2 (căutare full-web) + fallback strat 4 |
| NewsAPI.org *(opțional)* | NewsAPI | Sursă suplimentară strat 2 |
| Twitter/X Bearer API *(opțional)* | X Corp | Strat 4, dacă e configurat |

Straturile rulează **în paralel**, nu secvențial — fiecare are propriul
timeout și eșuează independent, ca o sursă căzută să nu blocheze raportul
întreg.

---

## 3. Structura reală a folderelor

```
Verifact/
├── .github/workflows/{ci,deploy}.yml
├── docs/                            # acest document, PRD, audit, troubleshooting, securitate
├── src/
│   ├── app/                         # App Router — toate rutele publice sunt în română
│   │   ├── api/
│   │   │   ├── verify/route.ts      # POST — endpoint-ul principal
│   │   │   ├── ocr/route.ts
│   │   │   ├── reports/[route.ts, [id]/route.ts]
│   │   │   └── user/{profile,usage,verifications}/route.ts
│   │   ├── cont/                    # autentificare + panou de cont (nu (auth)/(dashboard) separate)
│   │   ├── rapoarte/                # feed public
│   │   ├── transparenta/            # metodologia, pentru cititori
│   │   ├── misiune/  preturi/  open-source/  termeni/  confidentialitate/
│   │   └── layout.tsx               # include <Analytics /> (@vercel/analytics)
│   ├── components/
│   │   ├── ui/                      # Button, Input, Textarea, Card, Modal, Tabs, Callout, VerdictLabel
│   │   ├── verify/                  # VerifyTool, ReportView
│   │   ├── auth/                    # AuthPanel
│   │   └── layout/                  # Header, Footer, routes.ts (navigație + REPO_URL)
│   ├── lib/
│   │   ├── verification/
│   │   │   ├── orchestrator.ts      # coordonează straturile + agregarea
│   │   │   ├── layer1-factcheck.ts
│   │   │   ├── layer2-news.ts       # Tavily + NewsAPI opțional
│   │   │   ├── layer3-official.ts
│   │   │   ├── layer4-social.ts
│   │   │   ├── scoring.ts
│   │   │   ├── report-builder.ts
│   │   │   ├── db-operations.ts     # persistare + verificare/incrementare limite de utilizare
│   │   │   ├── cache.ts             # cache cu TTL 7 zile
│   │   │   ├── url-extract.ts       # extragere text din articol pentru input de tip URL
│   │   │   └── constants.ts
│   │   ├── ai/gemini.ts             # model implicit: gemini-2.0-flash
│   │   ├── ocr/                     # client Google Cloud Vision
│   │   ├── supabase/{client,server}.ts
│   │   ├── usage/limits.ts, tier-limits.ts
│   │   └── utils/rate-limit.ts
│   └── types/
├── supabase/migrations/001_initial_schema.sql
└── tests/unit/                      # tests/e2e/ e doar un placeholder, fără Playwright configurat
```

Nu există grupuri de rute `(auth)`/`(dashboard)` — autentificarea și istoricul
utilizatorului sunt pe `/cont`, nu pe o pagină `/dashboard` separată.

---

## 4. Schema bazei de date (reală)

```sql
-- profiles
id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
username TEXT UNIQUE
tier TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','business'))
verifications_count INTEGER DEFAULT 0
verifications_reset DATE DEFAULT CURRENT_DATE
created_at TIMESTAMPTZ DEFAULT NOW()

-- verifications
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
input_type TEXT CHECK (input_type IN ('text','screenshot','url'))
input_text TEXT NOT NULL
input_url TEXT
verdict TEXT CHECK (verdict IN ('true','false','partial','unclear'))
score INTEGER CHECK (score BETWEEN 0 AND 100)
report_json JSONB NOT NULL
is_public BOOLEAN DEFAULT FALSE
language TEXT DEFAULT 'ro' CHECK (language IN ('ro','en'))
processing_time INTEGER
created_at TIMESTAMPTZ DEFAULT NOW()

-- cached_results
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
content_hash TEXT UNIQUE NOT NULL
result_json JSONB NOT NULL
hits INTEGER DEFAULT 0
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

`verifications.user_id` e `ON DELETE SET NULL`: când un cont e șters, orice
raport public rămas devine automat anonim la nivel de bază de date, fără
un pas separat de "anonimizare". Politicile RLS: un utilizator vede propriile
verificări private, oricine vede verificările publice, doar owner-ul poate
șterge.

Nu există (încă) tabele `subscriptions`, `disputes`, `admin_actions` sau
`api_call_logs` — schema e intenționat mai simplă decât varianta explorată
pe branch-urile de Sprint 3, aliniată cu decizia de a nu avea un mecanism
activ de contestare, doar disclaimer-ul din [Termeni](/termeni).

---

## 5. Fluxul de date — de la input la raport

```
POST /api/verify
  ├── Validare input + rate limiting (10 cereri/min/IP)
  ├── Dacă userul e autentificat: verificare limită de tier (checkUsageLimit)
  ├── Input de tip URL: extragere text din articol (url-extract.ts)
  ├── verifyContent() — cele 4 straturi RULEAZĂ ÎN PARALEL
  │     └── fiecare are timeout propriu; eșecul unuia nu blochează restul
  ├── scoring.ts — combină rezultatele straturilor într-un scor 0–100
  ├── gemini.ts — sinteză AI a raportului (opțională; degradează la rezumat din surse dacă lipsește)
  ├── Salvare în Supabase (saveVerification) + incrementUsageCount, dacă nu e din cache
  └── Response { success, report }
```

---

## 6. Variabile de mediu

Vezi [`.env.example`](../.env.example) pentru lista completă și comentată —
inclusiv `TAVILY_API_KEY`, obligatorie pentru straturile 2 și 4.

---

## 7. CI/CD

`.github/workflows/ci.yml` rulează pe Node **22** (cerut explicit de
`@supabase/supabase-js` ≥ 2.110.8 prin propriul `engines.node`): type-check,
lint, teste unitare, build, la fiecare push/PR pe `dev` și `main`.

`.github/workflows/deploy.yml` rulează un build de verificare; deployul
efectiv de producție/preview e legat direct prin integrarea GitHub a
Vercel, nu prin acest workflow.

---

## 8. Decizii tehnice

| Decizie | Alternativă considerată | De ce |
|---|---|---|
| Next.js App Router | Pages Router / Vite+React | SSR pentru SEO, API routes incluse |
| Supabase | Firebase / Prisma+PG separat | Auth + DB + RLS într-un singur serviciu |
| CSS Modules | Tailwind / styled-components | Control total, zero dependențe de styling |
| Vercel | AWS / DigitalOcean | Zero config pentru Next.js, Analytics fără cookie-uri inclus |
| Gemini 2.0 Flash | GPT-4 | Se integrează direct cu Vision/Search API-urile Google deja folosite |
| Tavily pentru straturile 2/4 | Google Custom Search pentru tot | Căutare full-web, fără plafon de domenii |
