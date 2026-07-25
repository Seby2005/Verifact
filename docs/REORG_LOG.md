# Jurnal de reorganizare a repository-ului — 26 iulie 2026

Acest document e primul lucru de citit după reorganizarea din 26 iulie 2026,
în care istoricul git — împrăștiat pe 23 de branch-uri locale, unele
nepublicate, plus un `git stash` orfan — a fost consolidat în exact două
branch-uri permanente: `main` (producție) și `dev` (integrare).

**Regula respectată:** nimic nu a fost șters sau suprascris fără backup
verificat în prealabil. Toate operațiile ireversibile (force-push, resetarea
lui `main`, ștergerea branch-urilor) au fost confirmate explicit înainte de
execuție.

---

## 1. Tag-uri de backup (permanente — nu se șterg niciodată)

Toate cele 26 de tag-uri de mai jos sunt pe `origin` și indică spre commit-ul
exact în care se afla fiecare branch/stash înainte de reorganizare. Dacă ai
nevoie vreodată de ceva din vechea stare, e aici:

```
backup/chore/repo-hygiene-2026-07-26
backup/dev-2026-07-26                          (Linia A — rebrand-ul, 10 commit-uri peste origin/dev vechi)
backup/docs/content-rewrite-2026-07-26
backup/docs/legal-analysis-terms-privacy-2026-07-26
backup/feature/s0-1-nextjs-init-2026-07-26
backup/feature/s0-2-github-structure-2026-07-26
backup/feature/s0-3-ci-cd-2026-07-26
backup/feature/s0-4-supabase-setup-2026-07-26
backup/feature/s0-5-design-system-2026-07-26
backup/feature/s1-1-hero-section-2026-07-26
backup/feature/s1-2-screenshot-upload-2026-07-26
backup/feature/s1-3-verify-form-2026-07-26
backup/feature/s1-4-ocr-api-2026-07-26
backup/feature/s1-5-progress-tracker-2026-07-26
backup/feature/s1-6-navbar-footer-2026-07-26
backup/feature/s1-integration-2026-07-26
backup/feature/s3-1-authentication-2026-07-26
backup/feature/s3-2-route-protection-2026-07-26
backup/feature/s3-3-dashboard-2026-07-26
backup/feature/s3-4-usage-limits-2026-07-26
backup/feature/s3-5-pricing-page-2026-07-26     (era publicat pe origin)
backup/fix/db-signup-2026-07-26
backup/fix/hydration-verifyform-2026-07-26
backup/main-2026-07-26                          (vechiul main — un singur commit gol)
backup/origin-dev-2026-07-26                    (vechiul origin/dev — punctul de bifurcare comun)
backup/stash-epitaxy-pre-switch-2026-07-26-tag  (vezi secțiunea 3)
```

Plus branch-ul `snapshot/worktree-2026-07-26` (commit `747a47f`, doar în
istoric acum, tag-uit prin `backup/dev-2026-07-26` fiindcă a plecat din
`dev`) — conținea starea brută a working tree-ului (inclusiv `auth.tmp.js`,
`auth2.tmp.js`, `.claude/settings.local.json`) dinainte de orice curățenie.

**Cum recuperezi ceva:** `git checkout backup/<nume>-2026-07-26` sau
`git show backup/<nume>-2026-07-26:cale/fisier`.

---

## 2. Topologia reală descoperită (diferă de presupunerea inițială)

Nu erau 15+ branch-uri divergente independente. Era **un singur lanț
liniar**:

```
origin/dev (c014411, "Sprint 0 showcase")
  └─ feature/s1-6-navbar-footer
       └─ feature/s1-1-hero-section → s1-2 → s1-3 → s1-4 → s1-5 → s1-integration
            └─ feature/s3-1-authentication → s3-2 → s3-3 → s3-4 → s3-5-pricing-page
                 └─ chore/repo-hygiene (include auditul de securitate)
                      ├─ docs/content-rewrite
                      ├─ docs/legal-analysis-terms-privacy
                      ├─ fix/db-signup            (singurul commit propriu: un doc, nu codul CSP)
                      └─ fix/hydration-verifyform (singurul commit propriu: fix de pipeline, nu hidratare)
```

`feature/s0-1` până la `feature/s0-5` erau deja complet integrate în `dev`
local (ancestor comun). Restul lanțului (Sprint 1 UI, Sprint 3 auth/dashboard/
tier-limits) **nu** era în `dev` — dar nici nu mai era nevoie, pentru că `dev`
avea deja propria implementare independentă, mai evoluată, din rebrand.

---

## 3. Ce s-a integrat din fiecare linie, și ce s-a omis — și de ce

| Piesă | Sursă | Decizie | Motiv |
|---|---|---|---|
| Node 20 → 22 în CI/deploy | verificare directă | **integrat** | `@supabase/supabase-js` ≥2.110.8 declară `engines: {node: ">=22.0.0"}` în propriul `package.json` — era încă necesar. |
| Termeni și condiții + Politica de confidențialitate | `docs/legal-analysis-terms-privacy` | **integrat, rescris** | Draft-urile presupuneau OAuth, tabelă `disputes`, API de export GDPR — niciuna nu există în cod. Rescrise să reflecte aplicația reală + deciziile deja luate (persoană fizică, doar Vercel Analytics, ștergere la cerere, fără mecanism formal de contestare). |
| README + ARCHITECTURE.md | `docs/content-rewrite` (doar README) | **rescrise complet, în română** | Draft-ul din `docs/content-rewrite` era în engleză și descria funcționalități inexistente (export GDPR, Playwright E2E, rute `(dashboard)`). `ARCHITECTURE.md` era complet desincronizat (Redis v2, OAuth, Twitter ca sursă principală) — actualizat să descrie exact ce rulează. |
| Migrare căutare la Tavily (layer 2/4) | `chore/repo-hygiene` | **deja integrat în `dev`** | Confirmat în cod înainte să încep — nimic de făcut, doar am documentat `TAVILY_API_KEY` lipsă din `.env.example`/CI. |
| Fix CSP care debloca signup-ul | `fix/db-signup` (de fapt din `chore/repo-hygiene`) | **omis, N/A** | `dev` nu configurează deloc CSP — arhitectură diferită, bug-ul nu există aici. |
| "Fix de hidratare" pe VerifyForm | `fix/hydration-verifyform` | **omis, deja superscris** | Singurul commit propriu al branch-ului e de fapt reparația pipeline-ului de verificare (contract API, persistare, timeout AI) — exact ce descrie deja commit-ul `79848c1` de pe `dev` ("port the real verification pipeline onto dev and fix it"), independent și mai evoluat. |
| Dashboard utilizator (Sprint 3) | `feature/s3-3-dashboard` | **omis, înlocuit intenționat** | `dev` are `/cont`, o pagină unificată de cont+autentificare, nu un dashboard separat. Verificat funcțional, nu doar după nume de fișiere. |
| Schema DB extinsă (`subscriptions`, `disputes`, `admin_actions`, `api_call_logs`) + fix recursie RLS | `chore/repo-hygiene` (10 migrări incrementale) | **omis** | `dev` are un schema mai simplu (`001_initial_schema.sql`, 3 tabele) ale cărui politici RLS nu sunt auto-referențiale — bug-ul de recursie nu se aplică. Tabela `disputes` ar contrazice decizia deja luată "fără mecanism activ de contestare — doar disclaimer". Dacă produsul crește spre facturare/abonamente reale sau moderare, schema din `backup/chore/repo-hygiene-2026-07-26` e punctul de plecare corect. |
| Audit de securitate (`4ffb52e`) | `chore/repo-hygiene` | **nimic de reparat** | Auditul (46 de commit-uri + bundle-ul compilat) nu a găsit niciun secret real expus. Confirmat independent la Faza 0. |

### Găsit pe parcurs, nu era în scope-ul inițial
- **Un `git stash` orfan** cu muncă necommisă pe `docs/legal-analysis-terms-privacy` (pagină de transparență, `gemini.ts`, `db-operations.ts`, ruta de rapoarte). Salvat permanent prin tag (`backup/stash-epitaxy-pre-switch-2026-07-26-tag`), dar folosea rute în engleză (`src/app/transparency/`) dinainte de rebrand-ul românesc — nu se poate aplica mecanic peste `dev`, ar necesita reconciliere manuală dacă se dorește vreodată conținutul lui.
- **4 worktree-uri git orfane** (`verifact-agent-a/b/c/d`), cu directoarele deja șterse de pe disc — curățate cu `git worktree prune` (operație administrativă, nu a atins niciun commit).
- **Vercel Analytics** era menționat ca decizie deja luată dar nu era instalat în cod — adăugat (`@vercel/analytics`, fără cookie-uri).

---

## 4. 🚩 Alertă — găsit, nu rezolvat aici

**Ștergerea de cont e promisă în interfață** (`/cont`, `/open-source`: "Poți
pleca oricând. Ștergerea contului îți șterge și rapoartele, definitiv.") dar
**nu există niciun endpoint sau buton funcțional** care s-o execute — nu
exista înainte de reorganizare, nu am construit unul acum (e muncă de
funcționalitate nouă, în afara scope-ului acestui task). Politica de
confidențialitate descrie dreptul ca valabil și exercitabil prin cerere pe
email, ceea ce e adevărat legal (GDPR), dar recomand implementarea unui
self-service curând, ca promisiunea din UI să devină literalmente adevărată.

Schema bazei de date deja suportă anonimizarea corectă la ștergere
(`verifications.user_id` e `ON DELETE SET NULL`), deci partea grea de design
e deja rezolvată — lipsește doar ruta API + confirmarea UI.

## 5. Alte observații (nu blocante)

- Suita de teste a pipeline-ului de verificare pe `dev` (10 teste, 2 suite)
  e mult mai subțire decât cea construită pe linia `fix/hydration-verifyform`
  (160 de teste — contract, reziliență, detecție de postură). Cod diferit
  (pipeline-uri independente), deci testele nu s-au putut porta mecanic;
  rămân ca referință în `backup/fix/hydration-verifyform-2026-07-26` dacă
  cineva vrea să extindă acoperirea pe pipeline-ul actual.
- `.github/workflows/deploy.yml` conține doar pași placeholder — deployul
  real de producție/preview e legat prin integrarea GitHub a Vercel direct
  pe acest repo, nu prin acel workflow. N-am putut verifica din linia de
  comandă că integrarea Vercel e activă pe noul `main`; verifică în
  dashboard-ul Vercel după acest push.
- Remote-ul `origin` afișează un mesaj că repo-ul „s-a mutat” la
  `https://github.com/Seby2005/Verifact` (de la vechiul `fact-checker-ai`).
  Push-urile au funcționat prin redirect, dar n-am schimbat configurația
  git locală (`git remote set-url`) — dacă vrei, rulează tu:
  `git remote set-url origin https://github.com/Seby2005/Verifact.git`.

---

## 6. Rezultat final

- **Exact 2 branch-uri pe `origin`: `main` și `dev`.** Identice între ele la
  momentul acestui commit (fast-forward simplu pe amândouă — nu a fost
  nevoie de niciun force-push, pentru că `origin/main` și `origin/dev` erau
  deja ancestor ale rezultatului consolidat).
- 26 de tag-uri de backup pe `origin`, permanente.
- **`npm run type-check`, `npm run lint`, `npm test` și `npm run build` trec
  toate**, curat, pe `dev` și pe `main` (identice).
