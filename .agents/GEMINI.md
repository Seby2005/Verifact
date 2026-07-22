# GEMINI.md — Instrucțiuni pentru Agentul Antigravity
# Proiect: AI Fact-Checker Web App

> Citește acest document **complet** înainte de a scrie orice linie de cod.
> Citește și `docs/PRD.md`, `docs/ARCHITECTURE.md` și `docs/TASKS.md`.

---

## 1. Ce construim

O aplicație web **open source** de verificare a știrilor și conținutului de pe
rețelele sociale, folosind inteligență artificială. Utilizatorii pot uploada
screenshot-uri sau introduce text/URL și primesc un **raport detaliat** cu:
procentaj de veridicitate, surse verificabile, context și explicații.

**Valorile produsului:**
- Transparență maximă (cod open source, algoritm explicat public)
- Corectitudine (nu luăm poziții politice, verificăm fapte)
- Accesibilitate (gratuit pentru utilizatorul de rând)

---

## 2. Stack Tehnologic

```
Frontend:   Next.js 14 (App Router) + TypeScript strict + CSS Modules
Backend:    Next.js API Routes (serverless)
Database:   Supabase (PostgreSQL + Auth + Storage)
AI:         Gemini 2.0 Flash API
OCR:        Google Cloud Vision API
Search:     Google Fact Check Tools API + Custom Search API + NewsAPI
Hosting:    Vercel
CI/CD:      GitHub Actions
```

**NICIODATĂ nu folosi:**
- Tailwind CSS (folosim CSS Modules)
- `any` în TypeScript (TypeScript strict, fără excepții)
- `console.log` în producție (folosim `console.error` pentru erori reale)
- Variabile de mediu hardcodate în cod (întotdeauna din `process.env`)

---

## 3. Reguli de Cod

### 3.1 TypeScript
- `strict: true` în `tsconfig.json` — nicio excepție
- Toate funcțiile publice au tipuri explicite pe parametri și return value
- Niciun `any` sau `unknown` fără cast explicit și comentariu justificator
- Folosește `interface` pentru obiecte, `type` pentru unions/primitives

### 3.2 Structura fișierelor
- Fiecare componentă React în propriul folder: `ComponentName/index.tsx` + `ComponentName.module.css`
- Exporturi named, nu default (excepție: page.tsx și layout.tsx Next.js)
- Grupare importuri: 1) React/Next.js, 2) librării externe, 3) importuri interne (`@/`)

### 3.3 CSS
- CSS Modules pentru toate componentele (fișier `.module.css` lângă componentă)
- Variabile CSS definite în `globals.css` (niciodată valori hardcodate în componente)
- Mobile-first: scrie mai întâi stilurile pentru mobile, apoi `@media (min-width: ...)`
- Nicio librărie de styling externă (no Tailwind, no Styled Components, no Emotion)

### 3.4 Funcții asincrone
- Toate funcțiile care fac request-uri externe returnează `Promise` cu error handling
- Folosește `try/catch` în API routes, nu lasă promise-uri unhandled
- Timeout explicit pe toate apelurile externe (max 10 secunde)
- `Promise.allSettled()` când rulezi mai multe apeluri în paralel (nu `Promise.all`)

### 3.5 Securitate
- Nicio cheie API nu apare în client-side code (doar în API Routes / server components)
- Validare input la intrare în fiecare API route (lungime, tip, format)
- Rate limiting implementat pe toate endpoint-urile publice
- Sanitizare HTML dacă afișezi conținut extern

---

## 4. Workflow Git

### 4.1 Branch naming
```
feature/<task-id>-<descriere-scurta>   # ex: feature/s1-2-screenshot-upload
fix/<descriere>                         # ex: fix/ocr-timeout-error
docs/<descriere>                        # ex: docs/update-contributing
```

### 4.2 Commit messages (Conventional Commits)
```
feat: adaugă upload screenshot cu drag & drop
fix: corectează timeout OCR la imagini mari
docs: actualizează README cu instrucțiuni instalare
test: adaugă teste unitare pentru scoring algorithm
refactor: extrage logica de scoring în utilitate separată
chore: actualizează dependențe npm
```

### 4.3 Workflow per task
1. Verifică că ești pe branch-ul corect (`git checkout -b feature/...`)
2. Implementează task-ul **complet** — fără funcții placeholder sau TODO-uri
3. Scrie/actualizează testele unitare
4. Verifică că `npm run build` trece fără erori
5. Verifică că toate testele trec (`npm test`)
6. Face commit cu mesaj descriptiv
7. **Nu deschide PR singur** — anunță că task-ul este gata

---

## 5. Reguli Specifice pentru Algoritmul de Verificare

### 5.1 Integritate AI — Reguli stricte pentru Gemini
Când construiești prompt-urile pentru Gemini, includ **întotdeauna** aceste instrucțiuni:

```
- NU inventa surse sau citare. Citează DOAR din datele furnizate.
- NU lua poziții politice sau editoriale.
- NU face afirmații definitive. Folosește limbaj probabilistic ("sugerează", "indică", "este consistent cu").
- Dacă datele sunt insuficiente, spune explicit că nu se poate verifica.
- Raportul trebuie să fie în aceeași limbă ca inputul (română sau engleză).
```

### 5.2 Scoring transparent
- Formula de scoring trebuie documentată în cod cu comentarii clare
- Fiecare componentă a scorului trebuie logată și inclusă în raportul final
- Utilizatorul trebuie să poată vedea CUM s-a calculat scorul, nu doar rezultatul

### 5.3 Gestionare API-uri externe
- Dacă un API nu răspunde în 10 secunde → marchează stratul ca `unavailable`, continuă
- Dacă toate straturile sunt `unavailable` → returnează eroare cu mesaj clar
- Loghează toate apelurile externe (endpoint, latență, status code) pentru debug

---

## 6. Reguli UI/UX

### 6.1 Design system
- Culori: alb (#FFFFFF), gri deschis (#F8F9FA, #E9ECEF), albastru (#2563EB), verde (#16A34A), roșu (#DC2626), galben (#D97706)
- Font: `Inter` (Google Fonts) — regular 400, medium 500, semibold 600, bold 700
- Bordeuri: `border-radius: 8px` pentru carduri, `4px` pentru inputuri/butoane mici
- Umbra carduri: `box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`

### 6.2 Accesibilitate (obligatoriu)
- Toate imaginile au `alt` descriptiv
- Toate inputurile au `label` asociat sau `aria-label`
- Butoanele au `aria-label` dacă conțin doar iconiță
- Focus visible pe toate elementele interactive
- Contrast minim WCAG AA (4.5:1 pentru text normal)

### 6.3 Loading states
- Fiecare acțiune asincronă are loading state vizibil
- Butoanele se dezactivează în timpul submit-ului (previne double-click)
- Error states cu mesaje clare în română (nu "Error 500", ci "A apărut o eroare, te rugăm să reîncerci")

---

## 7. Reguli pentru Teste

- Fiecare funcție din `src/lib/` are teste unitare în `tests/unit/`
- Testele descriu comportamentul, nu implementarea (`it('should return false verdict when...')`)
- Mock-uiți apelurile externe (Google APIs, Gemini) în teste unitare
- Testele E2E (Playwright) testează fluxurile complete ale utilizatorului
- Coverage minim: 70% pentru fișierele din `src/lib/verification/`

---

## 8. Checklist înainte de a marca un task ca Done

- [ ] Funcționalitatea descrisă în task este **complet** implementată
- [ ] Niciun `TODO`, `FIXME`, `console.log` sau placeholder rămas
- [ ] Tipuri TypeScript corecte (fără `any`)
- [ ] Teste unitare scrise și trec
- [ ] `npm run build` trece fără erori sau warnings
- [ ] Stilurile sunt responsive (mobile + tablet + desktop)
- [ ] Error states implementate și vizibile
- [ ] Loading states implementate și vizibile
- [ ] Accesibilitate: labels, alt text, focus states

---

## 9. Referințe

- PRD complet: `docs/PRD.md`
- Arhitectura tehnică: `docs/ARCHITECTURE.md`
- Backlog tasks: `docs/TASKS.md`
- Documentație Next.js: https://nextjs.org/docs
- Documentație Supabase: https://supabase.com/docs
- Documentație Gemini API: https://ai.google.dev/gemini-api/docs
- Google Fact Check Tools API: https://developers.google.com/fact-check/tools/api
