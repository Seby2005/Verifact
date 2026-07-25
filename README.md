# Verifact

**Trimiți o afirmație. Primești un verdict, un scor de încredere și sursele din spatele lui.**

Verifact este un instrument open-source de verificare a informației din presă
și social media, construit întâi pentru limba română. Nu e o cutie neagră
care îți spune ce să crezi — fiecare raport își arată sursele.

[![CI](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/Verifact/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Problema

O afirmație falsă circulă printr-un grup de WhatsApp în câteva minute.
Verificarea ei manuală ia jumătate de oră de căutat, iar până atunci a fost
deja redistribuită de zeci de ori. Verifact încearcă să reducă acel decalaj:
primești un text, un link sau un screenshot, și cauți în paralel exact acolo
unde ar căuta și o persoană atentă — fact-check-uri deja publicate, presă,
surse oficiale și postările originale — apoi întorci un verdict cu dovezile
atașate.

Citește mai multe despre motivația proiectului pe pagina [Misiune](/misiune).

## Cum funcționează verificarea

O cerere trece prin patru straturi de cercetare independente, **rulate în
paralel**:

| # | Strat | Ce caută |
|---|---|---|
| 1 | Fact-checking existent | Google Fact Check Tools API — verificări deja publicate de organizații de fact-checking |
| 2 | Presă și căutare generală | Tavily (căutare full-web) + opțional NewsAPI |
| 3 | Surse oficiale | Google Custom Search restrâns la domenii guvernamentale/instituționale |
| 4 | Declarații originale/sociale | Twitter/X (dacă e configurat), altfel Tavily ca fallback |

Fiecare strat are propriul timeout și **eșuează independent** — dacă o sursă
nu răspunde, raportul spune explicit care strat a lipsit, în loc să
pretindă că a fost verificat. Scorul e calculat din rezultatele straturilor;
un model Gemini 2.0 Flash scrie apoi rezumatul în limbaj natural, cu
validare împotriva halucinațiilor (sursele citate în text trebuie să existe
efectiv în lista de surse). Dacă modelul AI nu răspunde, raportul tot iese —
degradat la un rezumat generat direct din surse, nu aruncat.

Metodologia completă, inclusiv slăbiciunile ei cunoscute, e pe pagina
[Transparență](/transparenta) din aplicație și în
[`docs/VERIFICATION-AUDIT.md`](./docs/VERIFICATION-AUDIT.md).

## Funcționalități

- **Trei moduri de a trimite o verificare** — text, URL sau screenshot (OCR via Google Cloud Vision).
- **Rapoarte cu surse citate**, private implicit — devin publice doar dacă apeși explicit butonul de publicare.
- **Cont și niveluri de acces** — Supabase Auth (email/parolă); Free 10 verificări/lună, Pro 200, Business 2000 (activare momentan prin contact direct — vezi [Prețuri](/preturi)).
- **Cache pe rezultate** (TTL 7 zile), ca aceeași afirmație să nu reinterogheze API-urile plătite de fiecare dată.
- **Row Level Security** în Supabase — fiecare utilizator vede doar ce e al lui.

## Stack tehnologic

| Strat | Alegere |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript strict, CSS Modules |
| Backend | Next.js Route Handlers |
| Bază de date & auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| AI | Gemini 2.0 Flash |
| OCR | Google Cloud Vision |
| Surse de cercetare | Google Fact Check Tools, Google Custom Search, Tavily, NewsAPI (opțional), Twitter/X (opțional) |
| Testare | Jest (unit) |
| CI/CD | GitHub Actions + Vercel |

Fără librărie de componente — sistemul de design e construit pe CSS Modules,
intenționat, ca să rămână fără dependențe și complet sub controlul
proiectului. Detaliile sunt în [`DESIGN.md`](./DESIGN.md).

## Rulare locală

### Cerințe

- **Node.js 22+** și npm 10+ (`@supabase/supabase-js` cere explicit Node 22)
- Un proiect [Supabase](https://supabase.com) gratuit, sau CLI-ul Supabase pentru un stack local
- Chei API pentru straturile de cercetare — vezi tabelul de mai jos

### Setup

```bash
git clone https://github.com/Seby2005/Verifact.git
cd Verifact
npm install
cp .env.example .env.local
npm run dev
```

Completează `.env.local` și repornește serverul. Aplicația rulează la
http://localhost:3000.

### Variabile de mediu

Copiază `.env.example`. **Nu comite niciodată `.env.local`** — e deja în
`.gitignore`.

| Variabilă | Obligatorie | Ce face |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | da | URL-ul proiectului Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | da | Cheie publică, respectă RLS. Sigură în browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | da | **Ocolește toate politicile RLS.** Doar server-side — nu o expune niciodată în browser. |
| `GEMINI_API_KEY` | da | Rezumatele AI ale rapoartelor. Fără ea, aplicația tot întoarce verdicte, cu un rezumat generat direct din surse. |
| `GOOGLE_FACT_CHECK_API_KEY` | da | Stratul 1. |
| `TAVILY_API_KEY` | da | Stratul 2 (căutare full-web) și fallback-ul stratului 4. |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | da | Stratul 3. |
| `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` | da | ID-ul motorului de căutare (`cx`) din Programmable Search Engine — nu o cheie API. Ușor de confundat; stratul 3 eșuează silențios dacă e greșit. |
| `GOOGLE_CLOUD_API_KEY` | da | Cloud Vision OCR pentru screenshot-uri. |
| `NEWS_API_KEY` | nu | Sursă suplimentară pentru stratul 2. |
| `TWITTER_BEARER_TOKEN` | nu | Stratul 4. Fără ea, se folosește Tavily ca fallback. |
| `NEXT_PUBLIC_APP_URL` | da | URL canonic. |

### Supabase local (recomandat)

```bash
npm install -g supabase
supabase start        # Postgres, Auth, Storage, Studio — necesită Docker
supabase db reset     # aplică supabase/migrations/
supabase stop
```

Îndreaptă `NEXT_PUBLIC_SUPABASE_URL` către URL-ul local afișat de
`supabase start` și repornește `npm run dev`.

### Verificări

```bash
npm run type-check   # TypeScript
npm run lint         # ESLint
npm test             # Jest
npm run build        # build de producție
```

## Structura proiectului

```
src/
├── app/                       # Next.js App Router (rute în română)
│   ├── api/                   # route handlers (verify, ocr, reports, user/*)
│   ├── cont/                  # autentificare + panou de cont
│   ├── rapoarte/              # feed de rapoarte publice
│   ├── transparenta/          # metodologia, pentru cititori
│   ├── misiune/  preturi/  open-source/  termeni/  confidentialitate/
├── components/
│   ├── ui/                    # primitive de design (Button, Input, Modal, Callout, VerdictLabel…)
│   ├── verify/                # VerifyTool, ReportView
│   ├── auth/                  # AuthPanel
│   └── layout/                # Header, Footer, routes.ts
├── lib/
│   ├── verification/          # ← algoritmul
│   │   ├── orchestrator.ts    # rulează straturile, agregă, construiește raportul
│   │   ├── layer1-factcheck.ts … layer4-social.ts
│   │   ├── scoring.ts         # ponderi, scor → verdict
│   │   ├── report-builder.ts  # asamblează și deduplică sursele
│   │   ├── db-operations.ts   # persistare + limite de utilizare
│   │   └── cache.ts           # cache cu TTL de 7 zile
│   ├── ai/                    # client Gemini + prompturi
│   ├── ocr/  supabase/  usage/  utils/
├── types/
supabase/migrations/           # schema SQL, politici RLS
tests/unit/
docs/                          # arhitectură, audit de verificare, troubleshooting, securitate
```

Pornește din
[`src/lib/verification/orchestrator.ts`](./src/lib/verification/orchestrator.ts)
— e drumul cel mai scurt spre înțelegerea a ce face de fapt produsul.

## Starea proiectului

În dezvoltare activă, pre-lansare. Fii direct despre stadiul curent:
`docs/VERIFICATION-AUDIT.md` documentează un audit integral al algoritmului,
inclusiv ce straturi nu întorc încă semnal util și de ce — dacă evaluezi
proiectul, citește-l primul. `docs/TROUBLESHOOTING.md` acoperă problemele
frecvente de configurare.

## Contribuții

1. Citește [CONTRIBUTING.md](./CONTRIBUTING.md) pentru convenții de branch, commit și PR.
2. Deschide un issue înainte de o schimbare substanțială, ca să nu se dubleze efortul.
3. Ramifică din `dev`, nu din `main`.
4. Asigură-te că `npm run type-check`, `npm run lint`, `npm test` și `npm run build` trec toate.
5. Deschide un PR către `dev` descriind ce ai schimbat și cum ai verificat.

Ai găsit o problemă de securitate? Nu deschide un issue public — raporteaz-o
privat prin GitHub Security Advisories (detalii în [`SECURITY.md`](./SECURITY.md)).

## Disclaimer

Rapoartele Verifact sunt generate cu ajutorul AI și au caracter informativ —
nu înlocuiesc judecata editorială. La dubiu, urmează sursele citate, nu
verdictul. Detalii complete în [Termeni și condiții](/termeni).

## Licență

[MIT](./LICENSE)
