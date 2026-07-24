# Audit Raport: Design System & UI Components — AI Fact-Checker

**Data:** 2026-07-24  
**Autor:** Senior Frontend Engineer (Gemini Agent)  
**Status Audit:** Finalizat  

---

## 1. Inventar & Status Componente UI (`src/components/ui/`)

| Componentă UI | Status | Detalii & Constatări |
|---|---|---|
| **Button** | **Trebuie rescrisă** | Lipsesc prop-urile pentru iconițe (`lucide-react`), handling-ul pentru `tooltipWhenDisabled`, token-urile de spacing CSS, iar starea de loading ascunde textul în loc să mențină vizibilitatea/spațierea. Lipsesc outline-urile `:focus-visible` dedicate în CSS module. |
| **Input și Textarea** | **Trebuie rescrisă** | Prop-ul `label` este opțional (încalcă cerința de accesibilitate strictă §4.2). Lipsesc componenta `Textarea`, contorul de caractere, suportul pentru iconițe în `Input` (căutare/URL) și integrarea i18n. |
| **Card** | **Trebuie rescrisă** | Variantele actuale (`default`, `bordered`, `flat`) nu corespund specificației PRD (§4.3: `default`, `flat`, `interactive`). Padding-ul nu este legat direct de scara `--space-*`. |
| **Badge** | **Trebuie rescrisă** | Nu conține maparea centralizată a verdictelor (`src/lib/constants/verdicts.ts`), nu include automat iconițele și textul per variantă, iar variantele actuale conțin tipuri generice (`primary`, `secondary`) în loc de `neutral` și cele 4 variante de verdict (`true`, `partial`, `unclear`, `false`). |
| **Modal** | **Trebuie rescrisă** | Nu folosește `React.createPortal` în `document.body` (cauzează conflicte de z-index), nu implementează focus trap complet și nu restaurează focus-ul pe elementul declanșator la închidere. |
| **Toast / Notification** | **Lipsește complet** | Lipsesc `ToastProvider`, hook-ul `useToast()`, stiva de notificări (top-right) cu auto-dismiss 5s și persistență pe erori. |
| **Skeleton** | **Lipsește complet** | Nu există placeholder-ul animat shimmer pentru text, card și circle. |
| **EmptyState** | **Lipsește complet** | Nu există componenta de fallback pentru căutări goale sau dashboard fără date. |
| **Tabs** | **Lipsește complet** | Nu există componenta de navigare prin tab-uri cu săgeți tastatură și indicator animat sub tab-ul activ. |
| **ProgressBar** | **Lipsește complet** | Lipsesc variantele liniară și circulară (cu interpolare de culoare 0-100%: roșu/portocaliu/galben/verde). |
| **Dropdown / Select** | **Lipsește complet** | Nu există selectorul accesibil din tastatură cu `aria-expanded` și `aria-activedescendant`. |
| **Tooltip** | **Lipsește complet** | Nu există tooltip cu delay de 300ms, hover/focus trigger și detecție de margine ecrane. |
| **Avatar** | **Lipsește complet** | Nu există avatarul cu inițialele utilizatorului pe fundal determinist. |
| **UpgradePrompt** | **Non-standard** | Componentă specifică de domain logic plasată greșit în UI primitives; trebuie curățată/refactorizată. |

---

## 2. Probleme Tehnice și Inconsistențe Identificate

1. **Variabile CSS Incomplete și Inconsistente (`src/app/globals.css`):**
   - Variabilele CSS actuale folosesc denumiri neconforme (`--color-primary`, `--border-color`) în loc de token-urile semantice stricte din PRD (§3: `--color-blue-500`, `--color-bg-primary`, `--space-1` ... `--space-20`, etc.).
   - Scara de spacing CSS (`--space-1` la `--space-20`) lipsea complet.
   - Scara de `z-index` semantice (`--z-navbar: 100`, `--z-dropdown: 200`, `--z-modal-backdrop: 300`, `--z-modal: 310`, `--z-toast: 400`) lipsea.

2. **Absența Suportului i18n Real:**
   - Proiectul nu avea configurat `next-intl` și fișierele de traducere `ro.json` / `en.json`.
   - String-uri UI erau împrăștiate și hardcodate în limba română în componente fără structură pe namespace-uri logice (`common.*`, `verify.*`, `report.*`, `auth.*`, `dashboard.*`, `pricing.*`, `errors.*`).

3. **Absența Assets-urilor de Branding Centrate:**
   - Fișierul central `src/config/branding.ts` cu `APP_NAME` nu exista.
   - Fișierele vizuale `public/logo.svg`, `public/logo-mono.svg`, `public/favicon.ico` și `public/og-image.png` lipseau complet.

4. **Lacune de Accesibilitate (WCAG AA):**
   - Formularul `Input` nu impunea `label` obligatoriu la nivel de TypeScript `interface`.
   - Modalul actual nu captează focusul (Focus Trap) și nu îl returnează pe elementul activ inițial.
   - Lipseau indicații vizuale `:focus-visible` uniforme bazate pe `--shadow-focus`.

5. **Limbaje și Teste Unitare:**
   - Nu existau teste unitare specifice în `tests/unit/components/` pentru variantele, stările disabled, loading și accesibilitatea (ARIA) componentelor UI.
   - Pachetul `lucide-react`, `next-intl` și biblioteca de testare React nu erau configurate complet în `package.json`.

---

## 3. Decizii de Arhitectură și Design System (Motivate)

1. **Branding Placeholder (`APP_NAME`):**
   - Am creat `src/config/branding.ts` unde exportăm `APP_NAME = "FactCheck.ro"` cu comentariul clar `/* PLACEHOLDER - Unic punct de configurare pentru numele aplicației */`.
   - Nicio componentă sau fișier metadata nu va hardcoda numele.

2. **Dark Mode (Decizie v1):**
   - Implementăm Dark Mode nativ în CSS prin `[data-theme="dark"]` și `color-scheme: dark`. Toate variabilele din `:root` au corespondent cu contrast WCAG AA garantat în modul dark. Starea este păstrată printr-un cookie/state și comutator simplu în Navbar/Footer.

3. **Sistem i18n (`next-intl`):**
   - Alegem `next-intl` pentru integrarea curată cu Next.js App Router, i18n Server & Client Components și suportul pentru fișiere de dicționar JSON pe namespace-uri (`ro.json` și `en.json`).

4. **Sursă Unică de Adevăr pentru Verdicte (`src/lib/constants/verdicts.ts`):**
   - Centralizăm maparea verdictelor (`true`, `partial`, `unclear`, `false`) în `verdicts.ts`. Fiecare verdict dictează culoarea token, iconița Lucide și string-urile traduse i18n, prevenind discrepanțele între paginile de raport, cardurile din feed și badge-uri.

5. **Catalog de Componente Live (`src/app/(dev)/components/page.tsx`):**
   - Pagină de dev/showcase dedicată pentru inspectarea tuturor variantelor și stărilor fiecărui component UI din scara Design System-ului.

---

## 4. Plan de Acțiune pentru Implementare

1. ✅ **Setup Branding & Assets:** `src/config/branding.ts`, `logo.svg`, `logo-mono.svg`, `favicon.ico`, `og-image.png`.
2. ✅ **Tokens & Rescriere `globals.css`:** Sistem complet de culori, tipografie, spacing, radii, umbre, tranziții, z-index și Dark Mode.
3. ✅ **Centralizare Verdicte:** `src/lib/constants/verdicts.ts`.
4. ✅ **Instalare Dependențe UI & i18n:** `lucide-react`, `next-intl`, `@testing-library/react`, `@testing-library/jest-dom`.
5. ✅ **Implementare Pachet Componente UI (13 primitive):** Button, Input & Textarea, Card, Badge, Modal, Toast, Skeleton, EmptyState, Tabs, ProgressBar, Dropdown/Select, Tooltip, Avatar.
6. ✅ **Catalog de Componente Showcase (`/components`).**
7. ✅ **Teste Unitare RTL pe Componente (`tests/unit/components/`).**
8. ✅ **Verificare Accessibilitate & Build Next.js.**
