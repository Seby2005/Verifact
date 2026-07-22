# ARCHITECTURE.md
# Arhitectura Tehnică — AI Fact-Checker

**Versiune:** 0.1  
**Data:** 2026-07-22  
**Stack principal:** Next.js 14 · TypeScript · Supabase · Vercel · Gemini API

---

## 1. Vizualizare de Ansamblu

```
┌────────────────────────────────────────────────────────────────┐
│                        UTILIZATOR                              │
│              (browser / mobile browser)                        │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                   VERCEL (Hosting + CDN)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              NEXT.JS 14 (App Router)                     │  │
│  │                                                          │  │
│  │  ┌─────────────┐   ┌─────────────────────────────────┐  │  │
│  │  │   Frontend  │   │         API Routes              │  │  │
│  │  │  (React +   │   │  /api/verify                    │  │  │
│  │  │  CSS Mod.)  │   │  /api/ocr                       │  │  │
│  │  │             │   │  /api/auth                      │  │  │
│  │  └─────────────┘   │  /api/reports                   │  │  │
│  │                    └────────────┬────────────────────┘  │  │
│  └─────────────────────────────────┼────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────┘
                                     │
              ┌──────────────────────┼────────────────────────┐
              │                      │                        │
              ▼                      ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐   ┌──────────────────┐
│   SUPABASE      │    │   GOOGLE APIS       │   │   GEMINI API     │
│                 │    │                     │   │                  │
│  - Auth         │    │  - Vision (OCR)     │   │  - gemini-2.0    │
│  - PostgreSQL   │    │  - Fact Check Tools │   │    flash         │
│  - Storage      │    │  - Custom Search    │   │  - Analiză text  │
│  - Row Level    │    │  - News API         │   │  - Raport final  │
│    Security     │    │                     │   │                  │
└─────────────────┘    └─────────────────────┘   └──────────────────┘
```

---

## 2. Stack Tehnologic Complet

### 2.1 Frontend

| Tehnologie | Versiune | Rol | Motivație alegere |
|---|---|---|---|
| **Next.js** | 14+ (App Router) | Framework principal | SSR pentru SEO, API Routes built-in, Vercel native |
| **TypeScript** | 5+ | Limbaj de programare | Type safety, mai puține bug-uri, autocompletare mai bună |
| **CSS Modules** | built-in Next.js | Styling | Izolare stiluri per componentă, fără conflicte |
| **React** | 18+ | UI Library | Inclusă în Next.js |

> **De ce Next.js și nu alte opțiuni?**
> - Rapoartele publice trebuie să fie indexate de Google (SEO) → Server-Side Rendering obligatoriu
> - API routes built-in → nu avem nevoie de server separat pentru v1
> - Deploy one-click pe Vercel (creat de aceeași echipă)
> - Schema markup pentru fact-check-uri funcționează cel mai bine cu SSR

### 2.2 Backend / API

| Tehnologie | Rol |
|---|---|
| **Next.js API Routes** | Endpoint-uri REST pentru verificare, auth, rapoarte |
| **Supabase** | Baza de date (PostgreSQL), autentificare, storage |
| **Vercel Edge Functions** | Funcții serverless distribuite global (latență mică) |

### 2.3 Baza de Date — Supabase (PostgreSQL)

> **De ce Supabase?**
> - PostgreSQL managed (nu trebuie să instalezi/menții nimic)
> - Auth built-in (Google OAuth, email/password) — economisim 2 săptămâni de dezvoltare
> - Row Level Security (RLS) — securitate la nivel de bază de date
> - SDK JavaScript simplu
> - Tier gratuit generos (500MB DB, 50.000 auth users)

### 2.4 Hosting & Deployment

| Serviciu | Rol |
|---|---|
| **Vercel** | Hosting Next.js, CDN global, preview deployments |
| **GitHub** | Repository sursă, CI/CD trigger, code review |
| **GitHub Actions** | CI pipeline (teste + lint la fiecare PR) |

### 2.5 API-uri Externe

| API | Provider | Utilizare | Cost estimat |
|---|---|---|---|
| **Cloud Vision API** | Google | OCR din screenshot-uri | $1.50/1000 req |
| **Fact Check Tools API** | Google | Baza de fact-check-uri existente | **GRATUIT** |
| **Custom Search JSON API** | Google | Căutare generală + surse gov | $5/1000 req (primele 100/zi gratuit) |
| **Gemini API** | Google | Analiză text, raport final | ~$0.002/req (gemini-2.0-flash) |
| **NewsAPI.org** | NewsAPI | Agregare știri convenționale | Gratuit dev, $449/lună prod |
| **SerpAPI** | SerpAPI | Alternativă căutare avansată | $50/lună (100 req/zi gratuit) |

> **Strategie costuri API pentru v1:**
> - Maxim 10 verificări gratuite/utilizator/lună → limităm expunerea la cost
> - Caching agresiv: dacă aceeași afirmație a mai fost verificată, returnăm cached
> - Strat 1 (Fact Check API) = gratuit → rulăm întotdeauna
> - Straturile 2-4 = costisitoare → rulăm paralel, nu secvențial (reduce latența)

---

## 3. Structura Folderelor Proiect

```
fact-checker/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Teste + lint la fiecare PR
│   │   └── deploy.yml              # Deploy preview pe PR, prod pe main
│   └── PULL_REQUEST_TEMPLATE.md    # Template pentru descrierea PR-urilor
│
├── .agents/
│   ├── GEMINI.md                   # Instrucțiuni globale pentru agent Antigravity
│   └── rules/
│       ├── coding-style.md         # TypeScript strict, naming conventions
│       ├── git-workflow.md         # Branch naming, commit messages
│       ├── testing.md              # Ce trebuie testat și cum
│       └── no-shortcuts.md         # Nicio funcție placeholder sau TODO neimplementat
│
├── docs/
│   ├── PRD.md                      # Acest document — cerințe produs
│   ├── ARCHITECTURE.md             # Arhitectura tehnică (acest document)
│   ├── TASKS.md                    # Backlog și sprints
│   └── CHANGELOG.md                # Istoric versiuni
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Grup rute autentificare
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/            # Rute protejate (necesită login)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Istoricul verificărilor + usage
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── [id]/               # Raport individual (public/privat)
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx            # Feed rapoarte publice
│   │   │
│   │   ├── transparency/
│   │   │   └── page.tsx            # Pagina algoritmului + open source
│   │   │
│   │   ├── api/                    # API Routes (backend)
│   │   │   ├── verify/
│   │   │   │   └── route.ts        # POST /api/verify — endpoint principal
│   │   │   ├── ocr/
│   │   │   │   └── route.ts        # POST /api/ocr — procesare screenshot
│   │   │   ├── reports/
│   │   │   │   ├── route.ts        # GET /api/reports — lista rapoarte
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # GET/DELETE /api/reports/[id]
│   │   │   └── auth/
│   │   │       └── [...supabase]/
│   │   │           └── route.ts    # Auth callback OAuth
│   │   │
│   │   ├── layout.tsx              # Root layout (nav, footer)
│   │   ├── page.tsx                # Homepage (landing + verificator)
│   │   ├── globals.css             # CSS global (variabile, reset)
│   │   └── not-found.tsx           # Pagina 404
│   │
│   ├── components/                 # Componente React reutilizabile
│   │   ├── ui/                     # Componente primitive (Button, Input, etc.)
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Badge/              # Verdicts badge (Adevărat/Fals/Parțial)
│   │   │   └── Modal/
│   │   │
│   │   ├── verify/                 # Componente specifice verificării
│   │   │   ├── VerifyForm/         # Formularul principal (screenshot/text/url)
│   │   │   ├── ScreenshotUpload/   # Drag & drop upload
│   │   │   ├── ProgressTracker/    # Progres în timp real al verificării
│   │   │   └── ReportCard/         # Card compact raport în feed
│   │   │
│   │   ├── report/                 # Componente pentru pagina de raport
│   │   │   ├── VerdictHeader/      # Scor + verdict vizual
│   │   │   ├── SourcesList/        # Lista surselor citate
│   │   │   ├── LayerDetails/       # Detalii pe fiecare strat de verificare
│   │   │   └── ShareButtons/       # Butoane partajare
│   │   │
│   │   ├── layout/                 # Layout-uri globale
│   │   │   ├── Navbar/
│   │   │   ├── Footer/
│   │   │   └── Sidebar/
│   │   │
│   │   └── dashboard/              # Componente dashboard utilizator
│   │       ├── HistoryList/
│   │       └── UsageStats/
│   │
│   ├── lib/                        # Logică de business și utilități
│   │   ├── verification/           # Algoritmul de verificare
│   │   │   ├── orchestrator.ts     # Coordonează toate straturile
│   │   │   ├── layer1-factcheck.ts # Stratul 1: Google Fact Check API
│   │   │   ├── layer2-news.ts      # Stratul 2: Știri convenționale
│   │   │   ├── layer3-official.ts  # Stratul 3: Surse guvernamentale
│   │   │   ├── layer4-social.ts    # Stratul 4: Social media
│   │   │   ├── scoring.ts          # Calculul scorului final
│   │   │   └── report-builder.ts   # Construiește raportul final
│   │   │
│   │   ├── ai/
│   │   │   ├── gemini.ts           # Client Gemini API
│   │   │   └── prompts.ts          # Toate prompt-urile pentru Gemini
│   │   │
│   │   ├── ocr/
│   │   │   └── vision.ts           # Client Google Cloud Vision
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts           # Client Supabase (browser)
│   │   │   ├── server.ts           # Client Supabase (server)
│   │   │   └── middleware.ts       # Auth middleware
│   │   │
│   │   ├── cache/
│   │   │   └── redis.ts            # Cache pentru verificări (v2 — Upstash Redis)
│   │   │
│   │   └── utils/
│   │       ├── language-detect.ts  # Detectare limbă RO/EN
│   │       ├── url-scraper.ts      # Scraping articol din URL
│   │       └── rate-limit.ts       # Rate limiting per IP/user
│   │
│   ├── hooks/                      # React custom hooks
│   │   ├── useVerification.ts      # Hook pentru procesul de verificare
│   │   └── useAuth.ts              # Hook pentru starea de autentificare
│   │
│   └── types/                      # TypeScript type definitions
│       ├── verification.ts         # Tipuri pentru verificare și rapoarte
│       ├── user.ts                 # Tipuri pentru utilizatori
│       └── api.ts                  # Tipuri pentru API responses
│
├── tests/
│   ├── unit/                       # Teste unitare (Jest)
│   │   ├── scoring.test.ts
│   │   ├── layer1.test.ts
│   │   └── report-builder.test.ts
│   └── e2e/                        # Teste end-to-end (Playwright)
│       ├── verify-text.spec.ts
│       └── verify-screenshot.spec.ts
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                # Open Graph image pentru social sharing
│   └── robots.txt
│
├── .env.local                      # Variabile de mediu (NU se commitează)
├── .env.example                    # Template variabile de mediu (se commitează)
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── CONTRIBUTING.md                 # Ghid pentru contribuitori open source
```

---

## 4. Schema Bazei de Date

### Tabel: `users` (gestionat de Supabase Auth)
```sql
-- Gestionat automat de Supabase Auth
id          UUID PRIMARY KEY
email       TEXT UNIQUE NOT NULL
created_at  TIMESTAMPTZ
```

### Tabel: `profiles` (extensie profil utilizator)
```sql
id              UUID REFERENCES auth.users PRIMARY KEY
username        TEXT UNIQUE
tier            TEXT DEFAULT 'free' -- 'free' | 'pro' | 'business'
verifications_count  INTEGER DEFAULT 0
verifications_reset  DATE DEFAULT CURRENT_DATE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Tabel: `verifications` (rapoartele de fact-checking)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES profiles(id)  -- NULL pentru anonim
input_type      TEXT NOT NULL  -- 'text' | 'screenshot' | 'url'
input_text      TEXT NOT NULL  -- textul extras/introdus
input_url       TEXT           -- URL dacă input_type = 'url'
verdict         TEXT NOT NULL  -- 'true' | 'false' | 'partial' | 'unclear'
score           INTEGER        -- 0-100
report_json     JSONB          -- raportul complet în format JSON
is_public       BOOLEAN DEFAULT FALSE
language        TEXT DEFAULT 'ro'  -- 'ro' | 'en'
processing_time INTEGER        -- milisecunde
created_at      TIMESTAMPTZ DEFAULT NOW()

-- Indexuri pentru performanță
CREATE INDEX idx_verifications_user_id ON verifications(user_id);
CREATE INDEX idx_verifications_public ON verifications(is_public, created_at DESC);
CREATE INDEX idx_verifications_verdict ON verifications(verdict);
```

### Tabel: `cached_results` (cache pentru verificări similare)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
content_hash    TEXT UNIQUE NOT NULL  -- hash SHA256 al textului verificat
result_json     JSONB NOT NULL
hits            INTEGER DEFAULT 0
expires_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Row Level Security (RLS) policies
```sql
-- Un utilizator poate vedea doar propriile verificări private
-- Oricine poate vedea verificările publice
-- Numai utilizatorul owner poate șterge propriile verificări
```

---

## 5. Fluxul de Date — De la Input la Raport

```
UTILIZATOR UPLOADEAZĂ SCREENSHOT
            │
            ▼
POST /api/ocr
  └── Google Cloud Vision API
  └── Returnează text extras + confidence score
            │
            ▼
POST /api/verify
  ├── Validare input (rate limit, lungime text)
  ├── Detectare limbă (RO/EN)
  ├── Verificare cache (aceeași afirmație mai verificată?)
  │     └── HIT: returnează cached result instant
  │     └── MISS: continuă procesarea
  │
  ├── PROCESARE PARALELĂ (toate 4 straturi simultan):
  │   ├── [Thread 1] layer1-factcheck.ts → Google Fact Check API
  │   ├── [Thread 2] layer2-news.ts → NewsAPI + Google Custom Search
  │   ├── [Thread 3] layer3-official.ts → Gov sites search
  │   └── [Thread 4] layer4-social.ts → Twitter/X API
  │
  ├── AGGREGARE REZULTATE
  │   └── scoring.ts → calculează scor ponderat
  │
  ├── GENERARE RAPORT AI
  │   └── gemini.ts → prompt cu toate rezultatele → raport final
  │
  ├── SALVARE ÎN DB (Supabase)
  │   └── verifications table + actualizare counter utilizator
  │
  └── RETURNARE RĂSPUNS
        └── Raport JSON complet → frontend îl afișează
```

---

## 6. Variabile de Mediu Necesare

```bash
# .env.local (template — nu commitați valorile reale!)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx  # Doar server-side!

# Google APIs
GOOGLE_CLOUD_API_KEY=AIzaxxxxx          # Cloud Vision OCR
GOOGLE_FACT_CHECK_API_KEY=AIzaxxxxx     # Fact Check Tools API
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaxxxxx # Custom Search
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=xxxxx

# Gemini
GEMINI_API_KEY=AIzaxxxxx

# News API
NEWS_API_KEY=xxxxx

# App
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
NEXTAUTH_SECRET=xxxxx   # string random 32+ caractere
```

---

## 7. GitHub Actions — CI/CD Pipeline

### `.github/workflows/ci.yml`
```yaml
# Se rulează la fiecare Push și Pull Request
name: CI

on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]

jobs:
  test-and-lint:
    runs-on: ubuntu-latest
    steps:
      - Checkout cod
      - Setup Node.js 20
      - Instalare dependențe (npm ci)
      - TypeScript check (tsc --noEmit)
      - Lint (eslint)
      - Teste unitare (jest)
      - Build (next build)  ← verifică că nu se sparge
```

### `.github/workflows/deploy.yml`
```yaml
# Deploy automat pe Vercel
# - La PR: deploy pe URL preview unic (ex: fact-checker-pr-42.vercel.app)
# - La merge în main: deploy în producție
```

---

## 8. Decizii Tehnice și Justificări

| Decizie | Alternativă considerată | De ce am ales această variantă |
|---|---|---|
| Next.js App Router | Pages Router / Vite+React | SEO (SSR), API routes, mai modern |
| Supabase | Firebase / Prisma+PG | Auth + DB + Storage într-un singur serviciu, simplu |
| CSS Modules | Tailwind / Styled Components | Control total, fără dependențe extra, conform guideline |
| Vercel | AWS / DigitalOcean | Zero config pentru Next.js, preview deployments, gratuit |
| Gemini API | OpenAI GPT-4 | Proprietar Google → se integrează mai bine cu Vision/Search API |
| TypeScript strict | JavaScript | Previne bug-uri, autocompletare mai bună pentru agent |
