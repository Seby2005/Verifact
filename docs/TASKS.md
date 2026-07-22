# TASKS.md
# Backlog & Sprints — AI Fact-Checker

**Metodologie:** Sprints de 1 săptămână  
**Notă:** Fiecare task este formulat ca instrucțiune directă pentru agentul Antigravity

---

## 🏁 Sprint 0 — Setup & Infrastructură (Zilele 1-3)
*Scop: Proiectul există, se deployează, mediul de lucru este complet configurat*

### S0-1 · Inițializare proiect Next.js
- [ ] Creează proiect Next.js 14 cu App Router și TypeScript strict în directorul curent
- [ ] Configurează `tsconfig.json` cu `strict: true` și path aliases (`@/` → `src/`)
- [ ] Adaugă `.gitignore` complet pentru Node.js/Next.js
- [ ] Creează `README.md` cu titlu placeholder și badge-uri (CI status, license MIT)
- [ ] Creează `.env.example` cu toate variabilele de mediu necesare (fără valori reale)
- [ ] **Criteriu de acceptare:** `npm run dev` pornește fără erori pe `localhost:3000`

### S0-2 · Setup GitHub Repository
- [ ] Creează structura de foldere completă conform `docs/ARCHITECTURE.md`
- [ ] Adaugă `CONTRIBUTING.md` (ghid pentru contribuitori open source)
- [ ] Adaugă `LICENSE` (MIT)
- [ ] Creează `.github/PULL_REQUEST_TEMPLATE.md` cu template standard
- [ ] **Criteriu de acceptare:** Structura folderelor există și este commitată

### S0-3 · GitHub Actions CI/CD
- [ ] Creează `.github/workflows/ci.yml` cu: checkout, setup Node 20, `npm ci`, TypeScript check, ESLint, Jest, `next build`
- [ ] Creează `.github/workflows/deploy.yml` pentru Vercel preview + production deploy
- [ ] Configurează ESLint cu regulile Next.js recomandate
- [ ] Adaugă Jest și configurează `jest.config.ts` pentru TypeScript
- [ ] **Criteriu de acceptare:** CI rulează cu succes la push pe branch `dev`

### S0-4 · Setup Supabase
- [ ] Creează schema SQL pentru tabelele `profiles`, `verifications`, `cached_results` (conform `docs/ARCHITECTURE.md`)
- [ ] Configurează Row Level Security (RLS) policies pentru fiecare tabel
- [ ] Creează `src/lib/supabase/client.ts` (browser client)
- [ ] Creează `src/lib/supabase/server.ts` (server client pentru API routes)
- [ ] Creează `src/lib/supabase/middleware.ts` pentru protecția rutelor autentificate
- [ ] Adaugă `middleware.ts` la root-ul proiectului
- [ ] **Criteriu de acceptare:** Conexiunea la Supabase funcționează din API route de test

### S0-5 · Design System de bază
- [ ] Creează `src/app/globals.css` cu variabilele CSS (culori, fonturi, spacing)
- [ ] Paleta de culori: alb (#FFFFFF), gri (#F8F9FA, #E9ECEF, #6C757D), albastru principal (#2563EB), verde succes (#16A34A), roșu eroare (#DC2626), galben avertizare (#D97706)
- [ ] Importă fontul `Inter` de la Google Fonts
- [ ] Creează componentele UI primitive: `Button`, `Input`, `Card`, `Badge`, `Modal` în `src/components/ui/`
- [ ] Fiecare componentă are propriul CSS Module (ex: `Button.module.css`)
- [ ] **Criteriu de acceptare:** Componentele UI se randează corect în Storybook sau pagina de test

---

## 🖥️ Sprint 1 — Landing Page & Input (Zilele 4-10)
*Scop: Utilizatorul poate ajunge pe site, poate introduce conținut și pornește o verificare*

### S1-1 · Homepage — Hero Section
- [ ] Creează `src/app/page.tsx` cu layout: hero section + formularul de verificare
- [ ] Hero: titlu principal (H1), subtitlu, statistici animate (ex: "X verificări făcute astăzi")
- [ ] Design: light mode, curat, profesional — inspirat din design jurnalistic
- [ ] Fully responsive (mobile-first): funcționează pe ecrane de la 320px
- [ ] **Criteriu de acceptare:** Pagina se încarcă în sub 2s (Lighthouse Performance > 90)

### S1-2 · Componenta de Upload Screenshot
- [ ] Creează `src/components/verify/ScreenshotUpload/` cu drag & drop
- [ ] Acceptă: JPEG, PNG, WEBP, maxim 10MB
- [ ] Preview al imaginii uploadate în interfață
- [ ] Afișează loading state în timp ce se procesează
- [ ] Validare client-side: tipul fișierului, dimensiunea maximă, mesaje de eroare clare
- [ ] **Criteriu de acceptare:** Utilizatorul poate uploada un screenshot și vede preview-ul

### S1-3 · Formularul de Verificare (3 tab-uri)
- [ ] Creează `src/components/verify/VerifyForm/` cu 3 tab-uri: Screenshot | Text | URL
- [ ] Tab Screenshot: include `ScreenshotUpload`
- [ ] Tab Text: textarea cu counter caractere (min 10, max 2000), placeholder în română și engleză
- [ ] Tab URL: input URL cu validare format, preview metadata după introducere URL
- [ ] Buton "Verifică acum" — dezactivat până când inputul este valid
- [ ] Indicator limbă detectată (steag RO/UK)
- [ ] **Criteriu de acceptare:** Formularul validează corect și trimite date la API

### S1-4 · API Route — OCR (procesare screenshot)
- [ ] Creează `src/app/api/ocr/route.ts` (POST)
- [ ] Primește imagine base64, o trimite la Google Cloud Vision API
- [ ] Returnează text extras + confidence score
- [ ] Gestionare erori: imagine fără text, imagine necitibilă, API error
- [ ] Rate limiting: maxim 10 req/minut per IP
- [ ] **Criteriu de acceptare:** Screenshot de pe Facebook → text extras corect în > 90% cazuri

### S1-5 · Progress Tracker în timp real
- [ ] Creează `src/components/verify/ProgressTracker/` 
- [ ] Afișează pașii în timp real: "Extrag textul..." → "Caut în baze de date..." → "Analizez cu AI..." → "Generez raportul..."
- [ ] Animație subtilă per step (spinner sau progress bar)
- [ ] Timp estimat rămas afișat
- [ ] **Criteriu de acceptare:** Utilizatorul înțelege că procesarea este în curs și nu are anxietate de așteptare

### S1-6 · Navbar & Footer
- [ ] Creează `src/components/layout/Navbar/` cu: logo (TBD placeholder), link-uri navigare, buton Login/Register
- [ ] Creează `src/components/layout/Footer/` cu: link-uri, GitHub repository link, licență MIT
- [ ] Navbar sticky, responsive, cu hamburger menu pe mobile
- [ ] **Criteriu de acceptare:** Navigarea funcționează pe toate dimensiunile de ecran

---

## 🔍 Sprint 2 — Algoritmul de Verificare (Zilele 11-18)
*Scop: Verificarea funcționează end-to-end, produce un raport real*

### S2-1 · Orchestratorul de verificare
- [ ] Creează `src/lib/verification/orchestrator.ts`
- [ ] Funcția principală `verifyContent(text: string, language: 'ro' | 'en'): Promise<VerificationReport>`
- [ ] Rulează cele 4 straturi **în paralel** cu `Promise.allSettled()` (nu secvențial)
- [ ] Timeout per strat: 10 secunde (dacă nu răspunde, marchează ca unavailable)
- [ ] Gestionare gracefully: dacă 1-2 straturi eșuează, continuă cu restul
- [ ] Tipuri TypeScript complete în `src/types/verification.ts`
- [ ] **Criteriu de acceptare:** Orchestratorul finalizează în sub 20s chiar dacă un strat eșuează

### S2-2 · Stratul 1 — Google Fact Check Tools API
- [ ] Creează `src/lib/verification/layer1-factcheck.ts`
- [ ] Caută afirmația în Google Fact Check Tools API
- [ ] Parsează rezultatele: claimant, rating (Adevărat/Fals/Parțial), publisher, URL, data
- [ ] Suport pentru interogări în română și engleză
- [ ] Returnează array de fact-check-uri similare cu scor de relevanță
- [ ] Teste unitare în `tests/unit/layer1.test.ts`
- [ ] **Criteriu de acceptare:** Returnează cel puțin 1 rezultat pentru afirmații verificate anterior de Snopes/PolitiFact

### S2-3 · Stratul 2 — Știri convenționale
- [ ] Creează `src/lib/verification/layer2-news.ts`
- [ ] Caută afirmația în NewsAPI (știri internaționale) și Google Custom Search (știri românești: Digi24, ProTV, G4Media, HotNews, Mediafax)
- [ ] Prioritizează surse cu PageRank ridicat și politică editorială verificată
- [ ] Returnează articole similare cu: titlu, sursă, URL, dată, snippet
- [ ] Detectează frame-ul editorial (neutru / pozitiv / negativ față de afirmație)
- [ ] **Criteriu de acceptare:** Returnează articole relevante pentru știri majore din ultimele 6 luni

### S2-4 · Stratul 3 — Surse guvernamentale și oficiale
- [ ] Creează `src/lib/verification/layer3-official.ts`
- [ ] Caută în: site-uri `.gov.ro`, `.europa.eu`, OMS (who.int), ONU (un.org), instituții publice relevante
- [ ] Configurează Google Custom Search Engine restricționat la domenii oficiale
- [ ] Returnează documente/comunicat-uri oficiale cu: sursă, URL, data publicării, citat relevant
- [ ] **Criteriu de acceptare:** Găsește comunicatele MAI, MS, INS pentru afirmații despre statistici oficiale

### S2-5 · Stratul 4 — Social media
- [ ] Creează `src/lib/verification/layer4-social.ts`
- [ ] Caută declarații originale ale politicienilor, liderilor, ONG-urilor verificate
- [ ] Folosește Twitter/X API (conturi verificate) + Google Custom Search pe Facebook public
- [ ] Verifică dacă declarația atribuită unui oficial a fost făcută cu adevărat de acesta
- [ ] Returnează: link postare originală, autor, dată, context
- [ ] **Criteriu de acceptare:** Găsește declarația originală când o știre citează un politician

### S2-6 · Scoring și calcul verdict
- [ ] Creează `src/lib/verification/scoring.ts`
- [ ] Implementează formula de scoring ponderată (35% fact-check + 30% news + 25% official + 10% AI)
- [ ] Calculează scor 0-100 și mapează la verdict: Adevărat / Parțial / Neclar / Fals
- [ ] Calculează `confidence_level` (cât de sigur este algoritmul de verdict)
- [ ] Teste unitare exhaustive în `tests/unit/scoring.test.ts`
- [ ] **Criteriu de acceptare:** Scoringul produce aceleași verdic-uri ca Snopes pentru 80% din afirmațiile testate

### S2-7 · Generare raport cu Gemini AI
- [ ] Creează `src/lib/ai/gemini.ts` cu client Gemini 2.0 Flash
- [ ] Creează `src/lib/ai/prompts.ts` cu prompt-urile în română și engleză
- [ ] Prompt principal: primește textul + toate rezultatele din straturi → produce raport structurat
- [ ] Raportul include: rezumat executiv (2-3 fraze), analiza per strat, concluzie, surse citate
- [ ] Gemini are instrucțiuni explicite: **nu inventează surse**, **nu ia poziții politice**, **citat direct din surse**
- [ ] **Criteriu de acceptare:** Raportul este coerent, în limba corectă, fără halucinații

### S2-8 · API Route — Verificare principală
- [ ] Creează `src/app/api/verify/route.ts` (POST)
- [ ] Input: `{ text: string, language: 'ro'|'en', isPublic: boolean }`
- [ ] Verifică autentificarea și limitele de utilizare (free: 10/lună)
- [ ] Apelează orchestratorul
- [ ] Salvează rezultatul în Supabase
- [ ] Actualizează counter-ul utilizatorului
- [ ] Returnează raportul complet în JSON
- [ ] **Criteriu de acceptare:** End-to-end: text input → raport JSON valid în < 30 secunde

### S2-9 · Pagina de afișare raport
- [ ] Creează `src/app/reports/[id]/page.tsx` cu SSR (pentru SEO)
- [ ] Creează componentele: `VerdictHeader`, `SourcesList`, `LayerDetails`, `ShareButtons`
- [ ] Verdict vizual: verde (Adevărat), galben (Parțial), portocaliu (Neclar), roșu (Fals)
- [ ] Scorul afișat ca progress bar circular
- [ ] Lista surselor cu link-uri externe verificabile
- [ ] Buton "Raportează eroare" (trimite email cu raportul ID)
- [ ] Schema markup JSON-LD pentru fact-check (recunoscut de Google)
- [ ] **Criteriu de acceptare:** Raportul public este indexabil de Google, se afișează corect pe mobile

### S2-10 · Cache pentru verificări similare
- [ ] Creează `src/lib/verification/cache.ts`
- [ ] Hash SHA-256 al textului normalizat (lowercase, fără diacritice, trimmed)
- [ ] Verifică tabelul `cached_results` înainte de procesare
- [ ] Cache cu TTL de 7 zile pentru afirmații verificate
- [ ] Invalidare automată dacă raportul este contestat de utilizatori
- [ ] **Criteriu de acceptare:** A 2-a verificare a aceleiași afirmații returnează instant (< 500ms)

---

## 👤 Sprint 3 — Autentificare & Dashboard (Zilele 19-25)
*Scop: Utilizatorii se pot înregistra, au cont, sunt limitați pe tier-uri*

### S3-1 · Autentificare cu Supabase Auth
- [ ] Creează paginile `src/app/(auth)/login/page.tsx` și `register/page.tsx`
- [ ] Email + parolă: formular cu validare, mesaje eroare clare în română
- [ ] Google OAuth: buton "Continuă cu Google" cu redirect corect
- [ ] GitHub OAuth: buton "Continuă cu GitHub"
- [ ] Pagina de confirm email (după înregistrare)
- [ ] Pagina de reset parolă
- [ ] **Criteriu de acceptare:** Toate metodele de login funcționează și redirecționează corect

### S3-2 · Protecția rutelor și middleware
- [ ] Middleware Next.js care verifică sesiunea Supabase
- [ ] Rute `/dashboard/*` și `/settings` redirecționează la login dacă nu ești autentificat
- [ ] Ruta `/api/verify` funcționează și neautentificat (cu limite mai stricte)
- [ ] `src/hooks/useAuth.ts` pentru state-ul de auth în componente
- [ ] **Criteriu de acceptare:** Un utilizator nelogat nu poate accesa dashboard-ul

### S3-3 · Dashboard utilizator
- [ ] Creează `src/app/(dashboard)/dashboard/page.tsx`
- [ ] Secțiunea "Activitate": ultimele 30 de verificări (tabel cu: text scurt, verdict, dată, vizibilitate)
- [ ] Secțiunea "Utilizare": badge tier (Free/Pro/Business), verificări rămase din X total, progress bar
- [ ] Buton "Upgrade la Pro" cu redirect la pagina de prețuri
- [ ] Funcție ștergere verificare (cu confirmare)
- [ ] **Criteriu de acceptare:** Utilizatorul vede corect istoricul și câte verificări are rămase

### S3-4 · Sistem de limite per tier
- [ ] Creează `src/lib/rate-limit.ts` pentru limitele de verificare
- [ ] Free: 10 verificări/lună, reset la 1 ale lunii
- [ ] Pro: 200 verificări/lună
- [ ] Business: 2000 verificări/lună
- [ ] Când limita este atinsă → mesaj clar cu call-to-action upgrade
- [ ] Verificările anonime (fără cont): maxim 3 total (persistent prin localStorage)
- [ ] **Criteriu de acceptare:** Utilizatorul Free nu poate face verificarea #11 fără upgrade

### S3-5 · Pagina de prețuri
- [ ] Creează `src/app/pricing/page.tsx` cu 3 planuri vizuale (Free / Pro / Business)
- [ ] Toggle lunar/anual (cu discount 20% anual)
- [ ] Tabel comparativ funcționalități per tier
- [ ] FAQ: "Ce se întâmplă dacă depășesc limita?", "Pot anula oricând?", etc.
- [ ] Butoane CTA clare (Stripe integration — v2, momentan "Contactează-ne")
- [ ] **Criteriu de acceptare:** Pagina de prețuri este clară, nu confuză

---

## ✨ Sprint 4 — Polish, SEO, Open Source & Launch (Zilele 26-35)
*Scop: Aplicația este gata de lansare publică*

### S4-1 · Feed de rapoarte publice
- [ ] Creează `src/app/reports/page.tsx` cu lista rapoartelor publice
- [ ] Filtre: limbă (RO/EN), verdict (toate/adevărat/fals/parțial), dată
- [ ] Căutare în rapoartele existente
- [ ] Paginare (20 rapoarte per pagină)
- [ ] Card compact per raport cu: snippet afirmație, verdict badge, dată, share button
- [ ] **Criteriu de acceptare:** Feed-ul se încarcă în < 1.5s, paginarea funcționează

### S4-2 · Pagina de Transparență (Open Source)
- [ ] Creează `src/app/transparency/page.tsx`
- [ ] Secțiunea "Cum funcționează algoritmul": explicație vizuală a celor 4 straturi (diagrama flow)
- [ ] Secțiunea "API-uri utilizate": lista cu rolul fiecărui API și linkuri la documentație
- [ ] Secțiunea "Open Source": embed GitHub README, link la repository, badge-uri
- [ ] Secțiunea "Statistici": total verificări realizate, distribuția verdictelor (grafice simple)
- [ ] Secțiunea "Limitele AI": disclaimer transparent despre posibilele erori
- [ ] **Criteriu de acceptare:** Un utilizator fără cunoștințe tehnice înțelege cum funcționează

### S4-3 · SEO complet
- [ ] `metadata` Next.js pe fiecare pagină (title, description, OG tags, Twitter cards)
- [ ] `src/app/sitemap.ts` care include rapoartele publice
- [ ] `robots.txt` corect configurat
- [ ] Schema markup `ClaimReview` (JSON-LD) pe paginile de raport
- [ ] `og-image.png` generată dinamic per raport (Next.js Dynamic OG Images)
- [ ] **Criteriu de acceptare:** Lighthouse SEO score > 95, Google Search Console nu raportează erori

### S4-4 · Teste end-to-end
- [ ] Configurează Playwright pentru teste E2E
- [ ] Test: utilizator nelogat verifică o știre prin text → vede raportul
- [ ] Test: utilizator nelogat uploadează screenshot → text extras → verificare
- [ ] Test: utilizator se înregistrează cu email → confirmare → login → dashboard
- [ ] Test: utilizator Free atinge limita → vede mesaj upgrade
- [ ] **Criteriu de acceptare:** Toate testele E2E trec în CI

### S4-5 · Optimizare performanță
- [ ] Audit Lighthouse pe toate paginile principale
- [ ] Optimizare imagini (next/image, formatul AVIF/WebP)
- [ ] Lazy loading componente grele
- [ ] Preload fonturi critice
- [ ] **Criteriu de acceptare:** Lighthouse Performance > 85 pe mobile

### S4-6 · Documentație pentru contribuitori
- [ ] `README.md` complet: ce este aplicația, cum se instalează local, cum se contribuie
- [ ] `CONTRIBUTING.md`: cum deschizi un issue, cum faci un PR, cod de conduită
- [ ] `docs/CHANGELOG.md`: versiunea 1.0 documentată
- [ ] Comentarii JSDoc pe funcțiile publice din `src/lib/`
- [ ] **Criteriu de acceptare:** Un developer poate clona repo-ul și rula local în < 15 minute

### S4-7 · Deploy producție
- [ ] Conectare Vercel la GitHub repository
- [ ] Configurare environment variables în Vercel
- [ ] Custom domain (dacă există) sau subdomain Vercel
- [ ] Verificare finală: toate funcțiile lucrează pe producție
- [ ] Analytics de bază (Vercel Analytics — gratuit)
- [ ] **Criteriu de acceptare:** Aplicația este live, accesibilă din browser

---

## 📊 Sumar Estimare Timp

| Sprint | Durată | Efort agent | Efort tu |
|---|---|---|---|
| Sprint 0 — Setup | 3 zile | 90% | 10% (configurezi conturi) |
| Sprint 1 — UI & Input | 7 zile | 85% | 15% (feedback design) |
| Sprint 2 — Algoritm | 8 zile | 80% | 20% (testezi rezultate) |
| Sprint 3 — Auth & Users | 7 zile | 85% | 15% (feedback UX) |
| Sprint 4 — Polish & Launch | 10 zile | 75% | 25% (decizii finale) |
| **TOTAL** | **~35 zile** | | |

> Acestea sunt estimări optimiste cu agentul Antigravity care lucrează în mod
> autonom. Planifică 50-60 de zile pentru a include revizuiri și ajustări.
