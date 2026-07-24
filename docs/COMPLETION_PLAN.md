# Plan de finalizare — Verifact

**Data:** 2026-07-24
**Autor:** Claude, pe baza unui audit direct de cod (nu pe baza rapoartelor Gemini)

---

## 1. Ce am verificat direct (nu doar citit)

- `npm run type-check`, `npm run lint`, `npm test` (110/110 teste), `npm run build` — toate trec curat.
- Serverul pornește și `/`, `/pricing`, `/transparency`, `/api/ocr` răspund corect la cereri reale.
- Am citit efectiv codul orchestratorului de verificare, toate cele 4 straturi, clientul Gemini, `/api/verify`, `AuthContext` și formularele de login/register.

**Concluzie importantă:** algoritmul **nu e hardcodat**. Fiecare strat face `fetch()` real către un API extern real (Google Fact Check Tools, Google Custom Search, NewsAPI, Twitter opțional), cu chei citite din `process.env`, cu timeout și fallback pe strat. Clientul Gemini are chiar și o verificare anti-halucinație (respinge/loghează linkuri citate care nu apar în sursele reale). `/api/verify` verifică autentificarea, limitele de tier, rulează orchestratorul real și salvează în Supabase. Autentificarea (`signInWithPassword`, `signUp`, `signInWithOAuth`) e Supabase real, nu mock.

**Deci problema nu e "cod fals"**. Problema e că nimeni n-a rulat niciodată acest cod cu chei API reale, ca să confirme că funcționează cap-coadă. Codul e scris corect, dar neverificat live — exact genul de gol pe care l-am tot găsit în această conversație.

## 2. Bug-uri reale găsite și reparate (deja commise)

1. `src/types/database.ts` — lipseau `Views`/`Enums`/`CompositeTypes`, rupea tiparea la apelul RPC de ștergere GDPR.
2. `src/lib/user/gdpr.ts` — eroare de compilare la `.rpc()` pentru ștergere cont.
3. `tsconfig.json` — lipsea `target`, plus includea greșit funcțiile Supabase (Deno) în verificarea TS principală.
4. `src/app/layout.tsx` — fontul Inter se încărca prin `next/font/google` (dependență de rețea la build); mutat pe `@fontsource/inter`.
5. `.env.example` — lipseau `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID` (folosit de stratul 3) și `TWITTER_BEARER_TOKEN` (opțional, strat 4). Adăugate acum.

## 3. Ce NU am putut verifica (am nevoie de tine pentru asta)

Nu am și nu trebuie să am acces la cheile tale reale. Ca să confirmăm că aplicația chiar merge, TU trebuie să:

1. Creezi un proiect Supabase gratuit (supabase.com) și rulezi migrațiile din `supabase/migrations/` (în ordine, 0001→0009) — fie cu Supabase CLI (`supabase link` + `supabase db push`), fie copiind fiecare fișier `.sql` în SQL Editor din dashboard, în ordine.
2. Obții cheile: Google Cloud Vision, Google Fact Check Tools API (gratuit), Google Custom Search API + **două** Search Engine ID-uri (unul general, unul restricționat la `.gov.ro`/`.europa.eu`/`who.int`/`un.org` pentru stratul 3), Gemini API key. NewsAPI și Twitter Bearer Token sunt opționale (au fallback).
3. Completezi `.env.local` (copiat din `.env.example`, care acum are toate variabilele reale folosite de cod).
4. Rulezi `npm run dev`, îți creezi un cont real, și trimiți o verificare reală.

Dacă la pasul 4 ceva pică, avem mesaje de eroare clare (nu erori ascunse) — trimite-mi eroarea exactă și o reparăm împreună, cu dovadă, nu presupuneri.

## 4. Ce a mai rămas de făcut — împărțit pe responsabil

### 4.1 Eu (Claude) — lucruri care cer judecată / risc de a strica ceva

- Te ghidez prin setup-ul Supabase + chei API (pasul 3 de mai sus) și verific împreună cu tine primul rulaj real.
- Repar orice bug apare la prima rulare reală (autentificare, RLS policies, formatul răspunsului de la un API extern care nu se potrivește cu ce așteaptă codul etc.).
- Revizuiesc RLS policies din `0009_rls_policies.sql` — zonă sensibilă (securitate date), nu o las pe mâna unui agent fără verificare.
- Fac code review la orice trimite Gemini înainte să-l consideri „gata" — exact rolul care a lipsit până acum.

### 4.2 Gemini (Antigravity) — volum mare, bine specificat, mecanic

Design-ul are un gol real: ~19 fișiere amestecă `style={{...}}` inline cu CSS Modules, inconsistent cu restul proiectului (care are deja un design system solid în `globals.css` + CSS Modules per componentă). E treabă de volum, repetitivă, cu risc mic dacă verific eu după — perfectă pentru Gemini.

Vezi promptul exact în secțiunea 5, task **G1**.

### 4.3 Tu

- Setup Supabase + chei API (secțiunea 3).
- Decizi, după ce vezi primul rulaj real, dacă designul actual (odată curățat de Gemini) e „ce vrei" sau dacă vrei o direcție vizuală diferită — eu pot da un review de design (design-critique) după ce ai un build viu de arătat.

---

## 5. Prompturi gata de copiat pentru Gemini

**Regulă obligatorie pentru toate task-urile de mai jos** (pune-o și tu, verbal, dacă Gemini "uită"): *după fiecare task, cere-i explicit output-ul de la `npm run build`, `npm run lint`, `npm test` și `git diff --stat` — nu accepta un "gata" fără el.*

### G1 — Curăță stilurile inline, mută-le în CSS Modules

```
Task: Elimină stilurile inline (style={{...}}) din următoarele fișiere și
mută-le în fișiere CSS Module dedicate, respectând convenția deja folosită
în proiect (fiecare componentă are propriul ComponentName.module.css,
importat ca `styles` — vezi src/components/ui/Button/ ca exemplu de referință).
Folosește DOAR variabilele CSS deja definite în src/app/globals.css
(--color-*, --font-*, --radius-*, --shadow-*, --transition-*) — nu introduce
valori hardcodate noi (hex colors, px arbitrare) fără să verifici mai întâi
dacă există deja un token echivalent.

Fișiere de curățat (au style={{ inline momentan):
- src/app/(auth)/confirm/page.tsx
- src/app/(auth)/reset-password/page.tsx
- src/app/(dashboard)/dashboard/DashboardClient.tsx
- src/app/(dashboard)/settings/page.tsx
- src/app/page.tsx
- src/app/transparency/page.tsx
- src/components/dashboard/UsageCard/index.tsx
- src/components/layout/Footer/index.tsx
- src/components/report/ReportCard/index.tsx
- src/components/report/ScoreBreakdown/index.tsx
- src/components/ui/Avatar/index.tsx
- src/components/ui/ProgressBar/index.tsx
- src/components/ui/Skeleton/index.tsx
- src/components/ui/Tabs/index.tsx
- src/components/verify/ProgressTracker/index.tsx
- src/components/verify/ScreenshotUpload/index.tsx

NU atinge src/app/(dev)/components/page.tsx (pagină internă de dezvoltare,
stilurile inline sunt acceptabile acolo) și src/app/reports/[id]/opengraph-image.tsx
(generează o imagine, folosește stiluri inline din motive tehnice specifice
Next.js OG Image — e corect așa, nu-l modifica).

Lucrează câte 3-4 fișiere pe task, nu toate deodată. După fiecare grup:
1. Rulează npm run build, npm run lint, npm test și lipește output-ul complet.
2. Rulează git diff --stat pentru fișierele modificate și lipește-l.
3. Abia apoi treci la următorul grup.

Nu marca task-ul ca terminat dacă build-ul sau testele nu trec.
```

### G2 — Audit responsive (după G1)

```
Task: Deschide aplicația (npm run dev) la 3 lățimi: 375px (mobil), 768px
(tabletă), 1280px (desktop) pentru fiecare rută publică: /, /pricing,
/transparency, /reports, /login, /register. Pentru fiecare combinație
rută×lățime, notează orice problemă vizuală concretă (text tăiat, elemente
suprapuse, scroll orizontal nedorit, butoane greu de apăsat pe mobil).
Nu presupune că e totul bine doar pentru că pagina se randează — verifică
efectiv la fiecare lățime.

Livrează un fișier docs/audit/RESPONSIVE-AUDIT.md cu lista de probleme găsite,
apoi repară-le pe rând (commit separat per rută), rulând build+lint+test
după fiecare rută reparată.
```

### G3 — Acoperire teste pentru orchestrator (opțional, după ce ai chei API reale)

```
Task: src/lib/verification/orchestrator.ts nu are teste unitare proprii
(doar layer1 și scoring au). Scrie tests/unit/orchestrator.test.ts care
mock-uiește runLayer1-4 (jest.mock) și testează:
- toate straturile reușesc → raport complet
- 1-2 straturi eșuează → raportul se generează totuși cu straturile rămase
- toate straturile eșuează → aruncă eroarea ALL_LAYERS_FAILED
- cache hit → returnează direct din cache, fără să mai apeleze straturile

Nu face request-uri reale către API-uri externe în teste — totul mock-uit.
Rulează npm test și lipește output-ul înainte să spui că task-ul e gata.
```

---

## 6. Pasul următor concret (acum)

Ordinea contează — restul depinde de asta:

1. **Tu:** creează proiectul Supabase și rulează migrațiile (secțiunea 3, pașii 1-3).
2. **Tu:** trimite-mi când ai `.env.local` completat (fără să-mi dai cheile în clar — doar spune-mi "gata") și pornim împreună primul test real: creezi un cont, trimiți o verificare, vedem ce iese.
3. **În paralel, tu:** dai lui Gemini promptul **G1** de mai sus — e independent de Supabase, poate lucra acum.
